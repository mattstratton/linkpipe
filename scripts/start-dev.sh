#!/bin/bash

set -e

echo "🚀 Starting LinkPipe development environment..."

# Check if .env exists, if not, find available ports
if [ ! -f .env ]; then
    echo "📝 No .env file found, creating one with available ports..."
    node scripts/find-ports.js
else
    echo "📁 Found existing .env file"
    
    # Ask if user wants to check for port conflicts
    read -p "🔍 Check for port conflicts and update if needed? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        node scripts/find-ports.js
    fi
fi

echo ""
echo "🐳 Starting Docker Compose..."
docker-compose up --build

echo ""
echo "🛑 Development environment stopped." 