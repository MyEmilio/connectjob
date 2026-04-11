# Test Credentials

## Admin Account
- Email: andrei.georgescu@test.com
- Password: Parola123!
- Role: admin

## Gmail SMTP (ACTIVE - Real emails working)
- Email: limeuragod@gmail.com
- App Password: configured in backend .env
- Status: ACTIVE - sending real emails

## Google OAuth
- Google Client ID: 155290976556-lc51rl66fae9lt4ihhepal0l3atr1cjm.apps.googleusercontent.com
- Auth flow: Emergent Auth (auth.emergentagent.com)

## Test Users Created
- limeuragod@gmail.com (existing employer account)
- limeuragod+verify@gmail.com / TestParola1! (test verify account)

## Stripe
- Key: sk_test_emergent (SIMULATED - only works with Python emergentintegrations, not native npm Stripe SDK)
- Status: Simulated mode - subscriptions and payments work with sim_ prefix

## Subscription Plans
- Free: 0 RON, 3 apps/day, chat moderation ON
- Pro: 49.99 RON/month, unlimited apps, relaxed moderation
- Premium: 99.99 RON/month, all features, no moderation

## Notes
- Email verification and password reset send REAL emails now
- 15 seeded jobs in Timisoara area
- Chat moderation blocks phone numbers, emails, URLs, social handles for free/pro users
- Premium users bypass all chat moderation
