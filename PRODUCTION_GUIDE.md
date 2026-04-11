# ConnectJob — Ghid Deploy Production

## Pași Rapizi (TL;DR)

1. Creează MongoDB Atlas (gratuit) → obții connection string
2. Pe Railway → Deploy backend din GitHub → setează variabile
3. Pe Vercel → Deploy frontend din GitHub → setează REACT_APP_API_URL

---

## Pas 1: MongoDB Atlas (Bază de date cloud)

1. Mergi la [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Creează cont gratuit → New Project → Build a Database
3. Alege **M0 Free** → Region: Europe West
4. Creează user: `connectjob` / `<parola-puternica>`
5. Network Access → Add IP: `0.0.0.0/0` (permite acces de oriunde)
6. Copie connection string: `mongodb+srv://connectjob:<parola>@cluster0.xxxxx.mongodb.net/connectjob`

---

## Pas 2: Backend → Railway

1. Mergi la [railway.app](https://railway.app) → Login
2. **New Project** → **Deploy from GitHub repo**
3. Selectează repository-ul ConnectJob
4. **Settings** → **Root Directory**: `/backend`
5. Railway detectează automat Node.js

### Variabile de mediu (Settings → Variables):
Copiază valorile din fișierul `.env` local (backend/.env). Cheile necesare:

```
PORT=8001
NODE_ENV=production
MONGO_URI=<CONNECTION_STRING_ATLAS>
JWT_SECRET=<CHEIE_LUNGA_64_CARACTERE>
CLIENT_URL=<URL_VERCEL_FRONTEND>
EMAIL_USER=<GMAIL_ADDRESS>
EMAIL_PASS=<GMAIL_APP_PASSWORD>
EMAIL_FROM=ConnectJob <email@gmail.com>
EMERGENT_LLM_KEY=<CHEIA_TA_EMERGENT>
GOOGLE_CLIENT_ID=<GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>
CLOUDINARY_CLOUD_NAME=<CLOUD_NAME>
CLOUDINARY_API_KEY=<API_KEY>
CLOUDINARY_API_SECRET=<API_SECRET>
VAPID_PUBLIC_KEY=<VAPID_PUBLIC>
VAPID_PRIVATE_KEY=<VAPID_PRIVATE>
VAPID_SUBJECT=mailto:contact@connectjob.ro
STRIPE_SECRET_KEY=<STRIPE_KEY>
STRIPE_API_KEY=<STRIPE_KEY>
```

> **IMPORTANT**: Toate valorile reale sunt în `backend/.env` local. NU le pune în cod!

6. Railway va face deploy automat → primești un URL gen: `connectjob-backend.up.railway.app`
7. Verifică: `https://<railway-url>/api/health` → `{"status":"ok"}`

---

## Pas 3: Frontend → Vercel

1. Mergi la [vercel.com](https://vercel.com) → Login
2. **Add New** → **Project** → Import din GitHub
3. Selectează repository-ul ConnectJob
4. **Framework Preset**: Create React App
5. **Root Directory**: `frontend`
6. **Build Command**: `yarn build`
7. **Output Directory**: `build`

### Variabile de mediu:
```
REACT_APP_API_URL=https://<RAILWAY-URL>/api
```

8. Click **Deploy** → gata!

---

## Pas 4: Conectare Backend ↔ Frontend

După ce ai ambele URL-uri:

### Pe Railway (backend):
- Actualizează `CLIENT_URL` cu URL-ul Vercel

### Pe Vercel (frontend):
- Verifică `REACT_APP_API_URL` pointează la Railway

### Pe Google Cloud Console:
- OAuth → Authorized redirect URIs → Adaugă URL-ul Vercel

---

## Pas 5: Stripe Real (când ești pregătit)

1. [dashboard.stripe.com](https://dashboard.stripe.com) → API Keys
2. Copiază `sk_test_...` și `pk_test_...`
3. Pe Railway, actualizează `STRIPE_SECRET_KEY`
4. Webhooks → Add endpoint: `https://<railway-url>/api/payments/webhook`

---

## Verificare Post-Deploy

- [ ] `/api/health` → `{"status":"ok"}`
- [ ] Login funcționează
- [ ] Register creează user cu trial Pro 7 zile
- [ ] Google OAuth funcționează
- [ ] Email verification se trimite
- [ ] Chat funcționează
- [ ] Planuri / Pricing page se încarcă

---

## Troubleshooting

| Problemă | Soluție |
|----------|---------|
| CORS error | Verifică `CLIENT_URL` pe Railway |
| MongoDB connection | Verifică IP whitelist pe Atlas |
| Google OAuth redirect | Adaugă URL-ul Vercel în Google Console |
| Email nu se trimite | Verifică `EMAIL_PASS` e App Password |
