#!/bin/bash

# Fabrikator Development Startup Script
# Runs database in Docker, frontend/backend locally for development

set -e

echo "🚀 Starting Fabrikator Development Mode..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    if [ -f env.example ]; then
        cp env.example .env
    else
        cat > .env << EOF
# Database connection (Docker)
DATABASE_URL="postgresql://fabrikator_user:fabrikator_password@localhost:5432/fabrikator_db?sslmode=disable"

# OpenAI API Key
OPENAI_API_KEY="your-openai-api-key-here"

# Backend port
PORT=3001
EOF
    fi
    echo "⚠️  Please edit .env file and add your OPENAI_API_KEY before continuing."
    echo "   You can edit it with: nano .env"
    read -p "Press Enter when you've configured your .env file..."
fi

# Load environment variables
if [ -f .env ]; then
    echo "📋 Loading environment variables from .env..."
    export $(cat .env | grep -v '^#' | xargs)
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

echo "🗄️  Starting database in Docker..."

# Clean up any existing containers and networks that might cause conflicts
echo "🧹 Cleaning up existing containers and networks..."
docker-compose down --remove-orphans 2>/dev/null || true

# Remove the problematic network if it exists
if docker network ls | grep -q "fabrikator_default"; then
    echo "🔄 Removing existing network to recreate it..."
    docker network rm fabrikator_default 2>/dev/null || true
fi

# Start database service
docker-compose up -d database

# Wait for database to be healthy
echo "⏳ Waiting for database to be ready..."
until docker-compose exec -T database pg_isready -U fabrikator_user -d fabrikator_db > /dev/null 2>&1; do
    echo "   Waiting for database..."
    sleep 2
done
echo "✅ Database is ready!"

# Setup database schema
echo "🗃️  Setting up database schema..."
cd backend

# Create backend-specific .env with localhost database URL
cat > .env << EOF
DATABASE_URL="postgresql://fabrikator_user:fabrikator_password@localhost:5432/fabrikator_db?sslmode=disable"
OPENAI_API_KEY="$OPENAI_API_KEY"
PORT=3001
EOF

# Install dependencies and ensure nodemon is available
npm install

# Export environment variables explicitly for Prisma commands
export DATABASE_URL="postgresql://fabrikator_user:fabrikator_password@localhost:5432/fabrikator_db?sslmode=disable"

# Generate Prisma client
npm run db:generate

# Run migrations with explicit environment variable
DATABASE_URL="postgresql://fabrikator_user:fabrikator_password@localhost:5432/fabrikator_db?sslmode=disable" npm run db:migrate

# Verify nodemon is installed
if ! npm list nodemon > /dev/null 2>&1; then
    echo "⚠️  nodemon not found, installing it..."
    npm install --save-dev nodemon
fi

cd ..

echo "🔧 Installing frontend dependencies..."
npm install

echo ""
echo "🎉 Development environment is ready!"
echo ""
echo "📱 Frontend: http://localhost:3000 (will start with 'npm start')"
echo "🔌 Backend: http://localhost:3001 (will start with 'cd backend && npm run dev')"
echo "🗄️  Database: localhost:5432 (running in Docker)"
echo ""
echo "🚀 To start development:"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: npm start"
echo ""
echo "🛑 To stop database: docker-compose down"
echo "💻 Database logs: docker-compose logs -f database"
