# Email Warming Network

## Overview
This application helps warm up email accounts across multiple domains by simulating natural email conversations.

## Features
- Multi-domain email account management
- Automated email sending and reply generation
- Configurable scheduling
- Password encryption
- Monitoring and alerting system

## Prerequisites
- Node.js 18+
- PM2 Process Manager
- Linux VPS (Recommended)

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/email-warmer.git
cd email-warmer
```

2. Install dependencies
```bash
npm ci
```

3. Configure Environment
- Copy `.env.example` to `.env`
- Edit configuration files in `config/`
- Generate a secure encryption key

## Configuration

### Email Configuration
Edit `config/email-config.json` with your email accounts:
- SMTP and IMAP server details
- Email credentials

### Application Configuration
Configure `config/app-config.json`:
- Scheduling
- Email sending limits
- Monitoring settings

## Security
- Encrypt email passwords:
```bash
npm run encrypt-config
```

## Deployment
```bash
# Start production
npm run start:production

# Monitor
npm run monitor

# Backup
npm run backup
```

## Monitoring
The application provides:
- Error tracking
- Resource monitoring
- Alerting via email

## License
[Your License Here]