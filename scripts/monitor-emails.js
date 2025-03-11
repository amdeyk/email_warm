// scripts/monitor-emails.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const LOG_FILE = path.join(__dirname, '../logs/email-warmer.log');
const REPORT_FILE = path.join(__dirname, '../logs/email-report.json');
const DAYS_TO_ANALYZE = 7; // Number of days to include in the report

// Main function
async function generateEmailReport() {
    try {
        // Create logs directory if it doesn't exist
        const logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        // Check if log file exists
        if (!fs.existsSync(LOG_FILE)) {
            console.error(`Log file not found: ${LOG_FILE}`);
            console.log('Make sure the application is running and logging to the correct location');
            return;
        }

        // Initialize data structures
        const emailStats = {
            totalSent: 0,
            byDomain: {},
            byAccount: {},
            byPair: {},
            byDate: {},
            lastActivity: null
        };

        // Parse the log file
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - DAYS_TO_ANALYZE);
        
        const fileStream = fs.createReadStream(LOG_FILE);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        console.log('Analyzing email activity...');
        
        // Process each line
        for await (const line of rl) {
            // Look for email sent logs
            if (line.includes('Email sent from')) {
                const match = line.match(/Email sent from (\S+) to (\S+)/);
                if (match) {
                    const timestamp = extractTimestamp(line);
                    if (!timestamp || new Date(timestamp) < startDate) continue;
                    
                    const [_, fromEmail, toEmail] = match;
                    const fromDomain = fromEmail.split('@')[1];
                    const toDomain = toEmail.split('@')[1];
                    const date = new Date(timestamp).toISOString().split('T')[0];
                    
                    // Update stats
                    emailStats.totalSent++;
                    emailStats.lastActivity = timestamp;
                    
                    // By domain
                    emailStats.byDomain[fromDomain] = (emailStats.byDomain[fromDomain] || 0) + 1;
                    
                    // By account
                    emailStats.byAccount[fromEmail] = emailStats.byAccount[fromEmail] || { sent: 0, received: 0 };
                    emailStats.byAccount[toEmail] = emailStats.byAccount[toEmail] || { sent: 0, received: 0 };
                    emailStats.byAccount[fromEmail].sent++;
                    emailStats.byAccount[toEmail].received++;
                    
                    // By pair
                    const pairKey = `${fromEmail} -> ${toEmail}`;
                    emailStats.byPair[pairKey] = (emailStats.byPair[pairKey] || 0) + 1;
                    
                    // By date
                    emailStats.byDate[date] = emailStats.byDate[date] || 0;
                    emailStats.byDate[date]++;
                }
            }
        }

        // Calculate daily average
        const dates = Object.keys(emailStats.byDate).sort();
        const dayCount = dates.length || 1; // Avoid division by zero
        const dailyAverage = emailStats.totalSent / dayCount;
        
        // Add summary
        emailStats.summary = {
            period: `${DAYS_TO_ANALYZE} days`,
            dailyAverage: dailyAverage.toFixed(2),
            activeDays: dayCount,
            startDate: dates[0] || 'No activity',
            endDate: dates[dates.length - 1] || 'No activity'
        };

        // Write report
        fs.writeFileSync(REPORT_FILE, JSON.stringify(emailStats, null, 2));
        
        // Print summary to console
        console.log('\nEmail Activity Report');
        console.log('===================');
        console.log(`Period: Last ${DAYS_TO_ANALYZE} days (${emailStats.summary.startDate} to ${emailStats.summary.endDate})`);
        console.log(`Total emails sent: ${emailStats.totalSent}`);
        console.log(`Daily average: ${emailStats.summary.dailyAverage} emails`);
        console.log(`Last activity: ${emailStats.lastActivity || 'None'}`);
        console.log('\nTop senders:');
        printTopEntries(emailStats.byAccount, 'sent', 5);
        console.log('\nTop recipients:');
        printTopEntries(emailStats.byAccount, 'received', 5);
        console.log('\nDaily breakdown:');
        for (const date of dates) {
            console.log(`${date}: ${emailStats.byDate[date]} emails`);
        }
        
        console.log(`\nDetailed report saved to: ${REPORT_FILE}`);
    } catch (error) {
        console.error('Error generating report:', error);
    }
}

// Helper functions
function extractTimestamp(logLine) {
    const match = logLine.match(/^\[(.*?)\]/);
    return match ? match[1] : null;
}

function printTopEntries(data, property, limit) {
    const sorted = Object.entries(data)
        .map(([key, value]) => ({ key, value: value[property] || 0 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
    
    sorted.forEach(({ key, value }) => {
        console.log(`  ${key}: ${value}`);
    });
}

// Run the report
generateEmailReport().catch(console.error);
