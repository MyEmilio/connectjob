# ConnectJob - Job Marketplace Platform

A full-stack job marketplace application connecting workers with employers in Romania.

## Tech Stack

### Frontend
- React 19 with React Router v7
- Socket.io-client for real-time messaging
- Leaflet for maps
- i18next for internationalization (11 languages)
- Axios for HTTP requests

### Backend
- Node.js with Express.js
- MongoDB with Mongoose ODM
- Socket.io for real-time features
- JWT authentication with Google OAuth support
- Stripe for payments
- Twilio for SMS OTP verification
- Winston for structured logging
- Cloudinary for file uploads (optional)

## Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd connectjob
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Configure environment variables:

**Backend** - Copy `backend/.env.example` to `backend/.env` and fill in your values:
```bash
cp backend/.env.example backend/.env
```

**Frontend** - Copy `frontend/.env.example` to `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```

5. Start the development servers:

Backend:
```bash
cd backend
npm run dev
```

Frontend (in a new terminal):
```bash
cd frontend
npm start
```

## Environment Variables

### Backend Required Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | Environment (development/production) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `CLIENT_URL` | Frontend URL for CORS |

### Backend Optional Variables (for full functionality)

| Variable | Description | How to get |
|----------|-------------|------------|
| `GOOGLE_CLIENT_ID` | Google OAuth | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `STRIPE_SECRET_KEY` | Stripe payments | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | Stripe Dashboard > Webhooks |
| `TWILIO_ACCOUNT_SID` | Twilio SMS | [Twilio Console](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | Twilio auth | Twilio Console |
| `TWILIO_PHONE_NUMBER` | Twilio sender | Twilio Console |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary uploads | [Cloudinary Console](https://cloudinary.com/console) |
| `CLOUDINARY_API_KEY` | Cloudinary auth | Cloudinary Console |
| `CLOUDINARY_API_SECRET` | Cloudinary auth | Cloudinary Console |
| `EMAIL_USER` | Gmail SMTP | Your Gmail address |
| `EMAIL_PASS` | Gmail App Password | [Google App Passwords](https://myaccount.google.com/apppasswords) |

## Deployment

### Backend (Railway)

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Set the root directory to `backend`
4. Add all environment variables from `.env.example`
5. Deploy!

### Frontend (Vercel)

1. Import your project on [Vercel](https://vercel.com)
2. Set the root directory to `frontend`
3. Add environment variables:
   - `REACT_APP_API_URL` = Your Railway backend URL
   - `REACT_APP_GOOGLE_CLIENT_ID` (if using Google OAuth)
4. Deploy!

## ⚠️ Security Notice

**NEVER commit `.env` files with real credentials to version control!**

- Both `backend/.env` and `frontend/.env` are gitignored
- Use `.env.example` files as templates
- Set production secrets directly in your deployment platform (Railway/Vercel environment variables)

## API Documentation

### Health Check
```
GET /api/health
```
Returns server status, database connection state, and uptime.

### Authentication
```
POST /api/auth/register - Register new user
POST /api/auth/login - Login
POST /api/auth/google - Google OAuth login
GET /api/auth/me - Get current user
PUT /api/auth/profile - Update profile
```

### Jobs
```
GET /api/jobs - List jobs (with filters)
GET /api/jobs/:id - Get job details
POST /api/jobs - Create job (auth required)
PUT /api/jobs/:id - Update job (owner only)
DELETE /api/jobs/:id - Delete job (owner only)
POST /api/jobs/:id/apply - Apply to job
GET /api/jobs/:id/applications - Get applications
```

### Messages
```
GET /api/messages/conversations - Get user's conversations
POST /api/messages/conversations - Start conversation
GET /api/messages/conversations/:id - Get messages
POST /api/messages/conversations/:id/send - Send message
```

### Payments
```
POST /api/payments/create-intent - Create payment intent
POST /api/payments/:id/release - Release payment to worker
POST /api/payments/:id/dispute - Dispute payment
GET /api/payments/my - Get user's payments
POST /api/payments/webhook - Stripe webhook endpoint
```

## Cloudinary Setup (Free Tier)

To enable cloud-based file uploads:

1. Create a free account at [Cloudinary](https://cloudinary.com)
2. Go to Dashboard to find your credentials
3. Add to your backend `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

The app will automatically use Cloudinary when configured, otherwise falls back to local storage.

## License

MIT
