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
backend/      FastAPI app, model loading, LangGraph agent
frontend/     React + Vite UI
test_images/  Sample images for local testing
```

## Requirements

- Git
- Python 3.12
- Node.js 22+
- npm
- A trained model file such as `best_wheat_efficientnet.pth`
- Gemini and Tavily API keys

## 1. Download The Project

Clone the repository:

```bash
git clone https://github.com/Amine136/Weath-Disease-AI-Agent.git
cd Weath-Disease-AI-Agent
```

If you downloaded the project as a ZIP instead:

1. Extract the archive.
2. Open a terminal in the extracted `Weath-Disease-AI-Agent` folder.

## 2. Prepare The Model File

Make sure the trained model file is present in the project root:

```text
best_wheat_efficientnet.pth
```

If your model file is stored somewhere else, update `MODEL_PATH` in `backend/.env`.

## 3. Configure The Backend Environment

Create the backend environment file from the example on Linux or macOS:

```bash
cd backend
cp .env.example .env
```

On Windows PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env` and set your values:

```env
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key
MODEL_PATH=../best_wheat_efficientnet.pth
```

## 4. Install Backend Dependencies

From the `backend` directory on Linux or macOS:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

From the `backend` directory on Windows PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 5. Run The Backend

Still in the `backend` directory on Linux or macOS:

```bash
source venv/bin/activate
python main.py
```

On Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
python main.py
```

The backend runs on:

```text
http://localhost:8000
```

Health check:

```bash
curl http://localhost:8000/api/health
```

You should get a JSON response showing the API is running.

## 6. Install Frontend Dependencies

Open a second terminal, return to the project root, then enter the frontend:

```bash
cd frontend
npm install
```

## 7. Run The Frontend

From the `frontend` directory:

```bash
npm run dev -- --host 0.0.0.0
```

The frontend runs on:

```text
http://localhost:5173
```

## 8. Use The Application

1. Open `http://localhost:5173` in your browser.
2. Optionally adjust latitude and longitude in the chat composer.
3. Upload a wheat image or ask a question.
4. Review the generated agronomic report.
5. Export the report as PDF or share it from the report panel.

## Quick Start Summary

If your machine already has Python, Node.js, npm, Git, the model file, and API keys ready, the full flow is:

Linux or macOS:

```bash
git clone https://github.com/Amine136/Weath-Disease-AI-Agent.git
cd Weath-Disease-AI-Agent

cd backend
cp .env.example .env
# edit .env with your keys
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

In a second terminal:

```bash
cd Weath-Disease-AI-Agent/frontend
npm install
npm run dev -- --host 0.0.0.0
```

Windows PowerShell:

```powershell
git clone https://github.com/Amine136/Weath-Disease-AI-Agent.git
cd Weath-Disease-AI-Agent

cd backend
Copy-Item .env.example .env
# edit .env with your keys
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

In a second PowerShell terminal:

```powershell
cd Weath-Disease-AI-Agent\frontend
npm install
npm run dev -- --host 0.0.0.0
```

## Notes

- The backend expects the model path configured by `MODEL_PATH`.
- Do not commit real API keys or local `.env` files.
- Large artifacts like model weights, uploads, and local dependency folders are ignored by Git.
- On Windows, use `python` instead of `python3`, `Copy-Item` instead of `cp`, and `.\venv\Scripts\Activate.ps1` instead of `source venv/bin/activate`.
