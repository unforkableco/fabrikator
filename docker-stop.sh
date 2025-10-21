#!/bin/bash

# Fabrikator Docker Stop Script
# This script safely stops and cleans up all Fabrikator services

echo "🛑 Stopping Fabrikator services..."

# Stop all containers
echo "⏹️  Stopping containers..."
docker stop fabrikator-frontend fabrikator-backend fabrikator-db 2>/dev/null || true

# Remove containers
echo "🗑️  Removing containers..."
docker rm fabrikator-frontend fabrikator-backend fabrikator-db 2>/dev/null || true

# Optionally remove the network (if you want to clean everything)
read -p "🌐 Remove Docker network and volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing network and volumes..."
    docker network rm fabrikator_default 2>/dev/null || true
    docker volume rm fabrikator-postgres-data 2>/dev/null || true
    echo "✅ Complete cleanup done!"
else
    echo "📦 Network and volumes preserved (data will persist)"
fi

echo ""
echo "✅ Fabrikator services stopped successfully!"
echo ""
echo "🚀 To restart: ./docker-start.sh"
echo "🔄 To rebuild: docker-compose build && ./docker-start.sh" 