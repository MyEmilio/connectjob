# ConnectJob — Ghid Configurare Producție

## Stare Curentă: 3/6 Servicii Active

| Serviciu | Stare | Ce trebuie făcut |
|----------|-------|-------------------|
| MongoDB | ✅ Active | Configurat |
| JWT | ✅ Secure | Secret puternic generat |
| Push Notifications | ✅ Active | Chei VAPID generate |
| Stripe | ⚡ Simulat | Necesită chei Stripe |
| Email | ❌ Inactiv | Necesită Gmail/SendGrid |
| Cloudinary | 🟡 Local | Necesită cont Cloudinary |

---

## 1. Configurare Stripe (Plăți Escrow)

### Obține cheile:
1. Creează cont la https://dashboard.stripe.com
2. Mergi la **Developers → API Keys**
3. Copiază: **Secret Key** (`sk_test_...`) și **Publishable Key** (`pk_test_...`)
4. Pentru webhooks: **Developers → Webhooks → Add endpoint**
   - URL: `https://YOUR_DOMAIN/api/payments/webhook`
   - Evenimente: `payment_intent.succeeded`, `payment_intent.canceled`
   - Copiază **Signing Secret** (`whsec_...`)

### Adaugă în `/app/backend/.env`:
```
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXX
```

### Testare:
```bash
# Verifică Stripe config
curl https://YOUR_DOMAIN/api/payments/stripe-config
# Ar trebui să returneze: {"configured": true, "publishableKey": "pk_test_..."}
```

---

## 2. Configurare Email (Notificări)

### Opțiunea A: Gmail SMTP
1. Activează 2FA pe contul Google: https://myaccount.google.com/security
2. Generează **App Password**: https://myaccount.google.com/apppasswords
   - Selectează "Mail" → "Other" → "ConnectJob"
3. Copiază parola generată (16 caractere, fără spații)

### Adaugă în `/app/backend/.env`:
```
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=abcdefghijklmnop
EMAIL_FROM=ConnectJob <your.email@gmail.com>
```

### Opțiunea B: SendGrid
1. Creează cont la https://app.sendgrid.com
2. **Settings → API Keys → Create API Key** (Full Access)

### Adaugă în `/app/backend/.env`:
```
SENDGRID_API_KEY=SG.XXXXXXXXXXXXX
EMAIL_FROM=ConnectJob <no-reply@connectjob.ro>
```

---

## 3. Configurare Cloudinary (Upload Fișiere)

### Obține cheile:
1. Creează cont gratuit la https://cloudinary.com
2. Mergi la **Settings → API Keys** (sau Dashboard-ul principal)
3. Copiază: **Cloud Name**, **API Key**, **API Secret**

### Adaugă în `/app/backend/.env`:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=XXXXXXXXXXXXX
```

---

## 4. Fișierul `.env` Complet de Producție

```env
PORT=8001
NODE_ENV=production
LOG_LEVEL=info
MONGO_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/connectjob
JWT_SECRET=<generat_automat_64_bytes>
CLIENT_URL=https://connectjob.ro

# Stripe
STRIPE_SECRET_KEY=sk_live_XXXXX
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXX

# Email
EMAIL_USER=contact@connectjob.ro
EMAIL_PASS=XXXXX
EMAIL_FROM=ConnectJob <contact@connectjob.ro>

# Cloudinary
CLOUDINARY_CLOUD_NAME=connectjob
CLOUDINARY_API_KEY=XXXXX
CLOUDINARY_API_SECRET=XXXXX

# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=<generat_automat>
VAPID_PRIVATE_KEY=<generat_automat>
VAPID_SUBJECT=mailto:contact@connectjob.ro
```

---

## 5. Verificare Configurare

### Din Admin Panel:
Navighează la **Moderare** → Panoul **Configurare Producție** → **▼ Detalii**

### Din API:
```bash
curl https://YOUR_DOMAIN/api/config/status
```

### Rezultat așteptat (toate active):
```json
{
  "production_ready": true,
  "active_services": "6/6",
  "services": {
    "database": { "status": "active" },
    "stripe": { "status": "active" },
    "email": { "status": "active" },
    "cloudinary": { "status": "active" },
    "push_notifications": { "status": "active" },
    "jwt": { "status": "secure" }
  }
}
```

---

## 6. Deploy

### Backend (Railway):
1. Push codul la GitHub
2. Conectează repo-ul la Railway
3. Adaugă variabilele din `.env` în Railway Dashboard
4. Deploy automat

### Frontend (Vercel):
1. Push codul la GitHub
2. Conectează repo-ul la Vercel
3. Adaugă `REACT_APP_API_URL=https://api.connectjob.ro/api` în Vercel Environment Variables
4. Deploy automat
