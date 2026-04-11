# ConnectJob — PRD

## Original Problem Statement
ConnectJob is a full-stack job marketplace connecting workers with employers in Romania. Features multi-language chat with AI translation, Google OAuth, real email notifications, subscription monetization (Free/Pro/Premium), Stripe Connect for payments, chat anti-evasion moderation, and 7-day free Pro trial.

## Production Readiness: ~92%

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
| Subscription Plans (Free/Pro/Premium) | Done | SIMULATED |
| Stripe Connect 3% Commission | Done | SIMULATED |
| Chat Anti-Evasion Moderation | Done | REAL |
| Pricing Page UI | Done | REAL |
| 7-Day Pro Trial (auto at register) | Done | REAL |
| Trial Start for Existing Users | Done | REAL |
| Trial Auto-Downgrade | Done | REAL |
| Deployment Configs (Railway + Vercel) | Done | READY |

### External Keys Needed
| Feature | Status | What's Needed |
|---------|--------|---------------|
| Stripe Payments | Simulated | Real sk_test + pk_test keys |
| Cloudinary Uploads | Partial | API Secret missing |

### Backlog
- [ ] Cloudinary API Secret (waiting from user)
- [ ] Deploy to Railway + Vercel (configs ready, need GitHub push)
- [ ] PDF contract generation
- [ ] Job bookmarks
- [ ] Daily email digest for workers

## Tech Stack
- Frontend: React 19, i18next, Socket.io-client, Axios
- Backend: Node.js/Express, Mongoose, Zod, Stripe, Socket.io
- Database: MongoDB
- Auth: JWT + Emergent Google OAuth
- LLM: GPT-4o-mini via Emergent LLM Key
- Email: Nodemailer (Gmail SMTP)
- Deploy: Railway (backend) + Vercel (frontend)

## Key Models
- User: name, email, role, subscription_plan, trial_used, trial_expires_at, stripe fields
- Subscription: user_id, plan, status, checkout_session_id, period dates, is_trial
- PaymentTransaction: session_id, user_id, type, amount, payment_status
- ProviderProfile: user_id, stripe_connect_account_id, business details
- Job, Conversation, Message, Review, Contract, Payment, Token

## Key API Endpoints
- Auth: register (auto-trial), login, /me, google/session
- Subscriptions: /plans, /my, /checkout, /cancel, /start-trial, /connect/onboard, /connect/status
- Messages: /conversations/:id/send (with chat moderation)
- Payments: /create-intent (with Stripe Connect 3% fee)
- Translation: /translate/batch
