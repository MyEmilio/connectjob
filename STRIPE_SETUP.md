# Stripe — Ghid de configurare ConnectJob

## ✅ Ce e deja gata în cod

1. **Webhook endpoint**: `POST /api/payments/webhook`
   - Handler dedicat în `/app/backend/routes/stripeWebhook.js`
   - Mountat ÎNAINTE de `express.json()` în `server.js` (raw body, semnătură verificabilă)
   - Procesează: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`, `customer.subscription.updated/deleted`, `checkout.session.completed`
2. **Flow plată**: `/api/payments/create-intent` → `/status` (poll) → `/release` (capture funds)
3. **Comision platformă**: 3% (constanta `COMMISSION` în `payments.js`)
4. **Stripe Connect** support: dacă worker-ul are cont Connect verificat, plata merge direct la el cu `application_fee` 3% pentru platformă.
5. **Anti-evasion counter**: `completed_paid_jobs` se incrementează pe ambele părți la fiecare release.

## 🔑 Ce trebuie să-mi trimiți (după ce-ți faci contul Stripe)

Le pui într-un mesaj — eu le adaug în `backend/.env`:

| Variabilă | De unde o iei | Format |
|-----------|---------------|--------|
| `STRIPE_SECRET_KEY` | Dashboard Stripe → Developers → API keys → "Secret key" | `sk_live_...` (sau `sk_test_...` pentru sandbox) |
| `STRIPE_PUBLISHABLE_KEY` | Lângă Secret key, "Publishable key" | `pk_live_...` (sau `pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Dashboard → Developers → Webhooks → click pe webhook-ul tău → "Signing secret" | `whsec_...` |

## 🛠️ Pașii TĂI în Stripe Dashboard

### Pas 1 — Creează contul
- https://dashboard.stripe.com/register
- Țară: România (sau Spania, după activitate)
- Activare: completează detaliile de business (nume legal, IBAN, CUI)

### Pas 2 — Configurează Webhook
1. Dashboard → **Developers → Webhooks → Add endpoint**
2. **Endpoint URL**: `https://api.connectjob.tld/api/payments/webhook`
   (înlocuiește cu URL-ul real Railway al backend-ului — ex: `https://connectjob-backend.up.railway.app/api/payments/webhook`)
3. **Events to send** — selectează exact astea:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.dispute.created`
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Salvează → click pe webhook-ul nou creat → copiază **"Signing secret"** (`whsec_...`) — asta e `STRIPE_WEBHOOK_SECRET`.

### Pas 3 — Activează Stripe Connect (pentru plăți directe către workeri)
1. Dashboard → **Connect → Get started**
2. Tip cont: **Express** (cel mai simplu pentru workers)
3. Țări permise: România, Spania, restul UE
4. Branding: nume "ConnectJob", logo
5. La final, totul rulează automat — workerii vor primi un link de onboarding când deschid pagina de profil.

### Pas 4 — Testare în SANDBOX (înainte de LIVE)
- Folosește cheile `sk_test_...` și `pk_test_...` întâi
- Card test (Visa): `4242 4242 4242 4242` — orice CVV, dată viitoare
- Card cu autentificare 3DS: `4000 0027 6000 3184`
- Card refuzat: `4000 0000 0000 0002`
- Card cu fonduri insuficiente: `4000 0000 0000 9995`
- Documentație completă: https://docs.stripe.com/testing

## 📋 Ce voi face EU după ce primesc cheile

1. Pun cheile în `backend/.env` (Railway environment variables)
2. Restart backend
3. Testez E2E real cu card-ul `4242 4242 4242 4242`:
   - Creez intent → completez plata în UI → confirm `held` în DB
   - Verific webhook primește `payment_intent.succeeded`
   - Release → confirm `released` în DB + email notification
4. Pe webhook fac un test cu `stripe trigger payment_intent.succeeded` (CLI Stripe)
5. Doar după ce TOTUL e verde 🟢 — schimbăm pe `sk_live_...`

## 🐛 Bug-uri Stripe rezolvate în această sesiune

1. ✅ **Webhook signature verification** — montat cu `express.raw()` ÎNAINTE de `express.json()` (era bug critic)
2. ✅ **Payment status nu se actualiza la release** — `findPaymentById` cu `lean({virtuals:true})` nu materializa `id` virtual → `updatePayment(undefined,...)` eșua silent. Fix: setăm explicit `id = _id.toString()` în query.
3. ✅ Counter `completed_paid_jobs` incrementează corect pe ambele părți
4. ✅ Webhook handler logică verificată pentru toate cele 6 event-uri Stripe

## ⚠️ Înainte de LIVE — checklist final

- [ ] Webhook configurat în Dashboard Stripe (PROD endpoint)
- [ ] `STRIPE_WEBHOOK_SECRET` setat pe Railway
- [ ] `STRIPE_SECRET_KEY` switch de la `sk_test_...` la `sk_live_...`
- [ ] `STRIPE_PUBLISHABLE_KEY` switch la `pk_live_...`
- [ ] Stripe Connect Express activat
- [ ] Test 1 plată reală mică (1 RON) end-to-end
- [ ] Verifică că funds aterizează în Stripe Balance corect
- [ ] Doar atunci anunți utilizatorii reali ✅
