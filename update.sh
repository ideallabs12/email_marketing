#!/bin/bash

echo "🚀 Starting application update..."

# 1. Pull the latest code from your repository
echo "📥 Fetching latest code..."
git pull origin main

# 2. Rebuild and restart the Docker containers in the background
echo "🏗️ Rebuilding Docker containers..."
docker compose up -d --build

# 3. Run database migrations
echo "🗄️ Running database migrations..."
docker compose exec backend python manage.py migrate
docker compose restart backend

# 4. Clean up old unused Docker images to save disk space
echo "🧹 Cleaning up old unused images..."
docker image prune -f

echo "✅ Update complete! Your application is now running the latest version."
