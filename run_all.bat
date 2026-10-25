@echo off
title EventSphere - Start All Servers
echo ===================================================
echo   Starting EventSphere Backend and Frontend
echo ===================================================
echo.

:: 1. Start backend in its own terminal window
start "EventSphere Backend" "%~dp0run_backend.bat"

:: 2. Brief wait for backend socket binding
timeout /t 3 /nobreak >nul

:: 3. Start frontend in its own terminal window
start "EventSphere Frontend" "%~dp0run_frontend.bat"

echo.
echo ===================================================
echo EventSphere is running!
echo Backend:   http://127.0.0.1:8000
echo API Docs:  http://127.0.0.1:8000/docs
echo Frontend:  http://localhost:5173
echo ===================================================
echo Both servers have been launched in separate terminal windows.
echo To stop them safely, run stop_all.bat
echo.
pause
