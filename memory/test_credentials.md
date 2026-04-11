# Test Credentials

## Admin Account
- Email: andrei.georgescu@test.com
- Password: Parola123!
- Role: admin

## Google OAuth
- Google Client ID: 155290976556-lc51rl66fae9lt4ihhepal0l3atr1cjm.apps.googleusercontent.com
- Auth flow: Emergent Auth (auth.emergentagent.com)

## Auth Endpoints
- POST /api/auth/register — Zod validated (name 2+, email, password 8+ with uppercase+digit)
- POST /api/auth/login — Zod validated
- POST /api/auth/forgot-password — returns reset_url in response
- POST /api/auth/reset-password — Zod validated (token + strong password)
- GET /api/auth/verify-email/:token
- POST /api/auth/resend-verification (auth required)

## Notes
- Email is MOCKED (console only) — verify_url and reset_url returned in API response
- 15 seeded jobs in Timisoara area
- Test users created during testing: test_iter7_*, test_reset_*, test_verify_*
