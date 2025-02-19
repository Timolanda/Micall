#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Starting MiCall deployment setup...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root${NC}"
  exit 1
fi

# Create directory structure
echo "Creating directory structure..."
mkdir -p /opt/micall/{ssl,logs,data,monitoring,backup}
cd /opt/micall

# Copy deployment files
echo "Copying deployment files..."
cp -r deploy/* .
cp .env.example .env

# Set correct permissions
echo "Setting permissions..."
chown -R 1000:1000 data logs
chmod +x deploy.sh verify.sh backup/backup.sh

# Check for SSL certificates
if [ ! -f "ssl/fullchain.pem" ] || [ ! -f "ssl/privkey.pem" ]; then
  echo -e "${RED}SSL certificates not found in ssl directory${NC}"
  echo "Please copy your SSL certificates to /opt/micall/ssl/"
  echo "Required files:"
  echo "  - fullchain.pem"
  echo "  - privkey.pem"
  exit 1
fi

# Check for .env file
if [ ! -f ".env" ]; then
  echo -e "${RED}.env file not found${NC}"
  echo "Please configure your .env file"
  exit 1
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
  echo "Installing Docker Compose..."
  curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

# Setup monitoring
echo "Setting up monitoring..."
cd monitoring
docker-compose up -d

# Setup backup cron job
echo "Setting up backup cron job..."
(crontab -l 2>/dev/null; echo "0 0 * * * /opt/micall/backup/backup.sh") | crontab -

echo -e "${GREEN}Setup completed!${NC}"
echo "Next steps:"
echo "1. Configure your .env file"
echo "2. Run ./deploy.sh to start the application"
echo "3. Run ./verify.sh to verify the deployment" 