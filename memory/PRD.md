# ConnectJob — PRD

## Original Problem Statement
ConnectJob is a full-stack job marketplace connecting workers with employers in Romania. Features multi-language chat with AI translation, Google OAuth, real email notifications, subscription monetization (Free/Pro/Premium), Stripe Connect for payments, chat anti-evasion moderation, 7-day free Pro trial, and Cloudinary image uploads.

## Production Readiness: ~95%

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
| i18n (11 limbi, default: ro) | Done | REAL |
| Subscription Plans (Free/Pro/Premium) | Done | SIMULATED |
| Stripe Connect 3% Commission | Done | SIMULATED |
| Chat Anti-Evasion Moderation | Done | REAL |
| Pricing Page UI | Done | REAL |
| 7-Day Pro Trial (auto at register) | Done | REAL |
| Trial for Existing Users | Done | REAL |
| Trial Auto-Downgrade | Done | REAL |
| Cloudinary Cloud Uploads | Done | REAL |
| Deployment Configs (Railway+Vercel) | Done | READY |
| Language Fix (Romanian default) | Done | REAL |

### External Keys Needed
| Feature | Status | What's Needed |
|---------|--------|---------------|
| Stripe Payments | Simulated | Real sk_test + pk_test keys |

### Backlog
- [ ] Deploy to Railway (backend) + Vercel (frontend) — GUIDE READY
- [ ] Stripe real keys integration
- [ ] PDF contract generation
- [ ] Job bookmarks
- [ ] Daily email digest for workers
- [ ] Profile image uploads via Cloudinary

## Tech Stack
- Frontend: React 19, i18next, Socket.io-client, Axios
- Backend: Node.js/Express, Mongoose, Zod, Stripe, Socket.io
- Database: MongoDB
- Auth: JWT + Emergent Google OAuth
- LLM: GPT-4o-mini via Emergent LLM Key
- Email: Nodemailer (Gmail SMTP)
- Images: Cloudinary
- Deploy: Railway (backend) + Vercel (frontend)
