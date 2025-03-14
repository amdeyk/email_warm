// src/lib/EmailWarmingNetwork.js
const EventEmitter = require('events');
const schedule = require('node-schedule');
const { EmailAccount } = require('./EmailAccount');
const fs = require('fs').promises;
const path = require('path');
const Logger = require('./Logger');

class EmailWarmingNetwork extends EventEmitter {
    constructor(appConfig) {
        super();
        this.accounts = new Map();
        this.conversationLog = new Map();
        this.appConfig = appConfig;
        this.logger = new Logger({ verbose: true });
        this.templates = { initial: [], reply: [] };
        this.setupTemplates();
    }

    async setupTemplates() {
        try {
            this.templates.initial = await this.loadTemplates('initial');
            this.templates.reply = await this.loadTemplates('reply');
        } catch (error) {
            console.error("Error loading templates:", error);
        }
    }

    async loadTemplates(type) {
        try {
            const templatesDir = path.join(__dirname, '../../templates', type);
            const files = await fs.readdir(templatesDir);
            const templates = [];

            for (const file of files) {
                if (file.endsWith('.txt')) {
                    const content = await fs.readFile(path.join(templatesDir, file), 'utf8');
                    templates.push({ name: file.replace('.txt', ''), content });
                }
            }

            return templates;
        } catch (error) {
            console.error(`Error loading ${type} templates:`, error);
            return [];
        }
    }
    

    addAccount(config) {
    try {
        if (!config.email) {
            throw new Error("Email is required in config");
        }
        
        // Pass the entire config object as a single parameter
        const account = new EmailAccount(config);
        this.accounts.set(config.email, account);
        this.logger.log(`Added account: ${config.email}`);
        return account;
    } catch (error) {
        this.logger.error(`Failed to add account: ${error.message}`);
        throw error;
    }
}

    setupSchedules(scheduleConfig) {
        if (!scheduleConfig || !scheduleConfig.enabled || !scheduleConfig.schedules) {
            console.log("Scheduling is disabled or no schedules defined");
            return;
        }

        scheduleConfig.schedules.forEach(scheduleConfig => {
            this.createSchedule(scheduleConfig);
        });
    }

    createSchedule(scheduleConfig) {
        const { time, days } = scheduleConfig;
        console.log(`📅 Creating schedule for time: ${time}, days: ${days}`);

        const [hour, minute] = time.split(':').map(Number);
        let dayOfWeek = days;
        if (days.includes('-')) {
            const [start, end] = days.split('-').map(Number);
            dayOfWeek = Array.from({ length: end - start + 1 }, (_, i) => i + start);
        }

        schedule.scheduleJob({ hour, minute, dayOfWeek }, () => {
            console.log(`⏰ Executing scheduled task at ${new Date().toISOString()}`);
            this.initiateRandomConversations();
        });
    }

    async sendEmail(senderEmail, recipientEmail) {
        try {
            if (!senderEmail || !recipientEmail) {
                throw new Error("Sender or recipient email is missing");
            }

            const sender = this.accounts.get(senderEmail);
            if (!sender) {
                throw new Error(`Sender account ${senderEmail} not found`);
            }

            const template = this.getRandomTemplate('initial');
            if (!template) {
                throw new Error("No template available");
            }

            const { subject, content } = this.parseTemplate(template, {
                senderName: sender.displayName,
                recipientName: this.accounts.get(recipientEmail).displayName
            });

            const success = await sender.sendEmail(recipientEmail, subject, content);

            if (success) {
                this.logConversation(senderEmail, recipientEmail, subject, template.name);
                await fs.appendFile("/home/ambar/git_various/email_warm/logs/email-sent.log", 
                    `${new Date().toISOString()} - Sent email from ${senderEmail} to ${recipientEmail}\n`);
                return true;
            }

            return false;
        } catch (error) {
            console.error("Error sending email:", error);
            this.emit('error', error);
            return false;
        }
    }
}

module.exports = EmailWarmingNetwork;
