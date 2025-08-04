@echo off
setlocal

echo 🚀 Starting LinkPipe development environment...

REM Check if .env exists, if not, find available ports
if not exist .env (
    echo 📝 No .env file found, creating one with available ports...
    node scripts/find-ports.js
) else (
    echo 📁 Found existing .env file
    
    REM Ask if user wants to check for port conflicts
    set /p choice="🔍 Check for port conflicts and update if needed? (y/N): "
    if /i "%choice%"=="y" (
        node scripts/find-ports.js
    )
)

echo.
echo 🐳 Starting Docker Compose...
docker-compose up --build

echo.
echo 🛑 Development environment stopped.
pause 