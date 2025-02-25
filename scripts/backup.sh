# scripts/backup.sh
#!/bin/bash

BACKUP_DIR="/opt/email-warmer/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf $BACKUP_DIR/email_warmer_$TIMESTAMP.tar.gz \
    templates/ \
    config/ \
    ecosystem.config.js \
    .env

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete

