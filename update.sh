#!/bin/bash

echo "🚀 Starting application update..."

# 1. Pull the latest code from your repository
echo "📥 Fetching latest code..."
git pull origin main

# 2. Rebuild and restart the Docker containers in the background
echo "🏗️ Rebuilding Docker containers..."
docker compose up -d --build

# 3. Run database migrations & seed templates/conferences
echo "🗄️ Running database migrations and seed scripts..."
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py load_templates
docker compose exec backend python seed_conferences.py
docker compose restart backend celery_worker celery_beat

# 4. Clean up old unused Docker images to save disk space
echo "🧹 Cleaning up old unused images..."
docker image prune -f

echo "✅ Update complete! Your application is now running the latest version."
