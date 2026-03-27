# Wheat Disease AI Agent

Wheat Disease AI Agent is a full-stack application for wheat leaf diagnosis and weather-aware treatment guidance. It combines:

- A FastAPI backend with a local EfficientNet-B3 classifier for wheat disease prediction
- A LangGraph supervisor agent that routes between diagnosis, treatment, and direct chat
- A React + Vite frontend for image upload, chat, report review, PDF export, sharing, and location override

## Features

- Diagnose wheat leaf images from `.jpg`, `.jpeg`, and `.png` uploads
- Generate treatment guidance using live weather context
- Ask follow-up questions in chat with session memory
- Resize the report panel horizontally
- Export agronomic reports as PDF
- Share reports or copy them to the clipboard
- Override default farm coordinates from the frontend

## Project Structure

```text
backend/    FastAPI app, model loading, LangGraph agent
frontend/   React + Vite UI
test_images/ Sample images for local testing
```

## Requirements

- Python 3.12
- Node.js 22+ for the frontend
- A trained model file, for example `best_wheat_efficientnet.pth`
- Gemini and Tavily API keys

## Backend Setup

Create `backend/.env` from `backend/.env.example` and set your values:

```env
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key
MODEL_PATH=../best_wheat_efficientnet.pth
```

Install dependencies:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Run the backend:

```bash
cd backend
python main.py
```

The backend serves on `http://localhost:8000`.

## Frontend Setup

Install dependencies:

```bash
cd frontend
npm install
```

Run the frontend:

```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

The frontend serves on `http://localhost:5173`.

## Usage

1. Open the frontend in the browser.
2. Optionally adjust latitude and longitude in the chat composer.
3. Upload a wheat image or ask a question.
4. Review the generated agronomic report.
5. Export the report as PDF or share it from the report panel.

## Notes

- The backend expects the model path configured by `MODEL_PATH`.
- Do not commit real API keys or local `.env` files.
- Large artifacts like model weights, uploads, and local dependency folders are ignored by Git.
# Weath-Disease-AI-Agent
