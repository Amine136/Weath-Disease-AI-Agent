# Run Commands

This project has two parts that run separately:

- `backend/` for the FastAPI API
- `frontend/` for the React + Vite UI

## 1. Backend setup

From the project root:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set:

```env
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key
MODEL_PATH=../best_wheat_efficientnet.pth
```

Then install backend dependencies:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 2. Run backend

```bash
cd backend
source venv/bin/activate
python main.py
```

Backend URL:

```text
http://localhost:8000
```

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

## 3. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
```

## 4. Run frontend

```bash
cd frontend
npm run dev -- --host 0.0.0.0
```

Frontend URL:

```text
http://localhost:5173
```

## Quick start

If everything is already installed:

```bash
cd backend
source venv/bin/activate
python main.py
```

In another terminal:

```bash
cd frontend
npm run dev -- --host 0.0.0.0
```
