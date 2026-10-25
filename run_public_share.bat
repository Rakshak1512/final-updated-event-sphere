@echo off
title EventSphere - Public Share (Cloudflare Tunnel)
echo ===================================================
echo   EventSphere - Temporary Local Public Share
echo ===================================================
echo.
echo [SECURITY NOTICE]
echo Cloudflare Tunnel exposes your local frontend (http://localhost:5173)
echo to a temporary public HTTPS URL.
echo Anyone with the generated URL will be able to view your local site.
echo Do NOT use this for production or sensitive student data.
echo.

:: Check for cloudflared executable
set "CF_EXE="
where cloudflared >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "CF_EXE=cloudflared"
) else if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
    set "CF_EXE=C:\Program Files (x86)\cloudflared\cloudflared.exe"
) else if exist "C:\Program Files\cloudflared\cloudflared.exe" (
    set "CF_EXE=C:\Program Files\cloudflared\cloudflared.exe"
)

if "%CF_EXE%"=="" (
    echo [ERROR] cloudflared is not installed or not found in standard paths.
    echo.
    echo To install cloudflared on Windows:
    echo   1. Run in PowerShell: winget install --id Cloudflare.cloudflared
    echo   2. Or download cloudflared-windows-amd64.exe from:
    echo      https://github.com/cloudflare/cloudflared/releases
    echo   3. Place it in your PATH or C:\Program Files (x86)\cloudflared\
    echo.
    pause
    exit /b 1
)

:: 1. Ensure backend and frontend are running
echo Checking if local EventSphere servers are running...
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Starting Backend in separate window...
    start "EventSphere Backend" "%~dp0run_backend.bat"
    timeout /t 3 /nobreak >nul
)

netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Starting Frontend in separate window...
    start "EventSphere Frontend" "%~dp0run_frontend.bat"
    timeout /t 3 /nobreak >nul
)

echo.
echo ===================================================
echo Starting Cloudflare Tunnel for http://localhost:5173 ...
echo The public https://*.trycloudflare.com link will appear below.
echo ===================================================
echo.

"%CF_EXE%" tunnel --url http://localhost:5173
pause
