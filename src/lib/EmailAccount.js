// src/lib/EmailAccount.js
const nodemailer = require('nodemailer');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

class EmailAccount {
    constructor(config) {
        this.email = config.email;
        this.domain = config.email.split('@')[1];
        this.displayName = config.displayName;
        this.setupTransporters(config);
    }

    setupTransporters(config) {
        // Setup SMTP
        this.smtpConfig = {
            host: config.smtpHost,
            port: config.smtpPort,
            secure: true,
            auth: {
                user: config.email,
                pass: config.password
            }
        };

        // Setup IMAP
        this.imapConfig = {
            user: config.email,
            password: config.password,
            host: config.imapHost,
            port: config.imapPort,
            tls: true
        };

        this.transporter = nodemailer.createTransport(this.smtpConfig);
        this.imap = new Imap(this.imapConfig);
        this.setupImapListeners();
    }

    setupImapListeners() {
        this.imap.on('ready', () => this.watchInbox());
        this.imap.on('error', (err) => {
            console.error(`IMAP error for ${this.email}:`, err);
        });
    }

    async watchInbox() {
        try {
            await this.imap.openBox('INBOX', false);
            this.imap.on('mail', () => this.processNewEmails());
        } catch (error) {
            console.error(`Error watching inbox for ${this.email}:`, error);
        }
    }

    async processNewEmails() {
        try {
            const messages = await this.fetchNewEmails();
            for (const message of messages) {
                if (this.shouldReply(message)) {
                    await this.sendReply(message);
                }
            }
        } catch (error) {
            console.error(`Error processing emails for ${this.email}:`, error);
        }
    }

    async sendEmail(to, subject, content) {
        try {
            await this.transporter.sendMail({
                from: this.email,
                to: to,
                subject: subject,
                text: content,
                headers: {
                    'X-Warming-Network': 'true'
                }
            });
            console.log(`Email sent from ${this.email} to ${to}`);
            return true;
        } catch (error) {
            console.error(`Error sending email from ${this.email}:`, error);
            return false;
        }
    }
}

