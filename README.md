# Hide My Email

Apple-like disposable email aliases for Gmail. Generate unlimited aliases that forward to your inbox.

## Features

- **Unlimited Aliases** - Create disposable emails on the fly
- **Gmail Integration** - OAuth login, forwards to your Gmail
- **Real-time Control** - Enable/disable aliases instantly
- **Activity Tracking** - View forwarding logs and statistics
- **Cloudflare Email Workers** - Fast, serverless email routing
- **Self-hosted** - Your data stays on your infrastructure

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Node.js    │────▶│  PostgreSQL  │
│   (React)    │     │     API      │     │              │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                   ┌────────▼────────┐
                   │ Cloudflare Email│
                   │    Workers      │
                   └─────────────────┘
```

## Quick Start

```bash
# Clone
git clone https://github.com/RoyNativ-AI/hide-my-email.git
cd hide-my-email

# Install
npm install
cd frontend && npm install && cd ..

# Configure
cp .env.example .env
# Add your credentials (see setup guides)

# Run
docker-compose up -d  # PostgreSQL + Redis
npm run dev           # API + Frontend
```

## Setup Guides

- [Google OAuth Setup](./setup-google-oauth.md)
- [Cloudflare Email Workers](./CLOUDFLARE_SETUP.md)
- [Privacy Architecture](./PRIVACY-ARCHITECTURE.md)

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Redis
- **Email**: Cloudflare Email Workers
- **Auth**: Google OAuth 2.0

## Deployment

```bash
# Docker
docker-compose up -d

# Heroku
git push heroku main
```

## License

MIT (Personal use) | [Commercial License](./LICENSE-COMMERCIAL.md) available
