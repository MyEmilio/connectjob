# ConnectJob - PRD

## Tech Stack
- Frontend: React 19, React Router v7, Socket.io, Leaflet, i18next (11 limbi)
- Backend: Express.js, MongoDB/Mongoose, Socket.io, Stripe, Zod, GPT-4o-mini
- Auth: JWT + Google OAuth (Emergent Auth) + Email verification + Password reset
- Commission: 3% per contract

## Completed Phases

### Phase 1-3: Security, Backend, UI/UX (ALL DONE)
### Phase 4: App.js Refactoring (DONE) — 4367→356 lines
### Phase 5: Production Config (DONE) — VAPID, JWT, config panel
### Phase 6: Features (DONE) — Auto-translate, contextual route calc, resize windows, 3% commission, mobile-first
### Phase 7: Google OAuth (DONE) — Emergent Auth, buttons on Login/Register
### Phase 8: Production Readiness (DONE - April 2026)
- **lowdb completely removed** — 100% MongoDB
- **Zod validation** on all auth routes + payments + translate (23 tests passed)
- **Email verification** flow: register → verify token → activate
- **Password reset** flow: forgot → email with link → reset → login
- **Token model** with TTL auto-expiry
- Frontend pages: VerifyEmail, ForgotPassword, ResetPassword
- "Am uitat parola" link on Login

## Production Status (4/7)
- ✅ Database (MongoDB), JWT, Push (VAPID), Translation (GPT-4o-mini), Google OAuth
- ⚡ Stripe (simulated), ❌ Email (console only), 🟡 Cloudinary (local)

## Backlog
### P1
- [ ] Configure real Stripe keys
- [ ] Configure Gmail SMTP (limeuragod@gmail.com + App Password)
- [ ] Deploy to Railway + Vercel
### P2
- [ ] Profile image uploads (Cloudinary)
- [ ] PDF contracts
### P3
- [ ] Job bookmarks, A/B testing
