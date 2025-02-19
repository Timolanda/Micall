#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}MiCall Full Deployment Setup${NC}"

# Function to check prerequisites
check_prerequisites() {
  echo -e "\n${GREEN}Checking prerequisites...${NC}"
  
  # Check SSL certificates
  if [ ! -f "ssl/fullchain.pem" ] || [ ! -f "ssl/privkey.pem" ]; then
    echo -e "${RED}Error: SSL certificates not found${NC}"
    echo "Please place your SSL certificates in the ssl directory:"
    echo "  - ssl/fullchain.pem"
    echo "  - ssl/privkey.pem"
    exit 1
  fi

  # Check .env file
  if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Creating .env from example..."
    cp .env.example .env
    echo "Please edit .env with your configuration"
    exit 1
  fi
}

# Function to setup directories
setup_directories() {
  echo -e "\n${GREEN}Setting up directories...${NC}"
  
  for dir in ssl logs data monitoring backup; do
    mkdir -p "/opt/micall/$dir"
    echo "Created /opt/micall/$dir"
  done
  
  # Set proper permissions
  chown -R 1000:1000 /opt/micall/{data,logs}
}

# Function to install dependencies
install_dependencies() {
  echo -e "\n${GREEN}Installing dependencies...${NC}"
  
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
}

# Function to setup monitoring
setup_monitoring() {
  echo -e "\n${GREEN}Setting up monitoring...${NC}"
  
  cd /opt/micall/monitoring
  docker-compose up -d prometheus grafana
  
  echo "Waiting for Grafana to start..."
  sleep 10
  
  # Import dashboards
  for dashboard in /opt/micall/monitoring/dashboards/*.json; do
    curl -X POST -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
      "http://localhost:3001/api/dashboards/db" -d @"$dashboard"
  done
}

# Function to setup backups
setup_backups() {
  echo -e "\n${GREEN}Setting up backup system...${NC}"
  
  chmod +x /opt/micall/backup/backup.sh
  
  # Add backup cron job
  (crontab -l 2>/dev/null; echo "0 0 * * * /opt/micall/backup/backup.sh") | crontab -
  
  # Create first backup
  /opt/micall/backup/backup.sh
}

# Function to deploy application
deploy_application() {
  echo -e "\n${GREEN}Deploying application...${NC}"
  
  cd /opt/micall
  
  # Pull latest images
  docker-compose -f docker-compose.prod.yml pull
  
  # Start services
  docker-compose -f docker-compose.prod.yml up -d
  
  echo "Waiting for services to start..."
  sleep 30
}

# Function to verify deployment
verify_deployment() {
  echo -e "\n${GREEN}Verifying deployment...${NC}"
  
  # Check health endpoint
  if curl -f http://localhost:3000/health; then
    echo -e "${GREEN}Health check passed${NC}"
  else
    echo -e "${RED}Health check failed${NC}"
    exit 1
  fi
  
  # Check MongoDB
  if docker-compose -f docker-compose.prod.yml exec -T mongodb mongosh --eval "db.runCommand({ping: 1})"; then
    echo -e "${GREEN}MongoDB check passed${NC}"
  else
    echo -e "${RED}MongoDB check failed${NC}"
    exit 1
  fi
  
  # Check Redis
  if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping; then
    echo -e "${GREEN}Redis check passed${NC}"
  else
    echo -e "${RED}Redis check failed${NC}"
    exit 1
  fi
}

# Main deployment process
main() {
  check_prerequisites
  setup_directories
  install_dependencies
  setup_monitoring
  setup_backups
  deploy_application
  verify_deployment
  
  echo -e "\n${GREEN}Deployment completed successfully!${NC}"
  echo -e "\nNext steps:"
  echo "1. Access Grafana at http://your-domain:3001"
  echo "2. Check application logs with: docker-compose -f docker-compose.prod.yml logs -f app"
  echo "3. Monitor the services with: docker-compose -f docker-compose.prod.yml ps"
}

# Run main function
main 