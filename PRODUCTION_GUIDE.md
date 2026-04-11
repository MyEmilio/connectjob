# ConnectJob — Ghid Deploy Production

## 1. Backend → Railway

### Pași:
1. **Push codul pe GitHub** (folosește butonul "Save to Github" din Emergent)
2. **Pe Railway (railway.app)**:
   - New Project → Deploy from GitHub repo
   - Selectează repo-ul → folder: `/backend`
   - Railway detectează automat Node.js

3. **Variabile de mediu (Railway Settings → Variables)**:
   ```
   PORT=8001
   NODE_ENV=production
   MONGO_URI=mongodb+srv://...  (MongoDB Atlas connection string)
   JWT_SECRET=<genereaza unul lung, 64+ caractere>
   CLIENT_URL=https://connectjob.vercel.app  (domeniul Vercel)
   
   STRIPE_SECRET_KEY=sk_live_...  (sau sk_test_...)
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   EMAIL_USER=limeuragod@gmail.com
   EMAIL_PASS=dnzrkjkoayjtvdxu
   EMAIL_FROM=ConnectJob <limeuragod@gmail.com>
   
   EMERGENT_LLM_KEY=sk-emergent-cEa76Ea57933c45D62
   GOOGLE_CLIENT_ID=155290976556-lc51rl66fae9lt4ihhepal0l3atr1cjm.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=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
   
   CLOUDINARY_CLOUD_NAME=docmrwnwm
   CLOUDINARY_API_KEY=968167958896813
   CLOUDINARY_API_SECRET=<secretul tau Cloudinary>
   
   VAPID_PUBLIC_KEY=BLrzBc2Cf8yYWmnBOU2YnC0l33Eys0M00wLG910mbd0RPcei2PTG-7Cx1Y_giI-zD91iKCuyciBc79JgQ2sktHw
   VAPID_PRIVATE_KEY=nxOH-qNsJoqmPH5z8TgXcTz8gNDylCSebxLY3cK0aeI
   VAPID_SUBJECT=mailto:contact@connectjob.ro
   ```

4. **MongoDB Atlas** (obligatoriu pentru producție):
   - Creează cluster gratuit pe mongodb.com/atlas
   - Obține connection string: `mongodb+srv://user:pass@cluster.xxx.mongodb.net/connectjob`
   - Setează ca `MONGO_URI` pe Railway

### Health Check:
- Railway verifică automat `/api/health`
- Configurat în `railway.json`

---

## 2. Frontend → Vercel

### Pași:
1. **Push codul pe GitHub**
2. **Pe Vercel (vercel.com)**:
   - Import Project → selectează repo GitHub
   - Framework: Create React App
   - Root Directory: `frontend`
   - Build Command: `yarn build`
   - Output Directory: `build`

3. **Variabile de mediu (Vercel Settings → Environment Variables)**:
   ```
   REACT_APP_API_URL=https://<backend-railway-url>/api
   ```
   (Railway îți dă un URL gen: `connectjob-backend-production.up.railway.app`)

4. **Domeniu custom** (opțional):
   - Settings → Domains → Adaugă `connectjob.ro` sau similar
   - Actualizează `CLIENT_URL` pe Railway cu noul domeniu

### Configurare vercel.json:
Deja configurat în `/app/vercel.json` cu SPA rewrites.

---

## 3. Post-Deploy Checklist

- [ ] Verifică `/api/health` pe Railway URL
- [ ] Verifică frontend pe Vercel URL
- [ ] Testează login/register
- [ ] Testează Google OAuth (actualizează redirect URI pe Google Console)
- [ ] Testează email verification
- [ ] Testează plăți Stripe (cu chei de test mai întâi)
- [ ] Configurează Stripe Webhook pe Dashboard → endpoint: `https://<railway-url>/api/payments/webhook`

---

## 4. Credentiale necesare

| Serviciu | Ce trebuie | Unde obții |
|----------|-----------|------------|
| MongoDB Atlas | Connection string | mongodb.com/atlas |
| Stripe | sk_test/sk_live + pk_test/pk_live | dashboard.stripe.com |
| Cloudinary | API Secret | cloudinary.com/console |
| Google OAuth | Redirect URI update | console.cloud.google.com |

---

## Deploy Accounts
- **Vercel**: MyEmilios (limeuragod-3698)
- **Railway**: myemilio's Projects
