# ConnectJob - Product Requirements Document

## Project Overview
ConnectJob is a job marketplace platform connecting workers with employers in Romania. The app provides job listings, real-time messaging, payment processing, KYC verification, and contract management.

**Tech Stack:**
- Frontend: React 19, React Router v7, Socket.io-client, Leaflet maps, i18next (11 languages)
- Backend: Express.js, MongoDB/Mongoose, Socket.io, Stripe, Twilio, JWT auth

## What's Been Implemented

### Phase 1-3: Security, Backend, UI/UX (ALL COMPLETED)

### Phase 4: App.js Refactoring (COMPLETED)
- 4367 lines → 356 lines (92% reduction)

### Phase 5: Production Configuration (COMPLETED)
- Strong JWT secret, VAPID keys, `/api/config/status`, Admin Config Panel

### Phase 6: Bug Fixes (COMPLETED - April 2026)
- Fixed: Chat page voice languages — expanded from 4 to all 11 supported languages
- Fixed: Mobile "Listări recente" layout — right column no longer cut off on mobile
- Fixed: App.css import missing from App.js — media queries now work correctly

## Production Status (3/6 → needs user keys for 6/6)
- ✅ Database, JWT, Push Notifications
- ⚡ Stripe (simulated), ❌ Email (inactive), 🟡 Cloudinary (local)

## Prioritized Backlog

### P1
- [ ] Google OAuth Integration (Emergent-managed)
- [ ] Configure real Stripe/Email/Cloudinary keys (user provides)

### P2
- [ ] Password reset flow
- [ ] Email verification on registration
- [ ] Profile image uploads

### P3
- [ ] PDF contract generation
- [ ] Job bookmarks/favorites
