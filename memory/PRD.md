# ConnectJob - Product Requirements Document

## Project Overview
ConnectJob is a job marketplace platform connecting workers with employers in Romania. Full-stack React 19 + Node.js/Express + MongoDB app with real-time chat, Stripe escrow, map-based job discovery, and auto-translation.

## Core Architecture
```
Frontend: React 19, React Router v7, Socket.io, Leaflet maps, i18next (11 langs)
Backend: Express.js, MongoDB/Mongoose, Socket.io, Stripe, GPT-4o-mini translation
Commission: 3% per transaction via Escrow
```

## What's Been Implemented

### Phase 1-3: Security, Backend, UI/UX (ALL COMPLETED)
### Phase 4: App.js Refactoring (COMPLETED) — 4367→356 lines
### Phase 5: Production Configuration (COMPLETED) — VAPID, JWT, config panel
### Phase 6: Major Features (COMPLETED - April 2026)
- **Auto-translate chat** (GPT-4o-mini via Emergent proxy, 11 languages)
- **Contextual Calculator Ruta + Transport** (only in MapPage on job select)
- **Resizable windows** (Chat minimize/expand, Map compact/normal/full)
- **3% commission** model (from 5%)
- **Mobile-first responsive** (sidebars hidden, bottom nav, single-column)

## Production Status (4/7 services)
- ✅ Database, JWT, Push (VAPID), Translation (GPT-4o-mini)
- ⚡ Stripe (simulated), ❌ Email (inactive), 🟡 Cloudinary (local)

## Prioritized Backlog
### P1
- [ ] Google OAuth (Emergent-managed)
- [ ] Real Stripe/Email/Cloudinary keys
### P2
- [ ] Password reset, Email verification, Profile images
### P3
- [ ] PDF contracts, Job bookmarks
