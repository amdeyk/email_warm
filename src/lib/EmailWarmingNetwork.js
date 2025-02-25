// src/lib/EmailWarmingNetwork.js
const EventEmitter = require('events');
const schedule = require('node-schedule');

class EmailWarmingNetwork extends EventEmitter {
    constructor(appConfig) {
        super();
        this.accounts = new Map();
        this.conversationLog = new Map();
        this.appConfig = appConfig;
        this.setupTemplates();
    }

    async setupTemplates() {
        this.templates = {
            initial: await this.loadTemplates('initial'),
            reply: await this.loadTemplates('reply')
        };
    }

    addAccount(config) {
        const account = new EmailAccount(config);
        this.accounts.set(config.email, account);
    }

    setupSchedules(scheduleConfig) {
        scheduleConfig.schedules.forEach(schedule => {
            this.createSchedule(schedule);
        });
    }

    getDailyEmailLimit() {
        const { minDaily, maxDaily } = this.appConfig.emailLimits;
        return Math.floor(Math.random() * (maxDaily - minDaily + 1)) + minDaily;
    }

    async initiateRandomConversations() {
        const emailList = Array.from(this.accounts.keys());
        for (const senderEmail of emailList) {
            const recipientEmail = this.getRandomRecipient(senderEmail);
            await this.sendEmail(senderEmail, recipientEmail);
            
            // Random delay between emails
            const delay = Math.random() * 
                (this.appConfig.emailLimits.maxInterval - this.appConfig.emailLimits.minInterval) + 
                this.appConfig.emailLimits.minInterval;
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
    }
}

module.exports = { EmailAccount, EmailWarmingNetwork };