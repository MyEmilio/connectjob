# ConnectJob — PRD

## Production Readiness: ~85%

### Ce funcționează (✅)
| Feature | Status | Real/Mock |
|---------|--------|-----------|
| MongoDB Database | ✅ | REAL |
| JWT Auth (login/register) | ✅ | REAL |
| Google OAuth (Emergent Auth) | ✅ | REAL |
| Email Verification | ✅ | REAL (Gmail SMTP) |
| Password Reset | ✅ | REAL (Gmail SMTP) |
| Email Notificări (aplicare, acceptare, plată) | ✅ | REAL |
| Zod Input Validation | ✅ | REAL |
| Push Notifications (VAPID) | ✅ | REAL |
| Auto-translate Chat (GPT-4o-mini) | ✅ | REAL |
| Job CRUD + Geo search | ✅ | REAL |
| Map Clustering | ✅ | REAL |
| Contracts | ✅ | REAL |
| Reviews | ✅ | REAL |
| Reports + Admin | ✅ | REAL |
| Mobile-first responsive | ✅ | REAL |
| i18n (11 limbi) | ✅ | REAL |
| Comision 3% | ✅ | REAL |

### Ce necesită chei externe (⚡)
| Feature | Status | Ce trebuie |
|---------|--------|-----------|
| Stripe Payments | ⚡ Simulat | sk_test_... + pk_test_... |
| Cloudinary Uploads | 🟡 Local | CLOUDINARY_* keys |

### Backlog (P2-P3)
- [ ] Profile image uploads
- [ ] PDF contract generation
- [ ] Job bookmarks
