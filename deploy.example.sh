#!/bin/bash
# Siam Daily Hub - Deployment Script (template)
# Copy this file to deploy.sh and fill in your own server details.
set -e

# Modify these values to match YOUR server
VPS_USER="your-username"
VPS_HOST="your-server.example.com"
VPS_PATH="~/docker/siam-daily"

echo "🚀 Preparing directories on VPS..."
ssh "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_PATH/data && [ -f $VPS_PATH/data/users.json ] || echo '{\"users\":{}}' > $VPS_PATH/data/users.json"

echo "🚀 Syncing local codebase to VPS ($VPS_HOST)..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'data' ./ "$VPS_USER@$VPS_HOST:$VPS_PATH/"

echo "🐳 Rebuilding and restarting Docker container..."
ssh "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && docker compose up -d --build"

echo "✅ Deployment completed successfully!"
