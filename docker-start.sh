#!/bin/bash

# Fabrikator Docker Startup Script
# This script automates the setup and running of the Fabrikator application using Docker

set -e

echo "🚀 Starting Fabrikator Docker Setup..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file and add your OPENAI_API_KEY before continuing."
    echo "   You can edit it with: nano .env"
    read -p "Press Enter when you've configured your .env file..."
fi

# Load environment variables early
if [ -f .env ]; then
    echo "📋 Loading environment variables from .env..."
    source .env
fi

# Check if OPENAI_API_KEY is properly set
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your-openai-api-key-here" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY is not properly configured."
    echo "   Current value: ${OPENAI_API_KEY:-'(empty)'}"
    echo "   Please edit your .env file with a valid OpenAI API key."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Please update your .env file with a valid OpenAI API key."
        exit 1
    fi
    echo "⚠️  Continuing without valid API key - AI features will not work."
else
    echo "✅ OpenAI API key is configured."
fi

echo "🔧 Building and starting services..."

# Build all images first (force rebuild to ensure containers use latest code)
# Rebuild backend and frontend without cache to avoid stale layers
docker-compose build --no-cache backend frontend
# Build migrate image as well (in case Prisma/client changed)
docker-compose build migrate || true

# Start database first
echo "🗄️  Starting database..."
docker-compose up -d database

# Wait for database to be healthy
echo "⏳ Waiting for database to be ready..."
sleep 15

# Setup database schema
echo "🗃️  Setting up database schema..."
docker run --rm --network fabrikator_default -e DATABASE_URL="postgresql://fabrikator_user:fabrikator_password@fabrikator-db:5432/fabrikator_db?sslmode=disable" fabrikator_migrate sh -c "npx prisma db push --force-reset"

# Start backend and frontend manually due to network configuration issues
echo "🚀 Starting backend and frontend services..."

# Verify environment variables are loaded
echo "🔐 Using OpenAI API key: ${OPENAI_API_KEY:0:20}..." # Show only first 20 chars for security

# Clean up any existing containers
docker stop fabrikator-backend fabrikator-frontend 2>/dev/null || true
docker rm fabrikator-backend fabrikator-frontend 2>/dev/null || true

# Start backend with all necessary environment variables
docker run -d --name fabrikator-backend \
    --network fabrikator_default \
    -p 3001:3001 \
    -e NODE_ENV=production \
    -e PORT=3001 \
    -e DATABASE_URL="postgresql://fabrikator_user:fabrikator_password@fabrikator-db:5432/fabrikator_db?sslmode=disable" \
    -e OPENAI_API_KEY="$OPENAI_API_KEY" \
    fabrikator_backend

docker run -d --name fabrikator-frontend --network fabrikator_default -p 3000:3000 fabrikator_frontend

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

# Check database
if docker-compose exec -T database pg_isready -U fabrikator_user -d fabrikator_db > /dev/null 2>&1; then
    echo "✅ Database is healthy"
else
    echo "❌ Database is not responding"
fi

# Check backend
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
    
    # Verify OpenAI API key is loaded in container
    CONTAINER_API_KEY=$(docker exec fabrikator-backend printenv OPENAI_API_KEY 2>/dev/null || echo "")
    if [ -n "$CONTAINER_API_KEY" ] && [ "$CONTAINER_API_KEY" != "your-openai-api-key-here" ]; then
        echo "✅ OpenAI API key is loaded in backend container"
        
        # Test AI functionality
        echo "🤖 Testing AI project creation..."
        AI_TEST=$(timeout 15 curl -s -X POST http://localhost:3001/api/projects/create-from-prompt \
            -H "Content-Type: application/json" \
            -d '{"prompt":"A device to keep my coffee cup warm while I work on the computer. It should be circular, usbc powered, I want a green led strip on the circumference that glows when the device is powered, A button to turn it on and off. It must feature a heating element"}' 2>/dev/null || echo "timeout")
        
        if [[ "$AI_TEST" == *"id"* ]] && [[ "$AI_TEST" != "timeout" ]]; then
            echo "✅ AI project creation is working!"
        elif [[ "$AI_TEST" == "timeout" ]]; then
            echo "⚠️  AI test timed out (may be slow but working)"
        else
            echo "⚠️  AI project creation may have issues"
        fi
    else
        echo "⚠️  OpenAI API key not properly loaded in container"
    fi
else
    echo "⚠️  Backend is not responding yet (may still be starting...)"
fi

# Check frontend
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️  Frontend is not responding yet (may still be starting...)"
fi

# Database setup was already completed above

echo ""
echo "🎉 Fabrikator is starting up!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:3001"
echo "🗄️  Database: localhost:5432"
echo ""
echo "📊 View logs with: docker logs fabrikator-backend -f"
echo "🛑 Stop with: docker stop fabrikator-frontend fabrikator-backend fabrikator-db"
echo "💻 Backend environment check: docker exec fabrikator-backend printenv | grep OPENAI"
echo ""
echo "⏳ Please wait a few minutes for all services to fully start..."

# Optionally open browser
read -p "🌐 Open browser to http://localhost:3000? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open > /dev/null; then
        xdg-open http://localhost:3000
    elif command -v open > /dev/null; then
        open http://localhost:3000
    else
        echo "Please open http://localhost:3000 in your browser"
    fi
fi 