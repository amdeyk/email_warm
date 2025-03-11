// src/email-network-warmer.js
const ConfigLoader = require('./lib/ConfigLoader');
const EmailWarmingNetwork = require('./lib/EmailWarmingNetwork');
require('dotenv').config();

async function main() {
    try {
        // Load configurations
        const configLoader = new ConfigLoader();
        const { emailConfig, appConfig } = await configLoader.loadConfigurations();

        // Initialize network with configurations
        const network = new EmailWarmingNetwork(appConfig);
        
        // Track added accounts to prevent duplicates
        const addedEmails = new Set();

        // Add accounts from config
        Object.entries(emailConfig).forEach(([domainName, domainConfig]) => {
            domainConfig.emails.forEach(emailConfig => {
                // Skip if already added
                if (addedEmails.has(emailConfig.email)) {
                    console.log(`Skipping duplicate account: ${emailConfig.email}`);
                    return;
                }
                
                network.addAccount({
                    ...emailConfig,
                    smtpHost: domainConfig.smtpHost,
                    smtpPort: domainConfig.smtpPort,
                    imapHost: domainConfig.imapHost,
                    imapPort: domainConfig.imapPort,
                    domainName
                });
                
                // Mark as added
                addedEmails.add(emailConfig.email);
            });
        });

        // Setup schedules from config
        network.setupSchedules(appConfig.scheduling);

        console.log("Email warming network started");

        // Setup error handling and monitoring
        if (appConfig.monitoring.enabled) {
            setupMonitoring(network, appConfig.monitoring);
        }

    } catch (error) {
        console.error("Failed to start email warming network:", error);
        process.exit(1);
    }
}

function setupMonitoring(network, monitoringConfig) {
    let errorCount = 0;

    network.on('error', async (error) => {
        errorCount++;
        console.error('Network error:', error);

        if (errorCount >= monitoringConfig.errorThreshold) {
            await sendAlertEmail(monitoringConfig.alertEmail, {
                subject: "Email Warmer Alert: Error Threshold Exceeded",
                body: `The email warming system has encountered ${errorCount} errors.`
            });
            errorCount = 0;
        }
    });

    // Reset error count every 24 hours
    setInterval(() => {
        errorCount = 0;
    }, 24 * 60 * 60 * 1000);
}

// Start the application
main().catch(console.error);
