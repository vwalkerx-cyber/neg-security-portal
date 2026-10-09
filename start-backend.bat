@echo off
echo Starting Nexus FastAPI Backend Server on http://127.0.0.1:8000 ...
cd backend
.\venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
