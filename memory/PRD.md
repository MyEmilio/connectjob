# ConnectJob - Product Requirements Document

## Project Overview
ConnectJob — marketplace de joburi pentru România. React 19 + Node.js/Express + MongoDB.

## What's Been Implemented

### Phase 1-3: Security, Backend, UI/UX (ALL COMPLETED)
### Phase 4: App.js Refactoring (COMPLETED) — 4367→356 lines
### Phase 5: Production Config (COMPLETED) — VAPID, JWT, config panel
### Phase 6: Major Features (COMPLETED)
- Auto-translate chat GPT-4o-mini (11 limbi)
- Contextual Calculator Ruta + Transport (doar pe MapPage la click job)
- Ferestre redimensionabile (Chat min/max, Map compact/normal/full)
- Comision 3% din contract
- Mobile-first responsive

### Phase 7: Google OAuth (COMPLETED - April 2026)
- Emergent-managed Google Auth integration
- Buton "Continuă cu Google" pe Login + Register
- AuthCallback component pentru session_id exchange
- Backend POST /api/auth/google/session verifică cu Emergent Auth API
- User creat/actualizat automat la prima autentificare Google
- Texte traduse în toate cele 11 limbi

## Production Status (4/7 services)
- ✅ Database, JWT, Push (VAPID), Translation (GPT-4o-mini)
- ✅ Google OAuth (Emergent Auth)
- ⚡ Stripe (simulated), ❌ Email (inactive), 🟡 Cloudinary (local)

## Prioritized Backlog
### P1
- [ ] Real Stripe/Email/Cloudinary keys (user provides)
### P2
- [ ] Password reset flow
- [ ] Email verification on registration
- [ ] Profile image uploads
### P3
- [ ] PDF contracts, Job bookmarks
