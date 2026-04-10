# ConnectJob - Product Requirements Document

## Project Overview
ConnectJob is a job marketplace platform connecting workers with employers in Romania. The app provides job listings, real-time messaging, payment processing, KYC verification, and contract management.

**Tech Stack:**
- Frontend: React 19, React Router v7, Socket.io-client, Leaflet maps, i18next (11 languages)
- Backend: Express.js, MongoDB/Mongoose, Socket.io, Stripe, Twilio, JWT auth
- Deployment: Vercel (frontend), Railway (backend)

## Core Requirements

1. **Authentication**: JWT-based with Google OAuth support
2. **Job Management**: CRUD with geo-location
3. **Applications**: Workers apply, employers review
4. **Messaging**: Real-time chat via Socket.io
5. **Payments**: Stripe escrow with manual capture
6. **KYC**: Phone verification, document upload
7. **Contracts**: Digital signatures
8. **Reports**: User reporting with admin moderation
9. **Reviews**: Rating system (1-5 stars)

---

## What's Been Implemented

### Phase 1: Security (COMPLETED)
- .gitignore, .env.example, helmet, express-validator, rate limiting, CORS, logging

### Phase 2: Backend (COMPLETED)
- Stripe webhooks, Cloudinary, DB indexes, Email service, Health checks

### Phase 3: UI/UX (COMPLETED)
- Quick Actions, Mobile responsive, Push Notifications, Favorites, Dashboard Stats, PWA, Advanced Search, Map Clustering

### Phase 4: App.js Refactoring (COMPLETED - April 2026)
- **4367 lines → 356 lines (92% reduction)**
- All 10 page components extracted to `/pages/`
- Shared components in `/components/shared.js`, theme in `/constants/theme.js`
- All tests passed (15 frontend + 9 backend)

### Phase 5: Production Configuration (COMPLETED - April 2026)
- Strong JWT secret (64 bytes hex)
- Real VAPID keys for push notifications
- `/api/config/status` endpoint - shows all 6 service statuses
- Production Config Panel in Admin page with expand/collapse
- Stripe demo badge on Escrow page
- Production configuration guide (`PRODUCTION_GUIDE.md`)
- All tests passed (18 backend + all frontend)

## Code Architecture
```
/app/frontend/src/
├── App.js                    # 356 lines - Layout shell + Router
├── constants/theme.js        # Design tokens (T) + CATEGORIES
├── components/
│   ├── shared.js             # Avatar, Btn, Card, Stars, Badge, Loader, Sparkline, JobCardRow
│   ├── DashboardStats.js, AdvancedSearch.js, LanguageSwitcher.js
│   ├── PaymentModal.js, PWAInstallPrompt.js
├── pages/
│   ├── PageHome.js, PageJobs.js, MapPage.js
│   ├── PageChat.js, PageEscrow.js, PageContract.js
│   ├── PageVerify.js, PageReviews.js, PageAnalytics.js
│   ├── PageAdmin.js (with ProductionConfigPanel)
│   ├── PageCalendar.js, FuelCalculator.js
│   ├── Login.js, Register.js, PostJobPage.js
├── context/AuthContext.js
├── hooks/, services/, i18n/
```

## Production Status (3/6 → needs user keys for 6/6)
- ✅ Database, JWT, Push Notifications
- ⚡ Stripe (simulated), ❌ Email (inactive), 🟡 Cloudinary (local fallback)

---

## Prioritized Backlog

### P1 - High Priority
- [x] Refactorizare App.js - COMPLETED
- [x] Production Configuration Setup - COMPLETED
- [ ] Google OAuth Integration (Emergent-managed)
- [ ] Configure real Stripe keys (user provides)
- [ ] Configure real Email (user provides)

### P2 - Medium Priority
- [ ] Password reset flow
- [ ] Email verification on registration
- [ ] Profile image uploads (needs Cloudinary)

### P3 - Nice to Have
- [ ] PDF contract generation
- [ ] Job bookmarks/favorites
- [ ] A/B testing framework
