# scripts/deploy.sh
#!/bin/bash

echo "Starting deployment process..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install prerequisites
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Setup application directory
sudo mkdir -p /opt/email-warmer
cd /opt/email-warmer

# Pull latest changes
git fetch --all
git reset --hard origin/main

# Install dependencies
npm ci --production

# Setup directories and permissions
sudo mkdir -p logs backups config
sudo chown -R $USER:$USER .
sudo chmod -R 750 .
sudo chmod 600 config/email-config.json

# Start/Restart service
pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js

echo "Deployment completed!"

