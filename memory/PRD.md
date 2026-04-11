# ConnectJob — PRD

## Original Problem Statement
ConnectJob is a full-stack job marketplace application connecting workers with employers in Romania. The app supports multi-language chat with AI translation, Google OAuth, real email notifications, subscription-based monetization, and Stripe Connect for payment processing.

## Core Requirements
- Job listing/search marketplace with map integration
- Real-time chat with auto-translation (11 languages)
- Secure payments via Stripe (escrow model + 3% commission)
- Subscription plans (Free/Pro/Premium) for monetization
- Chat anti-evasion moderation (blocks contact info sharing)
- Google OAuth + email/password authentication
- Email notifications (verification, password reset, job applications)
- Admin dashboard with moderation tools
- Mobile-responsive PWA

## Production Readiness: ~90%

### What Works (Done)
| Feature | Status | Real/Mock |
|---------|--------|-----------|
| MongoDB Database | Done | REAL |
| JWT Auth (login/register) | Done | REAL |
| Google OAuth (Emergent Auth) | Done | REAL |
| Email Verification | Done | REAL (Gmail SMTP) |
| Password Reset | Done | REAL (Gmail SMTP) |
| Email Notifications | Done | REAL |
| Zod Input Validation | Done | REAL |
| Push Notifications (VAPID) | Done | REAL |
| Auto-translate Chat (GPT-4o-mini) | Done | REAL |
| Job CRUD + Geo search | Done | REAL |
| Map Clustering | Done | REAL |
| Contracts | Done | REAL |
| Reviews | Done | REAL |
| Reports + Admin | Done | REAL |
| Mobile-first responsive | Done | REAL |
| i18n (11 limbi) | Done | REAL |
| Subscription Plans (Free/Pro/Premium) | Done | SIMULATED (needs real Stripe key) |
| Stripe Connect 3% Commission | Done | SIMULATED |
| Chat Anti-Evasion Moderation | Done | REAL |
| Pricing Page UI | Done | REAL |

### External Keys Needed
| Feature | Status | What's Needed |
|---------|--------|---------------|
| Stripe Payments | Simulated | Real sk_test_... + pk_test_... keys |
| Cloudinary Uploads | Local | CLOUDINARY_* keys |

### Backlog (P2-P3)
- [ ] Profile image uploads (needs Cloudinary)
- [ ] PDF contract generation
- [ ] Job bookmarks
- [ ] Daily email digest for workers
- [ ] Deploy to Railway (backend) + Vercel (frontend)

## Tech Stack
- Frontend: React 19, i18next, Socket.io-client, Axios
- Backend: Node.js/Express, Mongoose, Zod, Stripe, Socket.io
- Database: MongoDB
- Auth: JWT + Emergent Google OAuth
- LLM: GPT-4o-mini via Emergent LLM Key (chat translation)
- Email: Nodemailer (Gmail SMTP)

## Architecture
```
/app
├── backend/
│   ├── server.js               (Express + Socket.io)
│   ├── routes/                 (auth, jobs, payments, subscriptions, messages, etc.)
│   ├── models/                 (User, Job, Subscription, PaymentTransaction, etc.)
│   ├── utils/                  (chatModerationService, emailService, translationService, validation)
│   └── middleware/             (auth)
├── frontend/
│   ├── src/
│   │   ├── App.js              (Router + Layout shell)
│   │   ├── pages/              (PagePricing, PageChat, MapPage, etc.)
│   │   ├── context/            (AuthContext)
│   │   ├── services/           (api, socket)
│   │   └── components/         (shared, ui)
└── memory/                     (PRD, test credentials)
```

## Key DB Models
- `User`: name, email, role, subscription_plan (free/pro/premium), stripe_connect_account_id
- `Job`: title, description, category, salary, location, status
- `Subscription`: user_id, plan, status, checkout_session_id, period dates
- `PaymentTransaction`: session_id, user_id, type, amount, payment_status
- `ProviderProfile`: user_id, stripe_connect_account_id, business details
- `Conversation`, `Message`, `Review`, `Contract`, `Payment`, `Token`

## Key API Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/auth/google/session` (Emergent OAuth)
- `GET /api/subscriptions/plans`, `GET /api/subscriptions/my`
- `POST /api/subscriptions/checkout`, `POST /api/subscriptions/cancel`
- `POST /api/subscriptions/connect/onboard`, `GET /api/subscriptions/connect/status`
- `GET /api/subscriptions/checkout/status/:sessionId`
- `POST /api/messages/conversations/:id/send` (with chat moderation)
- `POST /api/payments/create-intent` (with Stripe Connect 3% fee)
- `POST /api/translate/batch`
