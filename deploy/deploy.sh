#!/bin/bash

# Exit on error
set -e

# Check required directories
for dir in ssl logs data; do
  if [ ! -d "$dir" ]; then
    echo "Creating $dir directory..."
    mkdir -p "$dir"
  fi
done

# Load environment variables
if [ ! -f ".env" ]; then
  echo "Error: .env file not found"
  echo "Please create .env file from .env.example"
  exit 1
fi

source .env

# Check if SSL certificates exist
if [ ! -f "./ssl/fullchain.pem" ] || [ ! -f "./ssl/privkey.pem" ]; then
    echo "SSL certificates not found. Please place them in the ssl directory."
    exit 1
fi

# Pull latest changes
git pull origin main

# Build and deploy with Docker Compose
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 30

# Run database migrations if needed
docker-compose -f docker-compose.prod.yml exec app npm run migrate

# Verify deployment
if curl -f http://localhost:3000/health; then
    echo "Deployment successful!"
else
    echo "Deployment may have issues. Please check logs."
    docker-compose -f docker-compose.prod.yml logs app
fi 