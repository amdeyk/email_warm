#!/bin/bash
# scripts/system-monitor.sh

# Configuration
LOG_DIR="/home/ambar/git_various/email_warm/logs"
EMAIL_WARMER_DIR="/home/ambar/git_various/email_warm"
REPORT_FILE="$LOG_DIR/system-report.log"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Generate timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Start report
echo "==== EMAIL WARMING SYSTEM REPORT ====" > "$REPORT_FILE"
echo "Generated: $TIMESTAMP" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check if service is running
echo "=== SERVICE STATUS ===" >> "$REPORT_FILE"
if pm2 jlist | grep -q "email-warmer"; then
    echo "✅ email-warmer service is RUNNING" >> "$REPORT_FILE"
    
    # Get uptime information
    UPTIME=$(pm2 jlist | grep -o '"pm_uptime":[0-9]*' | grep -o '[0-9]*')
    if [ ! -z "$UPTIME" ]; then
        UPTIME_SECONDS=$(($(date +%s) - $UPTIME/1000))
        UPTIME_DAYS=$((UPTIME_SECONDS / 86400))
        UPTIME_HOURS=$(((UPTIME_SECONDS % 86400) / 3600))
        UPTIME_MINUTES=$(((UPTIME_SECONDS % 3600) / 60))
        echo "  Uptime: ${UPTIME_DAYS}d ${UPTIME_HOURS}h ${UPTIME_MINUTES}m" >> "$REPORT_FILE"
    fi
    
    # Get restart count
    RESTARTS=$(pm2 jlist | grep -o '"restart_time":[0-9]*' | grep -o '[0-9]*')
    echo "  Restarts: $RESTARTS" >> "$REPORT_FILE"
else
    echo "❌ email-warmer service is NOT RUNNING" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Check system resources
echo "=== SYSTEM RESOURCES ===" >> "$REPORT_FILE"
echo "Memory Usage:" >> "$REPORT_FILE"
free -h | grep -v + >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Disk Usage:" >> "$REPORT_FILE"
df -h "$EMAIL_WARMER_DIR" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check for recent errors
echo "=== RECENT ERRORS ===" >> "$REPORT_FILE"
if [ -f "$LOG_DIR/error.log" ]; then
    ERROR_COUNT=$(grep -c ERROR "$LOG_DIR/error.log")
    RECENT_ERRORS=$(grep ERROR "$LOG_DIR/error.log" | tail -5)
    echo "Total errors: $ERROR_COUNT" >> "$REPORT_FILE"
    echo "Most recent errors:" >> "$REPORT_FILE"
    echo "$RECENT_ERRORS" >> "$REPORT_FILE"
else
    echo "No error log found" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Email statistics (last 24 hours)
echo "=== EMAIL STATISTICS (LAST 24 HOURS) ===" >> "$REPORT_FILE"
if [ -f "$LOG_DIR/email-warmer.log" ]; then
    TODAY=$(date +%Y-%m-%d)
    EMAILS_TODAY=$(grep "$TODAY" "$LOG_DIR/email-warmer.log" | grep -c "Email sent from")
    echo "Emails sent today: $EMAILS_TODAY" >> "$REPORT_FILE"
    
    # Last 5 emails
    echo "Last 5 emails sent:" >> "$REPORT_FILE"
    grep "Email sent from" "$LOG_DIR/email-warmer.log" | tail -5 >> "$REPORT_FILE"
else
    echo "No email log found" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Check for upcoming scheduled tasks
echo "=== UPCOMING SCHEDULED TASKS ===" >> "$REPORT_FILE"
if [ -f "$EMAIL_WARMER_DIR/config/app-config.json" ]; then
    NEXT_SCHEDULE=$(grep -A10 "schedules" "$EMAIL_WARMER_DIR/config/app-config.json" | grep "time" | head -1 | grep -o '"[0-9]*:[0-9]*"' | tr -d '"')
    if [ ! -z "$NEXT_SCHEDULE" ]; then
        echo "Next scheduled run: $NEXT_SCHEDULE" >> "$REPORT_FILE"
    else
        echo "No upcoming scheduled tasks found" >> "$REPORT_FILE"
    fi
else
    echo "No application config found" >> "$REPORT_FILE"
fi

# Display the report
cat "$REPORT_FILE"

# If this is run as a cron job, you can email the report
# mail -s "Email Warming System Report" you@example.com < "$REPORT_FILE"
