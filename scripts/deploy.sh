#!/bin/bash

# Exit on error
set -e

# Load environment variables
source .env

# Build and tag Docker images
docker-compose -f docker-compose.prod.yml build

# Push images to registry
docker-compose -f docker-compose.prod.yml push

# Deploy to server
ssh $DEPLOY_USER@$DEPLOY_HOST "cd /opt/micall && \
  docker-compose pull && \
  docker-compose up -d && \
  docker system prune -f"

echo "Deployment completed successfully!" 