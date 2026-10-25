@echo off
title EventSphere - Stop All Local Servers
echo ===================================================
echo   Stopping EventSphere Local Servers Safely
echo ===================================================
echo.

:: Target only processes listening on EventSphere ports (8000 and 5173)
:: This prevents terminating unrelated node.exe or python.exe processes on the machine.

echo [1/3] Checking port 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo   Terminating Backend process PID %%a on port 8000...
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/3] Checking port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo   Terminating Frontend process PID %%a on port 5173...
    taskkill /F /PID %%a >nul 2>&1
)

echo [3/3] Closing EventSphere terminal windows...
taskkill /F /FI "WINDOWTITLE eq EventSphere Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq EventSphere Frontend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq EventSphere Cloudflare Tunnel*" >nul 2>&1

echo.
echo ===================================================
echo EventSphere servers on port 8000 and 5173 stopped.
echo Unrelated Python and Node.js processes were preserved.
echo ===================================================
echo.
pause
