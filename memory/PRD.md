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

---

## Test Results

- **Backend Tests**: 100% passed (8/8)
  - Health check endpoint
  - Input validation (email format, password length, required fields)
  - Rate limiting on auth routes
  - Stripe webhook endpoint
  - Server startup
  - CORS headers

---

## Prioritized Backlog

### P0 - Critical (Next)
- [ ] Add frontend .env configuration
- [ ] Test full user registration flow
- [ ] Test job posting flow

### P1 - High Priority
- [ ] Add password reset flow
- [ ] Add email verification on registration
- [ ] Add pagination to job listings
- [ ] Add search functionality

### P2 - Medium Priority
- [ ] Add profile image uploads to Cloudinary
- [ ] Add notification preferences
- [ ] Add advanced job filters (salary range, distance)
- [ ] Add job bookmarks/favorites

### P3 - Nice to Have
- [ ] Add push notifications
- [ ] Add PDF contract generation
- [ ] Add analytics dashboard
- [ ] Add A/B testing framework

---

## Next Tasks

1. Configure frontend `.env` file with `REACT_APP_API_URL`
2. Test frontend-backend integration
3. Add user registration/login flow testing
4. Deploy to Railway (backend) and Vercel (frontend)
5. Configure production environment variables

---

## Files Created/Modified

### New Files
- `/app/backend/utils/logger.js` - Winston logging setup
- `/app/backend/utils/validators.js` - Express-validator schemas
- `/app/backend/utils/cloudinary.js` - Cloudinary configuration
- `/app/backend/utils/emailService.js` - Email service with templates
- `/app/backend/.env.example` - Environment template
- `/app/frontend/.env.example` - Environment template

### Modified Files
- `/app/backend/server.js` - Security hardening, logging, rate limiting
- `/app/backend/routes/auth.js` - Input validation
- `/app/backend/routes/jobs.js` - Input validation
- `/app/backend/routes/messages.js` - Input validation
- `/app/backend/routes/reviews.js` - Input validation
- `/app/backend/routes/reports.js` - Input validation
- `/app/backend/routes/payments.js` - Webhook endpoint, email notifications
- `/app/backend/routes/contracts.js` - Input validation, email notifications
- `/app/backend/routes/kyc.js` - Cloudinary integration
- `/app/backend/models/*.js` - Indexes and validation
- `/app/.gitignore` - Exclude .env files
- `/app/README.md` - Updated documentation
