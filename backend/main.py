# ============================================================
# FastAPI Backend — Wheat Disease AI Assistant
# ============================================================
import os
import uuid
import shutil
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

# Load env vars before importing agent
load_dotenv()
os.environ.setdefault("GOOGLE_API_KEY", os.environ.get("GEMINI_API_KEY", ""))

from model import load_model
from agent import init_agent, build_graph, run_agent

# ── Config ───────────────────────────────────────────────────
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MODEL_PATH = os.environ.get("MODEL_PATH", "../best_wheat_efficientnet.pth")

app = FastAPI(title="Wheat Disease AI Assistant", version="1.0.0")

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# ── Startup ──────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    model_path = Path(MODEL_PATH)
    if not model_path.is_absolute():
        model_path = Path(__file__).parent / model_path

    if not model_path.exists():
        print(f"⚠️  Model file not found at {model_path}")
        print("   The diagnostic agent will not work until the model is available.")
    else:
        load_model(str(model_path))

    init_agent()
    build_graph()
    print("🚀 Backend ready!")


# ── Schemas ──────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    image_path: str = ""
    latitude: str = ""
    longitude: str = ""


class ChatResponse(BaseModel):
    type: str
    message: str
    diagnosis: str | None = None
    confidence: float | None = None
    risk: str | None = None
    weather: dict | None = None
    treatment: list | None = None
    prevention: list | None = None


# ── Endpoints ────────────────────────────────────────────────
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Wheat Disease AI Assistant is running"}


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload a wheat leaf image and return its server path."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, detail="Only image files are accepted")

    # Check extension
    ext = Path(file.filename or "image.jpg").suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png"):
        raise HTTPException(400, detail="Only .jpg, .jpeg, .png files accepted")

    # Save with unique name
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {
        "filename": unique_name,
        "path": str(file_path),
        "url": f"/uploads/{unique_name}",
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Send a message to the agent (optionally with an uploaded image path)."""
    try:
        message = req.message.strip()
        image_path = req.image_path.strip()
        latitude = req.latitude.strip()
        longitude = req.longitude.strip()

        # If an image was uploaded, include it in the message
        message_parts = [message]

        if image_path:
            message_parts.append(f"Image to analyze: {image_path}")

        if latitude and longitude:
            message_parts.append(
                f"Farm coordinates: Latitude {latitude}, Longitude {longitude}"
            )

        message_for_agent = "\n\n".join(part for part in message_parts if part)

        result = run_agent(
            user_message=message_for_agent,
            image_path=image_path,
            session_id=req.session_id,
        )

        return ChatResponse(**result)

    except Exception as e:
        print(f"❌ Error in chat: {e}")
        import traceback
        traceback.print_exc()
        return ChatResponse(
            type="direct",
            message=f"I encountered an error processing your request. Please try again. ({str(e)[:100]})",
        )


# ── Run ──────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
