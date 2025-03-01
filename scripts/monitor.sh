# scripts/monitor.sh
#!/bin/bash

echo "=== Email Warmer Monitoring Report ===="
date

# Check service status
systemctl status emailwarmer --no-pager
pm2 status

# Check system resources
echo "Memory Usage:"
free -h
echo "Disk Usage:"
df -h /home/ambar/git_various/email_warm/

# Check logs
tail -n 20 /home/ambar/git_various/email_warm/logs/error.log

