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

1. Mergi la [railway.app](https://railway.app) → Login (myemilio's Projects)
2. **New Project** → **Deploy from GitHub repo**
3. Selectează repository-ul ConnectJob
4. **Settings** → **Root Directory**: `/backend`
5. Railway detectează automat Node.js

### Variabile de mediu (Settings → Variables):
Copiază și lipește toate acestea:

```
PORT=8001
NODE_ENV=production
MONGO_URI=mongodb+srv://connectjob:<PAROLA_TA>@cluster0.xxxxx.mongodb.net/connectjob
JWT_SECRET=f407a48a36dfb0fd17efa779df79d349d4de1956f2d17b257c92db13650a9cc1527422e8c010625bc4698ca9f2aa1f68f0acc09d437bc051225161492e9c48d7
CLIENT_URL=https://<DOMENIUL-VERCEL>.vercel.app
EMAIL_USER=limeuragod@gmail.com
EMAIL_PASS=dnzrkjkoayjtvdxu
EMAIL_FROM=ConnectJob <limeuragod@gmail.com>
EMERGENT_LLM_KEY=sk-emergent-cEa76Ea57933c45D62
GOOGLE_CLIENT_ID=155290976556-lc51rl66fae9lt4ihhepal0l3atr1cjm.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
CLOUDINARY_CLOUD_NAME=docmrwnwm
CLOUDINARY_API_KEY=968167958896813
CLOUDINARY_API_SECRET=q3zSXvYfFvwtw03O2JD6dQuhO4E
VAPID_PUBLIC_KEY=BLrzBc2Cf8yYWmnBOU2YnC0l33Eys0M00wLG910mbd0RPcei2PTG-7Cx1Y_giI-zD91iKCuyciBc79JgQ2sktHw
VAPID_PRIVATE_KEY=nxOH-qNsJoqmPH5z8TgXcTz8gNDylCSebxLY3cK0aeI
VAPID_SUBJECT=mailto:contact@connectjob.ro
STRIPE_SECRET_KEY=sk_test_emergent
STRIPE_API_KEY=sk_test_emergent
```

> **IMPORTANT**: Înlocuiește `<PAROLA_TA>` cu parola MongoDB Atlas și `<DOMENIUL-VERCEL>` cu URL-ul real după deploy Vercel.

6. Railway va face deploy automat → vei primi un URL gen: `connectjob-backend-production.up.railway.app`
7. Verifică: `https://<railway-url>/api/health` trebuie să returneze `{"status":"ok"}`

---

## Pas 3: Frontend → Vercel

1. Mergi la [vercel.com](https://vercel.com) → Login (MyEmilios / limeuragod-3698)
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

> Înlocuiește `<RAILWAY-URL>` cu URL-ul Railway din pasul anterior.

8. Click **Deploy** → gata!

---

## Pas 4: Conectare Backend ↔ Frontend

După ce ai ambele URL-uri:

### Pe Railway (backend):
- Actualizează `CLIENT_URL` cu URL-ul Vercel: `https://connectjob.vercel.app`

### Pe Vercel (frontend):
- Verifică `REACT_APP_API_URL` pointează la Railway: `https://<railway-url>/api`

### Pe Google Cloud Console:
- Settings → OAuth → Authorized redirect URIs → Adaugă: `https://connectjob.vercel.app`

---

## Pas 5: Stripe Real (când ești pregătit)

1. Mergi la [dashboard.stripe.com](https://dashboard.stripe.com)
2. Developers → API Keys → Copiază:
   - `sk_test_...` (Secret Key)
   - `pk_test_...` (Publishable Key)
3. Pe Railway, actualizează:
   ```
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxx
   ```
4. Configurează webhook: Developers → Webhooks → Add endpoint:
   - URL: `https://<railway-url>/api/payments/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.completed`, `customer.subscription.*`

---

## Verificare Post-Deploy

- [ ] `/api/health` → `{"status":"ok"}`
- [ ] Login funcționează
- [ ] Register creează user cu trial Pro 7 zile
- [ ] Google OAuth funcționează
- [ ] Email verification se trimite
- [ ] Chat funcționează
- [ ] Cloudinary uploads funcționează
- [ ] Planuri / Pricing page se încarcă

---

## Troubleshooting

| Problemă | Soluție |
|----------|---------|
| CORS error | Verifică `CLIENT_URL` pe Railway include URL-ul Vercel |
| MongoDB connection | Verifică IP whitelist pe Atlas (0.0.0.0/0) |
| Google OAuth redirect | Adaugă URL-ul Vercel în Google Console |
| Email nu se trimite | Verifică `EMAIL_PASS` este App Password, nu parola normală |
