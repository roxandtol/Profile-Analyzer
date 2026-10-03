@echo off
setlocal
title SDVX Volforce Planner - Web Server

:: Ensure we are in the project root directory
cd /d "%~dp0"

echo ===================================================
echo   SDVX Volforce Planner ^& Profile Analyzer
echo ===================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found in your PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists, if not install dependencies
if not exist "node_modules\" (
    echo [INFO] node_modules folder not found. Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install npm dependencies.
        pause
        exit /b %errorlevel%
    )
    echo [OK] Dependencies installed successfully.
    echo.
)

echo Starting Vite development server...
echo Web application will open at http://localhost:5173/
echo Press Ctrl+C in this window anytime to stop the server.
echo.

:: Launch the development server with automatic browser opening
call npm run dev -- --open

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The server stopped unexpectedly with code %errorlevel%.
    pause
)
