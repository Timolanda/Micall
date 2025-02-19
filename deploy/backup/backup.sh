#!/bin/bash

# Exit on error
set -e

BACKUP_DIR="/opt/micall/data/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup MongoDB
echo "Backing up MongoDB..."
docker-compose -f docker-compose.prod.yml exec -T mongodb mongodump \
  --archive > "$BACKUP_DIR/mongodb_$DATE.archive"

# Backup Redis
echo "Backing up Redis..."
docker-compose -f docker-compose.prod.yml exec -T redis redis-cli SAVE
docker cp $(docker-compose -f docker-compose.prod.yml ps -q redis):/data/dump.rdb \
  "$BACKUP_DIR/redis_$DATE.rdb"

# Upload to S3
echo "Uploading backups to S3..."
aws s3 sync "$BACKUP_DIR" "s3://${AWS_BACKUP_BUCKET}/backups/"

# Cleanup old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully!" 