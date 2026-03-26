# 🚀 Cum pornesti ConnectJob

## Terminal 1 — Backend (API + WebSocket)
```bash
cd backend
npm start
```
> Serverul porneste pe http://localhost:5000

## Terminal 2 — Frontend (React)
```bash
npm start
```
> Aplicatia se deschide pe http://localhost:3000

---

## Configurare servicii externe (optionale)

### Stripe (plati reale)
1. Creeaza cont la https://stripe.com
2. Copiaza "Secret key" din Dashboard → Developers → API keys
3. Pune in `backend/.env`: `STRIPE_SECRET_KEY=sk_test_...`

### Twilio (SMS OTP real)
1. Creeaza cont la https://twilio.com
2. Copiaza Account SID, Auth Token, si un numar de telefon
3. Pune in `backend/.env`:
   - `TWILIO_ACCOUNT_SID=AC...`
   - `TWILIO_AUTH_TOKEN=...`
   - `TWILIO_PHONE_NUMBER=+1...`

---

## Fara configurare externa
Aplicatia merge si fara Stripe/Twilio in **mod demo**:
- Platile sunt simulate (nu se incarca bani reali)
- Codul OTP apare direct in raspunsul API (afisezi in browser devtools)
