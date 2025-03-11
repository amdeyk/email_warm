// src/lib/Logger.js
const fs = require('fs');
const path = require('path');
const util = require('util');

class Logger {
    constructor(options = {}) {
        this.logDir = options.logDir || path.join(__dirname, '../../logs');
        this.logFile = options.logFile || 'email-warmer.log';
        this.errorFile = options.errorFile || 'error.log';
        this.verbose = options.verbose || false;
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        this.logPath = path.join(this.logDir, this.logFile);
        this.errorPath = path.join(this.logDir, this.errorFile);
    }
    
    log(message, data = null) {
        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] ${message}`;
        
        if (data) {
            logMessage += ` ${JSON.stringify(data)}`;
        }
        
        // Append to log file
        fs.appendFileSync(this.logPath, logMessage + '\n');
        
        // Also log to console if verbose
        if (this.verbose) {
            console.log(logMessage);
        }
    }
    
    error(message, error = null) {
        const timestamp = new Date().toISOString();
        let errorMessage = `[${timestamp}] ERROR: ${message}`;
        
        if (error) {
            if (error instanceof Error) {
                errorMessage += `\n${error.stack || error.message}`;
            } else {
                errorMessage += ` ${util.inspect(error)}`;
            }
        }
        
        // Append to error log file
        fs.appendFileSync(this.errorPath, errorMessage + '\n');
        
        // Also append to main log
        fs.appendFileSync(this.logPath, errorMessage + '\n');
        
        // Always log errors to console
        console.error(errorMessage);
    }
    
    emailSent(from, to, subject, messageId) {
        this.log(`Email sent from ${from} to ${to} with subject "${subject}"`, { messageId });
    }
    
    emailReceived(to, from, subject, messageId) {
        this.log(`Email received by ${to} from ${from} with subject "${subject}"`, { messageId });
    }
    
    emailError(from, to, error) {
        this.error(`Failed to send email from ${from} to ${to}`, error);
    }
    
    scheduledTask(task, info = null) {
        this.log(`Scheduled task executed: ${task}`, info);
    }
}

module.exports = Logger;
