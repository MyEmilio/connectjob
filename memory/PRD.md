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
| Language Fix (Spanish default, no RO leak) | Done | REAL |
| Mobile Map Split Layout (45/55 split) | Done 2026-02 | REAL |
| Map Mode Toggle (Jobs/Workers) | Done 2026-02 | REAL |
| Worker Pins on Map (green, initials) | Done 2026-02 | REAL + DEMO fallback |
| Privacy Offset ±300m on Pins | Done 2026-02 | REAL |
| Click Pin → Job first in list + actions | Done 2026-02 | REAL |
| Sort: Distance / Price asc / Price desc | Done 2026-02 | REAL |
| OpenAI Whisper STT in Chat | Done 2026-02 | REAL (Emergent Key) |
| Mobile padding fix (480px) | Done 2026-02 | REAL |
| Escrow banner: compact + dismissible + i18n | Done 2026-02 | REAL |
| home_search_placeholder + home_my_location_btn i18n | Done 2026-02 | REAL |
| Fixed duplicate "anuncios anuncios" in jobs counter | Done 2026-02 | REAL |
| Stripe webhook fix (raw body before express.json) | Done 2026-02 | REAL |
| Payment release status update fix (lean+id virtual) | Done 2026-02 | REAL |
| **MVP-Focus refactor**: hidden Analytics/Calendar/Contracts/Reviews/Admin via feature flag | Done 2026-02 | REAL |
| **Sober UI Phase 1**: stripped emojis from navbar, bottom-nav, login button, sidebar widgets | Done 2026-02 | REAL |
| **Removed mock "Activity recent" widget** (fake "Profilul vizualizat de 12 ori") | Done 2026-02 | REAL |
| **Cleaned 167 emoji-prefixed translation keys** across 11 locales | Done 2026-02 | REAL |
| Inline SVG icon component (`/components/Icon.js`) replacing emojis in critical UI | Done 2026-02 | REAL |
| **Tier system (Founder/Early Adopter/Standard)** + signup_order auto-increment | Done 2026-02 | REAL |
| **Dynamic commission rate** (0% Founder / 3% EA / 3-5-7% Standard by plan) | Done 2026-02 | REAL |
| **Founder 3-post limit** enforced on POST /api/jobs | Done 2026-02 | REAL |
| `/api/stats/founders-count` (public FOMO) + `/api/stats/my-tier` (auth) | Done 2026-02 | REAL |
| Founder FOMO banner on Home (verde, click → Pricing) | Done 2026-02 | REAL |
| Pricing page commission badge (Comisión: 7%/5%/3%) | Done 2026-02 | REAL |
| Backfill migration: signup_order set for 27 existing users | Done 2026-02 | REAL |
| **Currency RON → EUR** (Stripe code + UI labels + i18n + email/push) | Done 2026-02 | REAL |
| **FOMO banner v2**: shows founders + EA spots, switches color when founders full | Done 2026-02 | REAL |
| **Phase 3 — Design Refresh**: CSS variables, Inter font, slate palette, lighter shadows | Done 2026-02 | REAL |
| **Phase 4 — Home Hero redesign**: 2 big CTAs (Caut job / Postez job) + secondary as text-links | Done 2026-02 | REAL |
| **Phase 5 — Categories reordered**: Digital/IT first, then quick local jobs; "gradina" hidden (recurring service bleed) | Done 2026-02 | REAL |

### External Keys Needed
| Feature | Status | What's Needed |
|---------|--------|---------------|
| Stripe Payments | Simulated | Real sk_test + pk_test keys |

### Backlog
- [ ] Stripe real keys integration (P1)
- [ ] PDF contract generation (P1)
- [ ] In-app notification bell icon + sounds (P1, from review variant 1)
- [ ] Public profile pages (worker/employer) (P1, from review variant 2)
- [ ] Worker location form in ProviderProfile (so real workers appear on map) (P1)
- [ ] Job status machine (Draft/Published/In discussion/.../Finished) with visible chip (P2, from review variant 2)
- [ ] Matching recommendations (skills-based) (P2)
- [ ] Gamification badges (Top Worker, 10 jobs, etc.) (P2)
- [ ] Job bookmarks (P2)
- [ ] Daily email digest for workers (P2)
- [ ] Profile image uploads via Cloudinary (P2)
- [ ] Refactor MapPage into sub-components (~500 lines now) (P3)

## Tech Stack
- Frontend: React 19, i18next, Socket.io-client, Axios
- Backend: Node.js/Express, Mongoose, Zod, Stripe, Socket.io
- Database: MongoDB
- Auth: JWT + Emergent Google OAuth
- LLM: GPT-4o-mini via Emergent LLM Key
- Email: Nodemailer (Gmail SMTP)
- Images: Cloudinary
- Deploy: Railway (backend) + Vercel (frontend)
