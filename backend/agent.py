# ============================================================
# Supervisor Agent — Ported from Supervisor_Agent(1).ipynb
# Fixed: proper memory persistence + aggregator always emits
# ============================================================
import os
import re
import requests
from typing import Literal, Annotated, Optional
from datetime import datetime

from typing_extensions import TypedDict
from pydantic import BaseModel

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools.tavily_search import TavilySearchResults

from model import predict_wheat_disease

# ── LLM ─────────────────────────────────────────────────────
llm = None
tavily_tool = None

HEALTHY_CLASS = "Healthy Wheat"
DEFAULT_COORDS = "Latitude 36.8065, Longitude 10.1815 (Tunis, Tunisia)"


def init_agent():
    """Initialize the LLM and tools. Must be called after env vars are set."""
    global llm, tavily_tool

    llm = ChatGoogleGenerativeAI(
        model="gemini-3-flash-preview",
        temperature=0,
    )

    tavily_key = os.environ.get("TAVILY_API_KEY", "")
    if tavily_key:
        tavily_tool = TavilySearchResults(max_results=3)
    else:
        tavily_tool = None
        print("[Agent] TAVILY_API_KEY not set — web search disabled")


# ── Tools ────────────────────────────────────────────────────
@tool
def analyze_wheat_image(image_path: str) -> str:
    """
    Analyzes an image of a wheat crop to detect diseases or verify its health.
    Always use this tool when a user asks about the health, disease, or status of a wheat leaf image.

    Args:
        image_path: The absolute file path to the wheat image.

    Returns:
        A report of the predicted disease and the confidence score.
    """
    try:
        predicted_class, confidence = predict_wheat_disease(image_path)
        if confidence > 80:
            return f"Analysis complete. I am highly confident ({confidence:.1f}%) that this plant shows signs of {predicted_class}."
        else:
            return f"Analysis complete. I predict this is {predicted_class}, but my confidence is somewhat low ({confidence:.1f}%). Recommend consulting an agronomist."
    except Exception as e:
        return f"Error analyzing the image: {str(e)}"


@tool
def get_agronomic_weather(latitude: float, longitude: float) -> dict:
    """
    Fetches real-time and 24-hour forecast environmental data for agricultural analysis.
    Always use this tool first to check the weather before recommending crop treatments.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
        "hourly": "relative_humidity_2m,soil_moisture_0_to_7cm",
        "timezone": "auto",
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        current = data.get("current", {})
        hourly = data.get("hourly", {})

        hum_list = [h for h in hourly.get("relative_humidity_2m", [])[:24] if h is not None]
        avg_hum = round(sum(hum_list) / len(hum_list), 1) if hum_list else None

        soil_list = [s for s in hourly.get("soil_moisture_0_to_7cm", [])[:24] if s is not None]
        avg_soil = round(sum(soil_list) / len(soil_list), 3) if soil_list else "Data Unavailable"

        return {
            "status": "success",
            "temperature_c": current.get("temperature_2m"),
            "rain_mm": current.get("precipitation"),
            "wind_kmh": current.get("wind_speed_10m"),
            "humidity_24h_avg_percent": avg_hum,
            "soil_moisture_24h_avg": avg_soil,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ── Reducer for string fields ────────────────────────────────
# By default, LangGraph replaces state fields. We need a reducer
# that keeps the existing value when a node returns nothing for it.
def keep_latest(existing: str, new: str) -> str:
    """Keep the new value if it's truthy, otherwise retain existing."""
    return new if new else existing


# ── State ────────────────────────────────────────────────────
class AgentState(TypedDict):
    messages:           Annotated[list, add_messages]
    diagnostic_report:  Annotated[str, keep_latest]
    treatment_report:   Annotated[str, keep_latest]
    next_step:          Annotated[str, keep_latest]
    detected_disease:   Annotated[str, keep_latest]
    image_path:         Annotated[str, keep_latest]


# ── Helpers ──────────────────────────────────────────────────
def extract_content(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in content
        )
    return str(content)


def clean_response_text(text: str) -> str:
    """Normalize LLM output for the chat UI."""
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    return text.strip()


# ── Router ───────────────────────────────────────────────────
class RouterDecision(BaseModel):
    next: Literal["diagnostic", "treatment", "both", "direct"]
    reasoning: str


SUPERVISOR_PROMPT = """You are a supervisor orchestrating a wheat crop AI assistant.
Based on the user's message, decide how to route the request:

- "diagnostic" → user provides an actual image path and wants it analyzed.
- "treatment"  → user already has a diagnosis and asks for treatment or cure.
- "both"       → user provides an image AND asks for treatment too.
- "direct"     → EVERYTHING ELSE: greetings, follow-up questions about a previous report, general questions, asking about capabilities, or any message without an actual image file path.

CRITICAL: Only route to "diagnostic" or "both" if the message contains a real file path (e.g. /uploads/image.jpg). Questions ABOUT a previous report or diagnosis are always "direct" — the agent has conversation memory.

Reply ONLY with valid JSON: {{"next": "...", "reasoning": "..."}}"""


# ── Nodes ────────────────────────────────────────────────────
def supervisor_node(state: AgentState) -> dict:
    """Route the user's message to the appropriate agent."""
    last_user_msg = state["messages"][-1].content

    # Also feed conversation history summary to the router for context
    history_summary = ""
    prev_disease = state.get("detected_disease", "")
    prev_diag = state.get("diagnostic_report", "")
    if prev_disease:
        history_summary += f"\n[Context: Previous diagnosis was '{prev_disease}'.]"
    if prev_diag:
        history_summary += f"\n[Context: A diagnostic report exists in this session.]"

    router_llm = llm.with_structured_output(RouterDecision)
    decision = router_llm.invoke([
        SystemMessage(content=SUPERVISOR_PROMPT),
        HumanMessage(content=extract_content(last_user_msg) + history_summary),
    ])
    print(f"\n🧭 Supervisor → [{decision.next}] | {decision.reasoning}\n")
    return {"next_step": decision.next}


# ── Diagnostic prompts ───────────────────────────────────────
DIAGNOSTIC_SYSTEM = SystemMessage(
    content="""You are an expert agricultural AI Diagnostic Agent specializing in wheat health.
Your goal is to provide a comprehensive diagnostic report based on an uploaded image.

Workflow:
1. ALWAYS use the `analyze_wheat_image` tool first to get the predicted disease and confidence score.
2. If the prediction is a disease (not healthy), use the `tavily_search_results_json` tool to search for factual agricultural context.

Formatting:
- 🔬 Initial Diagnosis & Confidence
- 👁️ Visual Confirmation
- 🌧️ Environmental Causes
- ⚠️ Risk Assessment

CRITICAL RULE: DO NOT provide any treatment, chemical, or mitigation advice."""
)


def run_diagnostic_node(state: AgentState) -> dict:
    print("🔬 Running Diagnostic Agent...")

    image_path = state.get("image_path", "")
    if not image_path:
        # Try to find image path in messages
        all_text = " ".join(
            extract_content(m.content)
            for m in state["messages"]
            if hasattr(m, "content")
        )
        match = re.search(r"/[\w./\-]+\.(?:jpg|jpeg|png)", all_text, re.IGNORECASE)
        if match:
            image_path = match.group(0)

    if not image_path or not os.path.isfile(image_path):
        msg = "Please provide an image so I can analyze it."
        return {
            "detected_disease": "",
            "messages": [AIMessage(content=msg)],
        }

    # Build tools list
    tools = [analyze_wheat_image]
    if tavily_tool:
        tools.append(tavily_tool)

    diag_agent = create_react_agent(llm, tools)
    user_msg = f"Analyze this wheat image: {image_path}"
    inputs = {"messages": [DIAGNOSTIC_SYSTEM, HumanMessage(content=user_msg)]}
    result = diag_agent.invoke(inputs)
    report = extract_content(result["messages"][-1].content)

    # Get raw disease name
    disease = "Unknown"
    try:
        predicted_class, _ = predict_wheat_disease(image_path)
        disease = predicted_class
    except Exception:
        pass

    print(f"🔬 Diagnostic complete: {disease}")
    return {
        "diagnostic_report": report,
        "detected_disease": disease,
        "messages": [AIMessage(content=f"[Diagnostic Report]\n{report}")],
    }


# ── Treatment prompts ────────────────────────────────────────
TREATMENT_SYSTEM_CONTENT = """You are an expert Agricultural Treatment Agent.
Your goal is to provide a safe, actionable treatment plan based on a provided Diagnostic Report and the current local weather.

Workflow:
1. Extract the disease name from the user's Diagnostic Report.
2. ALWAYS use the `get_agronomic_weather` tool first to check current conditions for the provided coordinates.
3. Use the `tavily_search_results_json` tool to search for specific agricultural treatments.
4. Synthesize the treatment plan, adapting it to the weather.

Format:
🚨 QUICK ACTION SUMMARY (2-3 sentences)
📄 FULL TREATMENT REPORT
- 🌡️ Field Conditions & Treatment Viability
- 🛡️ Immediate Interventions
- 🌱 Cultural & Long-Term Management

Keep advice professional and focused on crop yield protection."""


def run_treatment_node(state: AgentState) -> dict:
    print("💊 Running Treatment Agent...")

    context = ""
    if state.get("diagnostic_report"):
        context += f"Previous Diagnostic Report:\n{state['diagnostic_report']}\n\n"

    last_human = next(
        (extract_content(m.content) for m in reversed(state["messages"])
         if isinstance(m, HumanMessage)),
        "",
    )
    user_query = context + last_human

    enhanced_msg = SystemMessage(content=(
        TREATMENT_SYSTEM_CONTENT +
        f"\n\nIMPORTANT: If the user did not provide farm coordinates, "
        f"use these default coordinates: {DEFAULT_COORDS}. "
        "You MUST always call the `get_agronomic_weather` tool before recommending any treatment."
    ))

    tools = [get_agronomic_weather]
    if tavily_tool:
        tools.append(tavily_tool)

    treat_agent = create_react_agent(llm, tools)
    inputs = {"messages": [enhanced_msg, HumanMessage(content=user_query)]}
    result = treat_agent.invoke(inputs)
    report = extract_content(result["messages"][-1].content)

    print("💊 Treatment complete")
    return {
        "treatment_report": report,
        "messages": [AIMessage(content=f"[Treatment Report]\n{report}")],
    }


def direct_answer_node(state: AgentState) -> dict:
    print("💬 Answering directly...")

    # Build context about what the agent knows from this session
    context_parts = []
    prev_disease = state.get("detected_disease", "")
    prev_diag = state.get("diagnostic_report", "")
    prev_treat = state.get("treatment_report", "")

    if prev_disease:
        context_parts.append(f"Previously diagnosed disease: {prev_disease}")
    if prev_diag:
        context_parts.append(f"Diagnostic report summary available in memory.")
    if prev_treat:
        context_parts.append(f"Treatment report summary available in memory.")

    session_context = ""
    if context_parts:
        session_context = "\n\nSESSION CONTEXT (from earlier in this conversation):\n" + "\n".join(context_parts)
        session_context += f"\n\nDiagnostic Report:\n{prev_diag[:500]}" if prev_diag else ""
        session_context += f"\n\nTreatment Report:\n{prev_treat[:500]}" if prev_treat else ""

    system_content = f"""You are a specialized AI assistant for wheat crop health. You can:
    - Diagnose 14 wheat conditions from leaf images (diseases, pests, or healthy)
    - Provide weather-aware treatment plans based on the farmer's location
    - Generate full diagnostic + treatment reports

    Behavior rules:
    1. Be CONCISE. On greetings, give a short warm welcome (1-2 sentences). Do NOT list all 14 diseases unless asked.
    2. When the user says something vague, just ask what they'd like to know.
    3. Mention your wheat-only scope ONCE per session at most.
    4. Match the user's energy — short questions get short answers.
    5. If the user asks about a previous report, answer based on the session context and conversation history — be SPECIFIC, reference the actual disease name and findings, don't be generic.
    {session_context}"""

    response = llm.invoke([
        SystemMessage(content=system_content),
        *state["messages"],
    ])
    print("💬 Direct answer complete")
    return {"messages": [response]}


def aggregator_node(state: AgentState) -> dict:
    """
    Final node — merges reports into a unified output when both exist.
    ALWAYS returns at least the existing state so the last message
    in state['messages'] is the final answer for the user.
    """
    next_step = state.get("next_step", "")

    # For direct answers, the message is already appended by direct_answer_node
    if next_step == "direct":
        print("📋 Aggregator: passing through direct answer")
        return {}

    diag = state.get("diagnostic_report", "")
    treat = state.get("treatment_report", "")

    if diag and treat:
        today = datetime.now().strftime("%B %d, %Y")
        summary = llm.invoke([
            SystemMessage(content=(
                f"You are an agricultural AI report generator. Today's date is {today}. "
                "Combine the diagnostic and treatment reports into one clean, structured final report. "
                "Use 'AI Agronomic Report' as the header. Keep the report professional but not bloated. "
                "DO NOT add 'wheat-only' disclaimers."
            )),
            HumanMessage(content=f"Diagnostic Report:\n{diag}\n\nTreatment Report:\n{treat}"),
        ])
        final_text = f"📋 AI AGRONOMIC REPORT\n\n{clean_response_text(extract_content(summary.content))}"
        print("📋 Aggregator: merged diagnostic + treatment into final report")
        return {"messages": [AIMessage(content=final_text)]}

    # If only one report exists (diagnostic-only for healthy wheat, or treatment-only),
    # the relevant node already appended its message. Just pass through.
    if diag or treat:
        print("📋 Aggregator: single report, passing through")
        return {}

    # Fallback — should not happen, but safety net
    print("📋 Aggregator: no reports found, generating fallback")
    return {"messages": [AIMessage(content="I've processed your request. Is there anything else I can help with?")]}


# ── Routing ──────────────────────────────────────────────────
def route_from_supervisor(state: AgentState) -> str:
    return state["next_step"]


def route_after_diagnostic(state: AgentState) -> str:
    disease = state.get("detected_disease", "")
    next_step = state["next_step"]

    if next_step == "both" or (disease and disease != HEALTHY_CLASS):
        print(f"⚡ Auto-chaining to Treatment Agent (detected: {disease})")
        return "treatment"
    return "aggregator"


# ── Graph ────────────────────────────────────────────────────
memory = MemorySaver()
master_agent = None


def build_graph():
    """Build and compile the master agent graph."""
    global master_agent

    builder = StateGraph(AgentState)
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("diagnostic", run_diagnostic_node)
    builder.add_node("treatment", run_treatment_node)
    builder.add_node("direct", direct_answer_node)
    builder.add_node("aggregator", aggregator_node)

    builder.set_entry_point("supervisor")

    builder.add_conditional_edges("supervisor", route_from_supervisor, {
        "diagnostic": "diagnostic",
        "treatment": "treatment",
        "both": "diagnostic",
        "direct": "direct",
    })
    builder.add_conditional_edges("diagnostic", route_after_diagnostic, {
        "treatment": "treatment",
        "aggregator": "aggregator",
    })
    builder.add_edge("treatment", "aggregator")
    builder.add_edge("direct", "aggregator")
    builder.add_edge("aggregator", END)

    master_agent = builder.compile(checkpointer=memory)
    print("✅ Master Agent compiled with memory!")
    return master_agent


def run_agent(user_message: str, image_path: str = "", session_id: str = "default") -> dict:
    """
    Run the master agent with a user message and optional image.
    Returns a structured dict for the frontend.
    """
    if master_agent is None:
        raise RuntimeError("Agent not built — call build_graph() first")

    config = {"configurable": {"thread_id": session_id}}

    # Only pass what's new — the checkpointer restores the rest
    input_state = {"messages": [HumanMessage(content=user_message)]}
    if image_path:
        input_state["image_path"] = image_path

    print(f"\n{'='*60}")
    print(f"📨 New message in session [{session_id}]")
    print(f"   Message: {user_message[:80]}...")
    print(f"   Image: {image_path or 'None'}")
    print(f"{'='*60}")

    final_state = master_agent.invoke(input_state, config=config)

    # Debug: show what's in state
    print(f"\n📊 Final state keys:")
    print(f"   messages count: {len(final_state.get('messages', []))}")
    print(f"   detected_disease: {final_state.get('detected_disease', '')}")
    print(f"   diagnostic_report: {'yes' if final_state.get('diagnostic_report') else 'no'}")
    print(f"   treatment_report: {'yes' if final_state.get('treatment_report') else 'no'}")
    print(f"   next_step: {final_state.get('next_step', '')}")

    answer = clean_response_text(extract_content(final_state["messages"][-1].content))
    detected_disease = final_state.get("detected_disease", "")
    diagnostic_report = final_state.get("diagnostic_report", "")
    treatment_report = final_state.get("treatment_report", "")

    # Determine response type based on what happened THIS invocation
    next_step = final_state.get("next_step", "")

    if next_step in ("diagnostic", "both") and detected_disease and detected_disease != HEALTHY_CLASS and diagnostic_report:
        # Parse weather data from treatment report
        weather = _extract_weather(treatment_report)
        treatments = _extract_treatments(treatment_report)
        prevention = _extract_prevention(treatment_report)
        confidence = _extract_confidence(diagnostic_report)
        risk = _determine_risk(confidence)

        return {
            "type": "report",
            "message": f"Diagnosis complete: {detected_disease} detected with {confidence:.1f}% confidence. A full report with weather-aware treatment plan has been generated.",
            "diagnosis": detected_disease,
            "confidence": confidence,
            "risk": risk,
            "weather": weather,
            "treatment": treatments,
            "prevention": prevention,
            "full_report": answer,
        }
    elif next_step in ("diagnostic", "both") and detected_disease == HEALTHY_CLASS:
        conf = _extract_confidence(diagnostic_report)
        return {
            "type": "direct",
            "message": f"Great news! Your wheat crop appears healthy. The model is {conf:.1f}% confident this is Healthy Wheat. No treatment is needed at this time. Continue regular monitoring.",
        }
    else:
        return {
            "type": "direct",
            "message": answer,
        }


# ── Report Parsing Helpers ───────────────────────────────────
def _extract_confidence(report: str) -> float:
    """Extract confidence percentage from diagnostic report."""
    match = re.search(r"(\d+\.?\d*)%", report)
    return float(match.group(1)) if match else 85.0


def _determine_risk(confidence: float) -> str:
    if confidence >= 85:
        return "high"
    elif confidence >= 60:
        return "medium"
    return "low"


def _extract_weather(report: str) -> dict:
    """Extract weather info from treatment report, with sensible defaults."""
    weather = {
        "temp_c": 20.0,
        "wind_kmh": 10.0,
        "rain_mm": 0.0,
        "spray_safe": True,
    }

    temp_match = re.search(r"(\d+\.?\d*)°?\s*C", report)
    if temp_match:
        weather["temp_c"] = float(temp_match.group(1))

    wind_match = re.search(r"(\d+\.?\d*)\s*km/?h", report, re.IGNORECASE)
    if wind_match:
        weather["wind_kmh"] = float(wind_match.group(1))

    rain_match = re.search(r"(\d+\.?\d*)\s*mm", report)
    if rain_match:
        weather["rain_mm"] = float(rain_match.group(1))

    # Check if spray is not recommended
    not_safe_patterns = [
        r"not\s+(?:ideal|safe|recommended)\s+(?:to|for)\s+spray",
        r"do\s+not\s+spray",
        r"avoid\s+spray",
        r"unsafe\s+(?:to|for)\s+spray",
        r"wind\s+speeds?\s+exceed",
    ]
    for pattern in not_safe_patterns:
        if re.search(pattern, report, re.IGNORECASE):
            weather["spray_safe"] = False
            break

    # Also check wind threshold
    if weather["wind_kmh"] > 15:
        weather["spray_safe"] = False

    return weather


def _extract_treatments(report: str) -> list[dict]:
    """Extract treatment items from the report."""
    treatments = []

    lines = report.split("\n")
    in_treatment = False
    for line in lines:
        stripped = line.strip()
        if any(kw in stripped.lower() for kw in ["intervention", "treatment", "insecticide", "fungicide", "spray"]):
            in_treatment = True

        if in_treatment and stripped.startswith(("*", "-", "•")):
            text = re.sub(r"^[\*\-•]\s*", "", stripped)
            text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)  # Remove bold markers
            if len(text) > 10:
                t_type = "warning" if any(w in text.lower() for w in ["do not", "avoid", "warning", "caution", "don't"]) else "recommended"
                treatments.append({"label": text, "type": t_type})

        if stripped == "" and in_treatment and treatments:
            in_treatment = False

    # Fallback if nothing extracted
    if not treatments:
        treatments = [
            {"label": "Consult the full report for detailed treatment recommendations", "type": "recommended"},
        ]

    return treatments[:6]  # Cap at 6 items


def _extract_prevention(report: str) -> list[str]:
    """Extract prevention/long-term tips from the report."""
    prevention = []

    lines = report.split("\n")
    in_prevention = False
    for line in lines:
        stripped = line.strip()
        if any(kw in stripped.lower() for kw in ["long-term", "prevention", "cultural", "management", "monitoring"]):
            in_prevention = True

        if in_prevention and stripped.startswith(("*", "-", "•")):
            text = re.sub(r"^[\*\-•]\s*", "", stripped)
            text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
            if len(text) > 10:
                prevention.append(text)

        if stripped == "" and in_prevention and prevention:
            in_prevention = False

    if not prevention:
        prevention = [
            "Scout fields regularly during critical growth stages",
            "Sanitize equipment between field operations",
            "Practice crop rotation to break disease cycles",
        ]

    return prevention[:5]
