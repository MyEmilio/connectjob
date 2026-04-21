# Test Credentials

## Admin Account
- Email: andrei.georgescu@test.com
- Password: Parola123!
- Role: admin
- Status: Has active Pro trial

## User Accounts (temp password)
- emidogarusp@gmail.com / ConnectJob2026!
- dacase.2016@hotmail.com / ConnectJob2026!

## Notes
- All API keys/secrets are in backend/.env (NOT in code)
- Default language: Spanish (es)
- Language order: ES, CA, EN, FR, DE, IT, PT, NL, RU, RO, AR
- New users auto-get 7-day Pro trial
- Stripe: SIMULATED (needs real keys)
- Cloudinary: ACTIVE
- Gmail SMTP: App Password may need refresh
- **Dual Mode (Feb 2026)**: users have `roles[]` and `active_role`. Switch via POST /api/auth/switch-role
- **AI Moderation (Feb 2026)**: chat blocks phone/email/links/off-platform proposals. Strike tiers: 1=warn, 2=24h ban, 3=7d, 4=permanent. Reset test user strikes with mongosh updateMany
- **Escrow mandatory (Feb 2026)**: first 3 completed paid jobs required; premium users bypass
