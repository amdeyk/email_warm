// src/lib/EmailAccount.js
const nodemailer = require('nodemailer');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { promisify } = require('util');

class EmailAccount {
    constructor(config) {
        this.email = config.email;
        this.domain = config.email.split('@')[1];
        this.displayName = config.displayName || this.email.split('@')[0];
        this.domainName = config.domainName;
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
            },
            tls: {
                // Allow self-signed certificates
                rejectUnauthorized: false
            }
        };

        // Setup IMAP
        this.imapConfig = {
            user: config.email,
            password: config.password,
            host: config.imapHost,
            port: config.imapPort,
            tls: true,
            tlsOptions: {
                rejectUnauthorized: false
            }
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
            console.log(`Watching inbox for ${this.email}`);
        } catch (error) {
            console.error(`Error watching inbox for ${this.email}:`, error);
        }
    }

    async fetchNewEmails() {
        return new Promise((resolve, reject) => {
            try {
                const messages = [];
                
                // Search for unread messages
                this.imap.search(['UNSEEN'], (err, results) => {
                    if (err) {
                        return reject(err);
                    }
                    
                    if (!results || results.length === 0) {
                        return resolve([]);
                    }
                    
                    const fetch = this.imap.fetch(results, { bodies: '', markSeen: true });
                    
                    fetch.on('message', (msg) => {
                        const message = {};
                        
                        msg.on('body', (stream) => {
                            simpleParser(stream, (err, parsed) => {
                                if (err) {
                                    console.error('Error parsing email:', err);
                                    return;
                                }
                                
                                message.from = parsed.from.text;
                                message.subject = parsed.subject;
                                message.text = parsed.text;
                                message.html = parsed.html;
                                message.date = parsed.date;
                                message.headers = parsed.headers;
                            });
                        });
                        
                        msg.on('attributes', (attrs) => {
                            message.uid = attrs.uid;
                        });
                        
                        msg.once('end', () => {
                            messages.push(message);
                        });
                    });
                    
                    fetch.once('error', (err) => {
                        reject(err);
                    });
                    
                    fetch.once('end', () => {
                        resolve(messages);
                    });
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    shouldReply(message) {
        // Check if this is an email from our warming network
        const isWarmingEmail = message.headers && 
                              message.headers.get('x-warming-network') === 'true';
        
        // Don't reply to our own warming emails to avoid endless loops
        return isWarmingEmail;
    }

    async sendReply(message) {
        try {
            const replyText = `RE: ${message.subject}\n\nThank you for your email. This is an automated response from our email warming system.`;
            
            await this.transporter.sendMail({
                from: this.email,
                to: message.from,
                subject: `Re: ${message.subject}`,
                text: replyText,
                headers: {
                    'X-Warming-Network': 'true',
                    'In-Reply-To': message.headers.get('message-id')
                }
            });
            
            console.log(`Reply sent from ${this.email} to ${message.from}`);
            return true;
        } catch (error) {
            console.error(`Error sending reply from ${this.email}:`, error);
            return false;
        }
    }

    async sendEmail(to, subject, content) {
        try {
            const info = await this.transporter.sendMail({
                from: {
                    name: this.displayName,
                    address: this.email
                },
                to: to,
                subject: subject,
                text: content,
                headers: {
                    'X-Warming-Network': 'true'
                }
            });
            
            console.log(`Email sent from ${this.email} to ${to}: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error(`Error sending email from ${this.email}:`, error);
            return false;
        }
    }

    async startConnection() {
        return new Promise((resolve, reject) => {
            this.imap.once('ready', () => {
                console.log(`IMAP connection ready for ${this.email}`);
                resolve();
            });
            
            this.imap.once('error', (err) => {
                console.error(`IMAP connection error for ${this.email}:`, err);
                reject(err);
            });
            
            this.imap.connect();
        });
    }
}

module.exports = { EmailAccount };
