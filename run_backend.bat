@echo off
title EventSphere Backend
cd /d "%~dp0smart-event-management-system\backend"

echo ===================================================
echo   Starting EventSphere Backend Server
echo ===================================================
echo Backend Dir: %cd%

:: 1. Check Python installation
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python 3.11+ and add it to your system PATH.
    pause
    exit /b 1
)

:: 2. Check or create virtual environment
if not exist "venv\Scripts\python.exe" (
    echo [SETUP] Virtual environment not found. Creating venv in %cd%\venv...
    python -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [SETUP] Installing required dependencies from requirements.txt...
    .\venv\Scripts\pip.exe install -r requirements.txt
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install requirements.
        pause
        exit /b 1
    )
)

:: 3. Check for .env file
if not exist ".env" (
    if exist ".env.example" (
        echo [SETUP] .env file not found. Creating from .env.example...
        copy ".env.example" ".env" >nul
        echo [SETUP] Created .env. Please configure your Firebase and SMTP credentials in .env.
    )
)

echo.
echo ===================================================
echo Backend Server URL:  http://127.0.0.1:8000
echo API Documentation:   http://127.0.0.1:8000/docs
echo Health Check:        http://127.0.0.1:8000/api/health
echo ===================================================
echo.

:: 4. Start the FastAPI server using existing run_server.py
.\venv\Scripts\python.exe run_server.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] EventSphere Backend server exited with code %ERRORLEVEL%.
)
pause
