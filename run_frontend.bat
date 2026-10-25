@echo off
title EventSphere Frontend
cd /d "%~dp0smart-event-management-system\frontend"

echo ===================================================
echo   Starting EventSphere Frontend Server
echo ===================================================
echo Frontend Dir: %cd%

:: 1. Check Node.js and npm availability
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed or not in your PATH.
    pause
    exit /b 1
)

:: 2. Check dependencies (install only if node_modules is missing)
if not exist "node_modules\" (
    echo [SETUP] node_modules not found. Installing frontend dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: 3. Check .env file
if not exist ".env" (
    if exist ".env.example" (
        echo [SETUP] .env file not found. Creating from .env.example...
        copy ".env.example" ".env" >nul
    )
)

echo.
echo ===================================================
echo Frontend Local URL:  http://localhost:5173
echo Proxied Backend API: http://127.0.0.1:8000
echo ===================================================
echo.

:: 4. Start Vite dev server
call npm run dev
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] EventSphere Frontend server exited with code %ERRORLEVEL%.
)
pause
