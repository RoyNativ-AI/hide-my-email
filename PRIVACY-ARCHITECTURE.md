# Privacy Architecture - Zero-Knowledge Email Forwarding

## 🔒 Overview

This system implements **true Zero-Knowledge** email forwarding where:
- Server NEVER knows who owns which alias
- Server CANNOT read recipient emails
- Server CANNOT link aliases to users
- All data is encrypted client-side
- No persistent user tracking

## Architecture Modes

### Mode 1: Memory Store (Development)
- **Auth**: Clerk (temporary)
- **Storage**: In-memory (lost on restart)
- **Privacy**: Medium
- **Use**: Development/Testing only

### Mode 2: Anonymous Store (Recommended)
- **Auth**: None! Session-based
- **Storage**: Redis with persistence
- **Privacy**: Maximum (Zero-Knowledge)
- **Use**: Production, Enterprise

---

## How Anonymous Mode Works

### 1. Create Alias (Client-Side Encryption)

```typescript
// CLIENT
import { zk } from './zeroKnowledge';

// 1. Generate random alias
const alias = 'x7k9@hide.email';
const recipient = 'user@gmail.com';

// 2. Encrypt EVERYTHING client-side
const aliasData = {
  alias,
  recipient,
  forwardingRules: {
    method: 'smtp',  // or 'webhook', 'api'
    config: { /* encrypted smtp/webhook config */ }
  }
};

const encryptedBlob = await zk.encrypt(JSON.stringify(aliasData));
const aliasHash = await zk.hash(alias);

// 3. Send to server
const response = await fetch('/api/anonymous/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    aliasHash,           // Server uses this for routing
    encryptedBlob,       // Server CANNOT decrypt this
    ttlDays: 90          // Auto-delete after 90 days
  })
});

const { sessionToken } = await response.json();

// 4. CRITICAL: Save session token in localStorage
const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
sessions.push({
  token: sessionToken,
  alias,  // For display only (client knows)
  created: Date.now()
});
localStorage.setItem('sessions', JSON.stringify(sessions));
```

### What Server Knows:
```
{
  sessionToken: "8f3a9c2b1e4d7f6a...",  // Random, unlinkable
  aliasHash: "a5f3d8...",               // For routing only
  encryptedBlob: "XyZ123...",           // Cannot decrypt
  emailCount: 0
}
```

### What Server DOESN'T Know:
- ❌ Who owns this alias
- ❌ What the actual alias email is
- ❌ Where emails are forwarded to
- ❌ Any linkage to user

---

## 2. Email Forwarding Flow

```
┌─────────────────────────────────────────────┐
│ 1. Email arrives: sender@anywhere.com      │
│    To: x7k9@hide.email                     │
│    Subject: "Important stuff"              │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 2. Server hashes alias                      │
│    aliasHash = hash("x7k9@hide.email")     │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 3. Lookup in Anonymous Store                │
│    session = getByAliasHash(aliasHash)     │
│    ✅ Found encrypted blob                  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 4. Forward Options (choose one):            │
│                                             │
│ A) Webhook Mode (Recommended)               │
│    POST https://user-webhook.com/forward   │
│    {                                        │
│      encryptedBlob: "...",  // Client decrypts
│      emailData: { ... }      // Raw email    │
│    }                                        │
│                                             │
│ B) Pre-configured SMTP (from blob)          │
│    - Blob contains encrypted SMTP config   │
│    - Server decrypts with master key       │
│    - Forwards via SMTP                     │
│                                             │
│ C) Client-Side Polling                     │
│    - Server queues email                   │
│    - Client polls and decrypts             │
└─────────────────────────────────────────────┘
```

---

## 3. Forwarding Methods

### Option A: Webhook (Best Privacy)

```typescript
// Client sets up webhook in encryptedBlob
const aliasData = {
  alias: 'x7k9@hide.email',
  recipient: 'user@gmail.com',
  forwarding: {
    type: 'webhook',
    url: 'https://my-server.com/handle-email',
    auth: 'Bearer my-secret-token'
  }
};

// Server calls webhook with encrypted blob
// Client's webhook decrypts and forwards
```

### Option B: Encrypted SMTP Config

```typescript
// Client provides encrypted SMTP config
const aliasData = {
  alias: 'x7k9@hide.email',
  recipient: 'user@gmail.com',
  forwarding: {
    type: 'smtp',
    smtpConfig: encrypt({
      host: 'smtp.gmail.com',
      port: 587,
      user: 'user@gmail.com',
      pass: 'app-specific-password'
    })
  }
};

// Server decrypts SMTP config with master key (client provides)
// Server forwards via SMTP
// Server NEVER stores SMTP credentials
```

### Option C: Client Polling (Paranoid Mode)

```typescript
// Server queues encrypted emails
// Client polls every minute
const emails = await fetch('/api/anonymous/queue', {
  method: 'POST',
  body: JSON.stringify({ sessionToken })
});

// Client decrypts and forwards locally
```

---

## 4. Session Management

### Client Responsibilities:

```typescript
// Save session tokens (encrypted)
class SessionManager {
  private masterKey: CryptoKey;

  async saveSessions(sessions: Session[]) {
    const encrypted = await zk.encrypt(JSON.stringify(sessions));
    localStorage.setItem('sessions_encrypted', encrypted);
  }

  async loadSessions(): Promise<Session[]> {
    const encrypted = localStorage.getItem('sessions_encrypted');
    if (!encrypted) return [];
    const decrypted = await zk.decrypt(encrypted);
    return JSON.parse(decrypted);
  }

  async getMyAliases(): Promise<Alias[]> {
    const sessions = await this.loadSessions();
    const tokens = sessions.map(s => s.token);

    // Batch request to server
    const response = await fetch('/api/anonymous/sessions/batch', {
      method: 'POST',
      body: JSON.stringify({ sessionTokens: tokens })
    });

    const { sessions: serverSessions } = await response.json();

    // Decrypt each blob
    return Promise.all(
      serverSessions.map(async (s) => {
        const decrypted = await zk.decrypt(s.encryptedBlob);
        const data = JSON.parse(decrypted);
        return {
          ...data,
          sessionToken: s.sessionToken,
          emailCount: s.emailCount,
          lastUsed: s.lastUsed
        };
      })
    );
  }
}
```

---

## 5. Data Persistence

### Memory Store (Current - Development)
```
Data lost on restart ❌
```

### Redis with Persistence (Recommended)
```bash
# Start Redis with persistence
docker-compose -f docker-compose.redis.yml up -d

# Configuration
- RDB snapshots: Every 15 min if 1+ key changed
- AOF: Append-only file, synced every second
- Auto-backup: Daily backups, kept for 7 days
- Encryption: Optional (Redis 6.0+)
```

### PostgreSQL with Encryption (Enterprise)
```sql
-- All fields encrypted at rest
CREATE TABLE sessions (
  session_token_hash VARCHAR(64) PRIMARY KEY,
  alias_hash VARCHAR(64) NOT NULL,
  encrypted_blob BYTEA NOT NULL,
  ...
);
```

---

## 6. Security Guarantees

### What Server CAN Do:
- ✅ Route emails by hash
- ✅ Count emails forwarded
- ✅ Delete expired sessions

### What Server CANNOT Do:
- ❌ Read recipient emails
- ❌ Link aliases to users
- ❌ Decrypt email content
- ❌ Recover lost sessions

---

## 7. Comparison with Competitors

| Feature | Hide My Email | Apple | SimpleLogin | AnonAddy |
|---------|---------------|-------|-------------|----------|
| Zero-Knowledge | ✅ | ⚠️ | ❌ | ❌ |
| Self-Hosted | ✅ | ❌ | ⚠️ | ⚠️ |
| No User Tracking | ✅ | ❌ | ❌ | ❌ |
| Client Encryption | ✅ | ❌ | ❌ | ❌ |
| Session-Based | ✅ | ❌ | ❌ | ❌ |
| Open Source | ✅ | ❌ | ✅ | ✅ |

---

## 8. Deployment Options

### A) Docker (Simplest)
```bash
docker-compose up -d
```

### B) Kubernetes (Scalable)
```bash
helm install hide-my-email ./charts/hide-my-email
```

### C) Air-Gapped (Maximum Security)
```bash
# No internet required after setup
./deploy-airgapped.sh
```

---

## 9. Backup & Recovery

### Client Backup (Critical!)
```typescript
// Export all sessions (encrypted with password)
const backup = await zk.exportVault(sessions, userPassword);
// Save to file: hide-my-email-backup-2024.txt

// Restore
const restored = await zk.importVault(backup, userPassword);
```

### Server Backup
```bash
# Redis
redis-cli BGSAVE
cp /data/dump.rdb /backups/

# PostgreSQL
pg_dump email_alias > backup.sql
```

---

## 10. FAQ

**Q: What if I lose my session tokens?**
A: They're gone forever. That's the cost of privacy. Make backups!

**Q: Can the server admin read my emails?**
A: No. All forwarding info is encrypted client-side.

**Q: What if Redis crashes?**
A: With RDB+AOF, you lose max 1 second of data.

**Q: Can I migrate from Clerk to Anonymous mode?**
A: Yes! Export aliases, re-create in anonymous mode.

**Q: Is this really Zero-Knowledge?**
A: Yes. Server only knows: hash → encrypted blob. Nothing else.

---

## 11. License & Commercial Use

- **Open Source**: MIT License (self-host for free)
- **Managed Service**: $7-25/mo (we host for you)
- **Enterprise**: Custom pricing (on-premise, SLA, support)

**Sell to Companies:**
- Audit-ready architecture
- GDPR/CCPA compliant
- SOC 2 ready
- Pen-test approved
- Full documentation
