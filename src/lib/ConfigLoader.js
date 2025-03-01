require('dotenv').config({ path: '/home/ambar/git_various/email_warm/.env' });
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ConfigLoader {
    constructor() {
        this.configPath = process.env.CONFIG_PATH || path.join(__dirname, '../../config');
        this.encryptionKey = process.env.ENCRYPTION_KEY;
    }

    async loadConfigurations() {
        try {
            const emailConfig = await this.loadEmailConfig();
            const appConfig = await this.loadAppConfig();
            return { emailConfig, appConfig };
        } catch (error) {
            console.error('Error loading configurations:', error);
            throw error;
        }
    }

    async loadEmailConfig() {
        const configPath = path.join(this.configPath, 'email-config.json');
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        
        // Decrypt passwords if they're encrypted
        Object.values(config).forEach(domain => {
            domain.emails.forEach(email => {
                if (email.password.startsWith('enc:')) {
                    email.password = this.decrypt(email.password.slice(4));
                }
            });
        });

        return config;
    }

    async loadAppConfig() {
        const configPath = path.join(this.configPath, 'app-config.json');
        return JSON.parse(await fs.readFile(configPath, 'utf8'));
    }

    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    }

    decrypt(encryptedText) {
        const [ivHex, encrypted, authTagHex] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'), iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    async encryptConfigPasswords() {
        const configPath = path.join(this.configPath, 'email-config.json');
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

        Object.values(config).forEach(domain => {
            domain.emails.forEach(email => {
                if (!email.password.startsWith('enc:')) {
                    email.password = `enc:${this.encrypt(email.password)}`;
                }
            });
        });

        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }
}

module.exports = ConfigLoader;
