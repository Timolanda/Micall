#!/bin/bash

# Check service health
echo "Checking service health..."
curl -f http://localhost:3000/health || {
    echo "Health check failed"
    exit 1
}

# Check MongoDB connection
echo "Checking MongoDB connection..."
docker-compose -f docker-compose.prod.yml exec mongodb mongosh --eval "db.runCommand({ping: 1})" || {
    echo "MongoDB check failed"
    exit 1
}

# Check Redis connection
echo "Checking Redis connection..."
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping || {
    echo "Redis check failed"
    exit 1
}

# Check SSL certificate
echo "Checking SSL certificate..."
openssl x509 -in ssl/fullchain.pem -text -noout || {
    echo "SSL certificate check failed"
    exit 1
}

echo "All checks passed!" 