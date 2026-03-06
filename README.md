# Hide My Email - Gmail Alias Service

A privacy-focused email alias service similar to Apple's "Hide My Email" that works with Gmail. Create disposable email addresses that forward to your Gmail account.

## ✨ Features

- **🔐 Privacy-First**: Generate unlimited disposable email aliases
- **📧 Gmail Integration**: OAuth login with Google, forwards to your Gmail
- **📱 Mobile-Friendly**: Responsive design that works on desktop, mobile, and can be adapted as a browser extension
- **⚡ Real-time Management**: Enable/disable aliases instantly
- **📊 Activity Tracking**: View email forwarding logs and statistics
- **🚀 Auto-forwarding**: Seamless email forwarding with header information

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Node.js API    │    │   PostgreSQL    │
│                 │────│                 │────│                 │
│  - Dashboard    │    │  - Auth (OAuth) │    │  - Users        │
│  - Alias Mgmt   │    │  - Alias CRUD   │    │  - Aliases      │
│                 │    │  - Email Fwd    │    │  - Email Logs   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               │
                    ┌─────────────────┐
                    │  Email Provider │
                    │                 │
                    │  - AWS SES      │
                    │  - Mailgun      │
                    │  - SMTP         │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Google OAuth credentials
- Email service (AWS SES, Mailgun, or SMTP)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd hide-my-email

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb email_alias

# Run schema
psql email_alias < src/database/schema.sql
```

### 3. Environment Configuration

```bash
# Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env

# Edit .env with your configuration
nano .env
```

Required environment variables:

```env
# Backend (.env)
DATABASE_URL=postgresql://username:password@localhost:5432/email_alias
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
ALIAS_DOMAIN=alias.yourdomain.com

# Frontend (frontend/.env)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_BASE_URL=http://localhost:3000/api
```

### 4. Run the Application

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Visit `http://localhost:3001` to access the application.

## 🔧 Production Deployment

### Backend Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Deploy to your server** (AWS, Digital Ocean, etc.)

3. **Set up process manager:**
   ```bash
   pm2 start dist/server.js --name "email-alias-api"
   ```

### Frontend Deployment

1. **Build for production:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to static hosting** (Vercel, Netlify, AWS S3, etc.)

### Email Configuration

#### Option 1: AWS SES
- Configure AWS SES for receiving and sending emails
- Set up SNS webhook to `/api/webhooks/ses`
- Configure MX records for your alias domain

#### Option 2: Mailgun
- Set up Mailgun account
- Configure webhook to `/api/webhooks/mailgun`
- Configure MX records

#### Option 3: Custom SMTP
- Use any SMTP provider for sending
- Set up webhook endpoint for receiving emails

### DNS Configuration

```
# MX Record for alias domain
alias.yourdomain.com.    MX    10    mail.yourdomain.com.

# A Record for mail server
mail.yourdomain.com.     A     your.server.ip.address
```

## 📱 Mobile & Browser Extension

### Mobile Optimization
- Responsive design with Tailwind CSS
- Touch-friendly interface
- Safe area support for iOS devices
- PWA-ready (can be installed as app)

### Browser Extension Compatibility
The React frontend can be adapted as a browser extension:

1. **Manifest v3 Setup:**
   ```json
   {
     "manifest_version": 3,
     "name": "Hide My Email",
     "version": "1.0.0",
     "permissions": ["storage", "activeTab"],
     "action": {
       "default_popup": "popup.html"
     }
   }
   ```

2. **Build for extension:**
   ```bash
   # Modify vite.config.ts for extension build
   npm run build
   ```

## 🔒 Security Features

- **OAuth 2.0**: Secure Google authentication
- **JWT Tokens**: Stateless authentication
- **HTTPS Only**: All communications encrypted
- **Input Validation**: Zod schema validation
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Secure cross-origin requests

## 📊 API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user

### Aliases
- `GET /api/aliases` - List user aliases
- `POST /api/aliases` - Create new alias
- `PATCH /api/aliases/:id/status` - Update alias status
- `DELETE /api/aliases/:id` - Delete alias

### Email Logs
- `GET /api/logs/alias/:id` - Get email logs for alias

### Webhooks
- `POST /api/webhooks/inbound` - Generic email webhook
- `POST /api/webhooks/ses` - AWS SES webhook
- `POST /api/webhooks/mailgun` - Mailgun webhook

## 🧪 Development

### Running Tests
```bash
npm run test
npm run test:coverage
```

### Code Quality
```bash
npm run lint
npm run typecheck
```

### Database Migrations
```bash
# Add new migration
npm run migrate:create migration_name

# Run migrations
npm run migrate:up
```

## 🔧 Configuration Options

### Email Providers

**AWS SES (Recommended for scale):**
- Reliable delivery
- Built-in bounce/complaint handling
- Cost-effective for high volume

**Mailgun:**
- Easy setup
- Good for medium volume
- Excellent API

**Custom SMTP:**
- Maximum control
- Good for small volume
- Any provider support

## 🚨 Troubleshooting

### Common Issues

1. **Emails not forwarding:**
   - Check MX records configuration
   - Verify webhook endpoints are accessible
   - Check email service credentials

2. **Google OAuth errors:**
   - Verify client ID configuration
   - Check authorized domains
   - Ensure HTTPS in production

3. **Database connection issues:**
   - Check PostgreSQL is running
   - Verify connection string
   - Check firewall settings

### Debug Mode
```bash
NODE_ENV=development npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Apple's Hide My Email feature
- Built with modern web technologies
- Community feedback and contributions

---

**Privacy Notice:** This service processes email addresses for the sole purpose of forwarding. No email content is stored or analyzed. Users maintain full control over their aliases and can delete them at any time.