#!/bin/bash

# Exit on error
set -e

PACKAGE_DIR="micall-deploy"
VERSION=$(date +%Y%m%d_%H%M%S)

# Create package directory
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR

# Copy deployment files
cp -r deploy/* $PACKAGE_DIR/
cp -r config $PACKAGE_DIR/
cp .env.example $PACKAGE_DIR/.env.example

# Create version file
echo $VERSION > $PACKAGE_DIR/VERSION

# Create package
tar -czf micall-deploy-$VERSION.tar.gz $PACKAGE_DIR
echo "Created package: micall-deploy-$VERSION.tar.gz" 