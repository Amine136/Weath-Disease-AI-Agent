# Master Agent — Step-by-Step Explanation

## Architecture Overview

```
User Input
    │
    ▼
[Supervisor] ──────────────────────────────────┐
    │                                           │
 "diagnostic" ──► [Diagnostic Agent]           │
 "treatment"  ──► [Treatment Agent]            │
 "both"       ──► [Diagnostic] ──► [Treatment] │
 "direct"     ──► [LLM Direct Answer]          │
    │                                           │
    └───────────────────► [Aggregator] ─► END  ◄┘
```

---

## Step 1 — `AgentState` (Shared State)

```python
class AgentState(TypedDict):
    messages:          Annotated[list, add_messages]
    diagnostic_report: str
    treatment_report:  str
    next_step:         str
    detected_disease:  str
```

This is the **shared memory** that flows between every node in the graph. Think of it as a backpack that every agent passes to the next one.

- `messages` — Full conversation history. The `add_messages` annotation tells LangGraph to **append** new messages rather than replacing the list.
- `diagnostic_report` — Stores the output of Agent 1 so Agent 2 and the Aggregator can read it.
- `treatment_report` — Stores the output of Agent 2 for the Aggregator.
- `next_step` — The routing decision made by the Supervisor (`"diagnostic"`, `"treatment"`, `"both"`, or `"direct"`).
- `detected_disease` — The predicted disease name from the PyTorch model (e.g. `"Aphid"`, `"Mildew"`, `"Healthy Wheat"`).

**Why `TypedDict` and not Pydantic `BaseModel`?** LangGraph serializes state internally as dicts. Pydantic `BaseModel` causes `ValidationError` when LangGraph passes message content as lists instead of strings.

---

## Step 2 — `extract_content()` (Content Safety Helper)

```python
def extract_content(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in content
        )
    return str(content)
```

Gemini sometimes returns message content as a **list of blocks** like `[{"type": "text", "text": "..."}]` instead of a plain string. This helper normalizes any format into a clean `str` so downstream code never crashes on unexpected content types.

**Used everywhere:** every node calls this before reading or storing message content.

---

## Step 3 — `RouterDecision` (Structured Output Schema)

```python
class RouterDecision(BaseModel):
    next: Literal["diagnostic", "treatment", "both", "direct"]
    reasoning: str
```

A Pydantic model that **constrains** the LLM's routing output to exactly 4 valid options. When used with `llm.with_structured_output(RouterDecision)`, the LLM is forced to return valid JSON matching this schema — it cannot hallucinate an invalid route.

- `next` — One of the 4 valid routes.
- `reasoning` — The LLM's explanation for why it chose that route (useful for debugging).

---

## Step 4 — `supervisor_node` (The Router / Brain)

```python
def supervisor_node(state: AgentState) -> AgentState:
    last_user_msg = state["messages"][-1].content
    router_llm = llm.with_structured_output(RouterDecision)
    decision = router_llm.invoke([
        SystemMessage(content=SUPERVISOR_PROMPT),
        HumanMessage(content=extract_content(last_user_msg))
    ])
    return {**state, "next_step": decision.next}
```

The **entry point** of every user message. It:
1. Reads the last user message.
2. Sends it to the LLM with the `SUPERVISOR_PROMPT`.
3. Gets back a structured `RouterDecision`.
4. Stores the decision in `state["next_step"]`.

The graph then uses `next_step` to decide which node runs next. This is the "traffic controller" of the entire system.

**Key design:** the Supervisor never calls tools or agents directly — it only decides the route. Execution is handled by the downstream nodes.

---

## Step 5 — `run_diagnostic_node` (Agent 1: Diagnosis)

```python
def run_diagnostic_node(state: AgentState) -> AgentState:
```

Runs the **Diagnostic Agent** (Agent 1). This node:
1. Checks if the user actually provided an image path in any message. If not, returns a "please provide an image" message instead of crashing.
2. Invokes the diagnostic ReAct agent, which internally:
   - Calls `analyze_wheat_image` (PyTorch EfficientNet-B3 model) → gets predicted disease + confidence.
   - Calls `TavilySearchResults` → searches for visual symptoms, causes, and risk info about the disease.
3. Separately runs `predict_wheat_disease()` to capture the raw disease name into `detected_disease`.
4. Stores the full diagnostic report in `diagnostic_report`.

**Why run prediction twice?** The ReAct agent produces a formatted text report, but we need the raw class name (e.g. `"Aphid"`) to decide whether to auto-chain to the Treatment Agent. The second call captures that value cleanly.

---

## Step 6 — `run_treatment_node` (Agent 2: Treatment)

```python
def run_treatment_node(state: AgentState) -> AgentState:
```

Runs the **Treatment Agent** (Agent 2). This node:
1. Reads the `diagnostic_report` from state and prepends it as context.
2. Finds the last human message to use as the user query.
3. Enhances the system prompt with **default coordinates** (Tunis, Tunisia) and an instruction to **always call the weather tool**.
4. Invokes the treatment ReAct agent, which internally:
   - Calls `get_agronomic_weather(lat, lon)` → fetches real-time weather from Open-Meteo.
   - Calls `TavilySearchResults` → searches for treatment protocols for the specific disease.
5. Stores the treatment report in `treatment_report`.

**Default coordinates:** If the user didn't provide their farm location, the agent uses default values (Tunis) instead of skipping the weather check entirely.

---

## Step 7 — `direct_answer_node` (General Q&A)

```python
def direct_answer_node(state: AgentState) -> AgentState:
```

Handles **everything that isn't a diagnosis or treatment request**: greetings, capability questions, follow-up questions about previous reports, general agriculture questions.

Key behaviors controlled by the system prompt:
- **Concise on early turns** — greetings get 1-2 sentences, not a feature catalog.
- **No guessing** — if the user says "I have a question", it asks "what would you like to know?" instead of listing assumed topics.
- **Wheat-only disclaimer** — mentioned once at most, not repeated every turn.
- **Context-aware** — uses full conversation history to answer follow-ups about previous reports.

---

## Step 8 — `aggregator_node` (Final Report Merger)

```python
def aggregator_node(state: AgentState) -> AgentState:
```

The **final node** before the graph ends. It is **always visited on every path**, but:
1. **Does nothing** if the path was `"direct"` — it returns state unchanged, so the direct answer already in `messages` remains the last message.
2. If both `diagnostic_report` and `treatment_report` exist, sends them to the LLM with instructions to merge into one clean **"AI Agronomic Report"**.
3. Injects today's real date via `datetime.now()` so the report header is accurate (LLMs don't know the current date otherwise).
4. If only one report exists (diagnostic-only or treatment-only), passes through without aggregation.

**"AI Agronomic Report"** framing was chosen over "Senior Agricultural Consultant" for transparency — the system should not imply a human expert wrote the report.

---

## Step 9 — Routing Functions

```python
def route_from_supervisor(state: AgentState) -> str:
    return state["next_step"]

def route_after_diagnostic(state: AgentState) -> str:
    disease = state.get("detected_disease", "")
    if state["next_step"] == "both" or (disease and disease != "Healthy Wheat"):
        return "treatment"
    return "aggregator"
```

Two routing functions that control the graph's conditional edges:

- `route_from_supervisor` — Simple: returns whatever the Supervisor decided (`"diagnostic"`, `"treatment"`, `"both"`, or `"direct"`).
- `route_after_diagnostic` — The **smart auto-chain logic**: after diagnosis, it automatically sends to the Treatment Agent if:
  - The user originally asked for `"both"`, OR
  - A disease was detected (anything other than `"Healthy Wheat"`).
  
  If the crop is healthy, it skips treatment and goes straight to the Aggregator.

---

## Step 10 — Graph Construction (Wiring the Nodes)

```python
builder = StateGraph(AgentState)

builder.add_node("supervisor",  supervisor_node)
builder.add_node("diagnostic",  run_diagnostic_node)
builder.add_node("treatment",   run_treatment_node)
builder.add_node("direct",      direct_answer_node)
builder.add_node("aggregator",  aggregator_node)

builder.set_entry_point("supervisor")

builder.add_conditional_edges("supervisor", route_from_supervisor, {
    "diagnostic": "diagnostic",
    "treatment":  "treatment",
    "both":       "diagnostic",
    "direct":     "direct",
})

builder.add_conditional_edges("diagnostic", route_after_diagnostic, {
    "treatment":  "treatment",
    "aggregator": "aggregator",
})

builder.add_edge("treatment", "aggregator")
builder.add_edge("direct",    "aggregator")
builder.add_edge("aggregator", END)
```

This is the **LangGraph graph definition** — it wires all nodes together into a directed graph:

1. **Entry:** Every message enters at `supervisor`.
2. **Conditional edges from supervisor:** Based on `next_step`, the graph branches to one of 4 nodes. Note that `"both"` maps to `diagnostic` first (then chains to treatment via `route_after_diagnostic`).
3. **Conditional edges from diagnostic:** Either continues to `treatment` (if disease found or "both" mode) or skips to `aggregator`.
4. **Fixed edges:** `treatment → aggregator` and `direct → aggregator` always.
5. **Terminal:** `aggregator → END` — the graph stops here.

---

## Step 11 — Compile with Memory

```python
memory = MemorySaver()
master_agent = builder.compile(checkpointer=memory)
```

Compiles the graph into a runnable agent and attaches a **MemorySaver checkpointer**.

- `MemorySaver` stores the full state (messages, reports, disease, etc.) **keyed by `thread_id`**.
- Same `thread_id` across multiple `invoke()` calls = same conversation context.
- Each call only needs to pass the **new message** — the checkpointer restores the full history automatically.
- Different `thread_id` = completely separate conversation (useful for multi-user scenarios).

**Usage in chat:**
```python
config = {"configurable": {"thread_id": "farm-session-42"}}
master_agent.invoke({"messages": [HumanMessage(content="...")]}, config=config)
```

---

## Summary Table

| Step | Name | Role |
|------|------|------|
| 1 | `AgentState` | Shared memory between all nodes |
| 2 | `extract_content()` | Safely converts any content format to string |
| 3 | `RouterDecision` | Constrains LLM routing to 4 valid options |
| 4 | `supervisor_node` | Routes user messages to the right agent |
| 5 | `run_diagnostic_node` | Runs PyTorch model + web search for diagnosis |
| 6 | `run_treatment_node` | Fetches weather + searches for treatments |
| 7 | `direct_answer_node` | Handles general Q&A and follow-ups |
| 8 | `aggregator_node` | Merges both reports into a final report |
| 9 | Routing functions | Controls conditional graph edges |
| 10 | Graph construction | Wires all nodes into a LangGraph StateGraph |
| 11 | Compile + Memory | Creates runnable agent with conversation persistence |
