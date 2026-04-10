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

1. **Environment Files Security**
   - ✅ Updated `.gitignore` to exclude `backend/.env` and `frontend/.env`
   - ✅ Created `backend/.env.example` with all required keys
   - ✅ Created `frontend/.env.example` with all required keys
   - ✅ Added security warning in README.md

2. **Backend Security Hardening**
   - ✅ Added `helmet` package for HTTP security headers
   - ✅ Added `express-validator` for input validation
   - ✅ Set body size limits: `express.json({ limit: '10mb' })`
   - ✅ Expanded rate limiting to ALL routes (100 req/15min general, 20 req/15min auth)
   - ✅ Fixed CORS to support Emergent preview domains (regex patterns)
   - ✅ Added `trust proxy` and `xForwardedForHeader: false` for proxy support
   - ✅ Replaced all `console.log` with Winston structured logging

3. **Structured Logging**
   - ✅ Installed `winston` and `winston-daily-rotate-file`
   - ✅ Created `/app/backend/utils/logger.js`
   - ✅ JSON format in production, pretty-print in development
   - ✅ Log rotation: daily files, 14 day retention, gzip compression

4. **Input Validation (all routes)**
   - ✅ `auth.js`: email format, password min 8 chars, name max 100 chars
   - ✅ `jobs.js`: title/description length, category, salary range (0-1M)
   - ✅ `messages.js`: message content max 2000 chars
   - ✅ `reviews.js`: rating 1-5, comment max 500 chars
   - ✅ `reports.js`: reason enum, details max 1000 chars
   - ✅ `payments.js`: job_id, amount validation
   - ✅ `kyc.js`: phone format, OTP code format
   - ✅ `contracts.js`: MongoDB ID validation, signature format

#### Phase 2: Backend Improvements (COMPLETED)

1. **Stripe Webhook Handling**
   - ✅ Added `POST /api/payments/webhook` endpoint
   - ✅ Handles: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`
   - ✅ Uses `express.raw()` middleware for signature verification
   - ✅ Updates Payment model status based on webhook events
   - ✅ Logs all webhook events

2. **Cloudinary Integration**
   - ✅ Installed `cloudinary` and `multer-storage-cloudinary`
   - ✅ Created `/app/backend/utils/cloudinary.js`
   - ✅ Updated `/app/backend/routes/kyc.js` to use Cloudinary
   - ✅ Falls back to local storage if Cloudinary not configured
   - ✅ Added env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

3. **Database Indexes**
   - ✅ `Job`: compound indexes for status/category/createdAt queries
   - ✅ `Job`: lat/lng index for geo queries
   - ✅ `Message`: conversation_id + createdAt compound index
   - ✅ `Application`: unique compound index (job_id + worker_id)
   - ✅ Added field validation to all Mongoose schemas

4. **Email Notifications (Gmail SMTP)**
   - ✅ Installed `nodemailer`
   - ✅ Created `/app/backend/utils/emailService.js`
   - ✅ Email templates for:
     - New job application (notify employer)
     - Application accepted/rejected (notify worker)
     - Contract signed by both parties
     - Payment released (notify worker)
     - Payment disputed (notify both)
   - ✅ Added env vars: `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`

5. **Health Check Improvements**
   - ✅ `GET /api/health` now returns:
     ```json
     {
       "status": "ok|degraded",
       "timestamp": "ISO date",
       "version": "1.0.0",
       "database": "connected|connecting|disconnected",
       "uptime": 12345
     }
     ```

### April 2026 - UI/UX Improvements

1. **Quick Actions on Homepage**
   - ✅ Added "Calculator Rută" (Fuel Calculator) button on main page
   - ✅ Added "Program Transport" (Transport Schedule) button on main page
   - ✅ Buttons are large, colorful, and easy to tap
   - ✅ Located in new "Acțiuni rapide" (Quick Actions) section

2. **Mobile Responsive Design**
   - ✅ Added CSS media queries for mobile (max-width: 768px)
   - ✅ Quick action buttons stack vertically on mobile
   - ✅ Hero section adapts to smaller screens
   - ✅ Bottom navigation bar visible on mobile
   - ✅ Sidebar hidden on mobile devices
   - ✅ Categories grid adapts to screen size

3. **Push Notifications System**
   - ✅ Installed `web-push` package for backend
   - ✅ Created `/app/backend/utils/pushService.js` with VAPID support
   - ✅ Created `/app/backend/routes/notifications.js` for subscription API
   - ✅ Created `/app/frontend/public/sw.js` Service Worker
   - ✅ Created `/app/frontend/src/hooks/usePushNotifications.js` React hook
   - ✅ Added notification toggle button on homepage
   - ✅ Notifications triggered for:
     - New job application (notify employer)
     - Application accepted/rejected (notify worker)
     - New message received (notify recipient)
     - Contract signed by both parties
     - Payment released
     - **NEW: Job posted in favorite category (notify subscribed users)**

4. **Favorite Categories System**
   - ✅ Added `favorite_categories` field to User model (max 10)
   - ✅ Added notification preferences fields: `notify_new_jobs`, `notify_messages`, `notify_applications`
   - ✅ Created `/app/frontend/src/hooks/useNotificationPreferences.js` hook
   - ✅ Created NotificationPreferencesModal component with:
     - Toggle switches for notification types
     - Grid of categories to select favorites
     - Persistent storage in MongoDB
   - ✅ API endpoints:
     - `GET /api/notifications/preferences` - get user preferences
     - `PUT /api/notifications/preferences` - update preferences
     - `POST /api/notifications/favorite-category` - add favorite
     - `DELETE /api/notifications/favorite-category/:category` - remove favorite
   - ✅ When new job is created, all users with that category in favorites get notified

5. **Dashboard Statistici**
   - ✅ Created `/app/backend/routes/stats.js` with dashboard API
   - ✅ Created `/app/frontend/src/components/DashboardStats.js` with Chart.js
   - ✅ Statistics include:
     - Overview cards (jobs posted, applications sent/received, conversations, contracts, rating)
     - Financial summary (total earned, pending, paid, commissions)
     - Applications chart (last 7 days) - Bar chart
     - Earnings chart (last 6 months) - Line chart
     - Applications status doughnut chart
     - Recent activity summary

6. **PWA Îmbunătățit**
   - ✅ Enhanced `/app/frontend/public/sw.js` with:
     - Static asset caching
     - API caching with 5-minute TTL
     - Network-first strategy for API
     - Cache-first strategy for static files
     - Offline fallback support
     - Background sync ready
   - ✅ Created `/app/frontend/src/components/PWAInstallPrompt.js`:
     - Improved install prompt UI
     - iOS instructions modal
     - beforeinstallprompt event handling

7. **Căutare Avansată**
   - ✅ Created `/app/frontend/src/components/AdvancedSearch.js`:
     - Category filter with visual grid
     - Job type filter (Part-time / Full-time)
     - Salary range inputs (min/max)
     - Distance slider (5-100 km)
     - Toggle options (urgent jobs, verified employers)
     - Sort options (newest, salary high/low, distance)
     - Reset and Apply buttons

8. **Integrare Stripe Completă**
   - ✅ Enhanced `/app/backend/routes/payments.js`:
     - `GET /api/payments/:id/status` - payment status polling
     - `GET /api/payments/stripe-config` - frontend config
     - Full escrow flow with manual capture
     - Webhook handling for payment events
   - ✅ Created `/app/frontend/src/components/PaymentModal.js`:
     - Payment form with amount input
     - Commission calculation (5%)
     - Status polling mechanism
     - Escrow confirmation UI
     - Demo mode warning when Stripe not configured

9. **Map Clustering & Filtrare Geografică** (April 2026)
   - ✅ Installed `react-leaflet-cluster` for marker clustering with react-leaflet v5
   - ✅ Updated `/app/frontend/src/pages/MapPage.js`:
     - MarkerClusterGroup wraps all job markers
     - Custom cluster icons color-coded by count (green 1-4, purple 5-9, blue 10-19, amber 20+)
     - `chunkedLoading` for performance with many markers
     - `spiderfyOnMaxZoom` and `zoomToBoundsOnClick` for UX
   - ✅ Added geographical radius filter (5/10/25/50/100 km) visible after geolocation
   - ✅ Added Circle overlay showing search radius on map
   - ✅ Added FlyToJob component to animate to selected job
   - ✅ Added cluster legend in bottom-left corner
   - ✅ Job count badge in sidebar header
   - ✅ Close button on job detail panel
   - ✅ All interactive elements have `data-testid` attributes

---

## Test Results

- **Backend Tests**: 100% passed (14/14) - iteration_2
  - All jobs API endpoints with geo filtering
  - Stripe simulated payment flow
  - Stats dashboard API
  - Auth endpoints
  - Health check
- **Frontend Tests**: 100% passed
  - Map page with Leaflet clustering
  - Category filter chips
  - Job detail panel
  - Escrow flow
  - Dashboard Stats
  - PWA Install Prompt

---

## Prioritized Backlog

### P1 - High Priority
- [ ] Refactorizare `App.js` (~4300 linii) - separare în componente individuale
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

1. Refactorizare App.js - extract page components into separate files
2. Google OAuth Integration
3. Configure production environment variables (Stripe, Email, Cloudinary)
4. Deploy to Railway (backend) and Vercel (frontend)
