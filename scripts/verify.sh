#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Check services
check_service() {
  local service=$1
  local port=$2
  echo -n "Checking $service... "
  if nc -z localhost $port; then
    echo -e "${GREEN}OK${NC}"
    return 0
  else
    echo -e "${RED}FAILED${NC}"
    return 1
  fi
}

# Check service health
check_health() {
  echo -n "Checking application health... "
  if curl -s http://localhost:3000/health | grep -q "healthy"; then
    echo -e "${GREEN}OK${NC}"
    return 0
  else
    echo -e "${RED}FAILED${NC}"
    return 1
  fi
}

# Main verification
echo "Starting verification..."

# Check all services
check_service "app" 3000
check_service "mongodb" 27017
check_service "redis" 6379
check_service "prometheus" 9090
check_service "grafana" 3001

# Check application health
check_health

# Check logs for errors
echo -n "Checking logs for errors... "
if ! grep -i "error" /opt/micall/logs/*.log; then
  echo -e "${GREEN}OK${NC}"
else
  echo -e "${RED}Found errors in logs${NC}"
fi 