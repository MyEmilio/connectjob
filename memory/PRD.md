# ConnectJob - Product Requirements Document

## Project Overview
ConnectJob is a job marketplace platform connecting workers with employers in Romania. The app provides job listings, real-time messaging, payment processing, KYC verification, and contract management.

**Tech Stack:**
- Frontend: React 19, React Router v7, Socket.io-client, Leaflet maps, i18next (11 languages)
- Backend: Express.js, MongoDB/Mongoose, Socket.io, Stripe, Twilio, JWT auth
- Deployment: Vercel (frontend), Railway (backend)

## User Personas

### Workers
- Looking for part-time/full-time jobs
- Need to verify identity (KYC)
- Can apply to jobs, sign contracts, receive payments

### Employers
- Post job listings with location
- Review applications
- Create contracts, make payments

### Admins
- Moderate reports
- Ban/suspend users
- Promote job listings

## Core Requirements (Static)

1. **Authentication**: JWT-based with Google OAuth support
2. **Job Management**: CRUD operations with geo-location
3. **Applications**: Workers apply to jobs, employers review
4. **Messaging**: Real-time chat via Socket.io
5. **Payments**: Stripe integration with escrow
6. **KYC**: Phone verification via Twilio, document upload
7. **Contracts**: Digital signatures from both parties
8. **Reports**: User reporting system with admin moderation
9. **Reviews**: Rating system (1-5 stars)

---

## What's Been Implemented

### January 2026 - Production Readiness Update

#### Phase 1: Critical Security Fixes (COMPLETED)
- Environment Files Security (.gitignore, .env.example)
- Backend Security Hardening (helmet, express-validator, rate limiting, CORS, Winston logging)
- Input Validation (all routes)

#### Phase 2: Backend Improvements (COMPLETED)
- Stripe Webhook Handling
- Cloudinary Integration
- Database Indexes
- Email Notifications (Gmail SMTP)
- Health Check Improvements

### April 2026 - UI/UX Improvements (ALL COMPLETED)
- Quick Actions on Homepage
- Mobile Responsive Design
- Push Notifications System
- Favorite Categories System
- Dashboard Statistici (Chart.js)
- PWA Imbunatatit
- Cautare Avansata
- Integrare Stripe Completa
- Map Clustering & Filtrare Geografica

### April 2026 - App.js Refactoring (COMPLETED)
- **Refactored App.js from 4367 lines to 356 lines (92% reduction)**
- Extracted all page components into separate files under `/pages/`
- Created shared components in `/components/shared.js`
- Created theme tokens in `/constants/theme.js`
- All 15 page navigation tests PASSED
- All 9 backend API tests PASSED

## Code Architecture (Post-Refactoring)
```
/app/frontend/src/
├── App.js                    # 356 lines - Layout shell + Router only
├── constants/theme.js        # Design tokens (T) + CATEGORIES
├── components/
│   ├── shared.js             # Avatar, Btn, Card, Stars, Badge, Loader, Sparkline, JobCardRow
│   ├── DashboardStats.js
│   ├── AdvancedSearch.js
│   ├── LanguageSwitcher.js
│   ├── PaymentModal.js
│   └── PWAInstallPrompt.js
├── pages/
│   ├── PageHome.js           # Home dashboard + HowItWorks + NotifPrefs
│   ├── PageJobs.js           # Job listings with filters
│   ├── MapPage.js            # Leaflet map with clustering
│   ├── PageChat.js           # Real-time messaging
│   ├── PageEscrow.js         # Stripe escrow flow
│   ├── PageContract.js       # Digital contracts
│   ├── PageVerify.js         # KYC verification
│   ├── PageReviews.js        # Review system
│   ├── PageAnalytics.js      # Analytics dashboard
│   ├── PageAdmin.js          # Admin panel
│   ├── PageCalendar.js       # Schedule management
│   ├── FuelCalculator.js     # Route calculator + Transport schedule
│   ├── Login.js / Register.js
│   ├── PostJobPage.js
│   └── ChatPage.js
├── context/AuthContext.js
├── hooks/
│   ├── usePushNotifications.js
│   └── useNotificationPreferences.js
├── services/
│   ├── api.js
│   └── socket.js
└── i18n/                     # 11 languages
```

---

## Test Results
- **Backend Tests**: 100% passed (9/9) - iteration_3
- **Frontend Tests**: 100% passed (15/15 page navigation and feature tests) - iteration_3

---

## Prioritized Backlog

### P1 - High Priority
- [x] Refactorizare App.js (~4367 linii -> 356 linii) - COMPLETED
- [ ] Thorough Stripe Escrow Flow Testing (end-to-end)
- [ ] Google OAuth Integration (Emergent-managed)

### P2 - Medium Priority
- [ ] Add password reset flow
- [ ] Add email verification on registration
- [ ] Configure real Stripe keys for production
- [ ] Configure real email (Gmail SMTP) for production
- [ ] Add profile image uploads to Cloudinary

### P3 - Nice to Have
- [ ] Add PDF contract generation
- [ ] Add A/B testing framework
- [ ] Add job bookmarks/favorites

---

## Next Tasks
1. Thorough Stripe Escrow Flow Testing
2. Google OAuth Integration
3. Configure production environment variables (Stripe, Email, Cloudinary)
4. Deploy to Railway (backend) and Vercel (frontend)
