#!/bin/bash

# Emergency Alert Sound Generator
# 
# Generates alert sounds for the MiCall platform using FFmpeg.
# Creates 3 MP3 files with specific tones for different alert types.
#
# Requirements: FFmpeg installed (brew install ffmpeg)
# Usage: bash scripts/generate-alert-sounds.sh

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOUNDS_DIR="$SCRIPT_DIR/../public/sounds"

echo -e "${YELLOW}MiCall Alert Sound Generator${NC}"
echo "Sounds directory: $SOUNDS_DIR"
echo ""

# Check for FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}✗ FFmpeg not found${NC}"
    echo "  Install FFmpeg using: brew install ffmpeg"
    exit 1
fi

echo -e "${GREEN}✓ FFmpeg found$(ffmpeg -version | head -1 | cut -d' ' -f3)${NC}"

# Create sounds directory
mkdir -p "$SOUNDS_DIR"

# Generate Critical Alert (800Hz + 1000Hz alternating, 3 seconds)
echo "Generating critical alert sound..."
ffmpeg -f lavfi -i "sine=f=800:d=3|sine=f=1000:d=3[a][b];[a][b]amix=inputs=2" \
  -q:a 9 \
  -y "$SOUNDS_DIR/micall-alert-critical.mp3" 2>/dev/null

# Generate Responder Alert (600Hz steady, 2 seconds)
echo "Generating responder notification sound..."
ffmpeg -f lavfi -i "sine=f=600:d=2" \
  -q:a 9 \
  -y "$SOUNDS_DIR/micall-alert-responder.mp3" 2>/dev/null

# Generate Notification Alert (500Hz tone, 1.5 seconds)
echo "Generating notification sound..."
ffmpeg -f lavfi -i "sine=f=500:d=1.5" \
  -q:a 9 \
  -y "$SOUNDS_DIR/micall-alert-notification.mp3" 2>/dev/null

# List created files
echo ""
echo -e "${GREEN}✓ Alert sounds created:${NC}"
ls -lh "$SOUNDS_DIR" | tail -n +2 | awk '{print "  " $9 " (" $5 ")"}'

# Calculate total size
TOTAL_SIZE=$(du -sh "$SOUNDS_DIR" | cut -f1)
echo ""
echo -e "${GREEN}✓ Total size: $TOTAL_SIZE${NC}"
echo "All alert sounds generated successfully!"
