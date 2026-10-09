# OTP Login Assignment

A full-stack OTP-based registration, user recognition, login, and checkout demo.

## Features

- Registration with email, first name, last name, and phone number.
- Server-generated six-digit OTP displayed after registration for this demo.
- OTP verification with expiration and a five-attempt limit.
- HTTP-only session cookie after successful login.
- Real-time checkout email validation and background registered-user lookup.
- OTP login modal with a skip option.
- Logged-in user's name displayed at the top of checkout.
- Checkout submissions stored in PostgreSQL.
- Separate React frontend, Express API, and PostgreSQL database layers.

## Project Structure

```text
backend/
  schema.sql          PostgreSQL tables and indexes
  src/auth.ts         OTP hashing and session middleware
  src/db.ts           PostgreSQL connection pool
  src/server.ts       Express API routes and validation
frontend/
  src/pages/          Registration and checkout screens
  src/services/api.ts Frontend API client
  src/store/          Redux authentication state
  src/styles/         Application styles
prompts.md            LLM prompt log for the assignment
```

## Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL, either local or a hosted database such as Supabase

## Database Setup

Create a PostgreSQL database, then apply the checked-in schema:

```bash
cd backend
psql "$DATABASE_URL" -f schema.sql
```

The schema creates these tables:

- `users`
- `otp_verifications`
- `sessions`
- `checkout_submissions`

## Local Configuration

### Backend

Copy the example environment file:

```bash
cd backend
cp .env.example .env
```

Set at least these values in `backend/.env`:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/otp_login
FRONTEND_ORIGIN=http://localhost:5173
SESSION_TTL_HOURS=24
DEV_OTP_OUTPUT=false
```

Never commit `.env` or database credentials.

### Frontend

The frontend defaults to `http://localhost:4000`. To use another API URL, create `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000
```

## Run Locally

Open two terminals from the repository root.

Terminal 1, start the API:

```bash
cd backend
npm install
npm run dev
```

Terminal 2, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Demo Flow

1. Register with an email, name, and phone number.
2. Copy the six-digit OTP displayed after registration.
3. Continue to checkout.
4. Enter the registered email. The API checks recognition in the background once the email is valid.
5. Enter phone and shipping address, then submit the checkout form.
6. Enter the OTP in the modal to log in. The user's name appears at the top of checkout.
7. Submit checkout again. The record is written to `checkout_submissions`.

The demo returns the OTP from the registration API so the flow can be tested without an email or SMS provider. For production, replace this behavior with a trusted email or SMS delivery service and do not return the OTP in the API response.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check API availability |
| POST | `/api/auth/register` | Register a user and create an OTP |
| POST | `/api/auth/verify-otp` | Verify the OTP and create a session |
| GET | `/api/auth/me` | Return the current authenticated user |
| POST | `/api/auth/logout` | Clear the current session |
| GET | `/api/users/check?email=...` | Check whether an email is registered |
| POST | `/api/checkout` | Store an authenticated checkout submission |

The frontend sends credentials with requests so the HTTP-only session cookie is included.

## Validation Commands

Backend:

```bash
cd backend
npm run build
npm run lint
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Deployment

The frontend is configured for Vercel deployment. Set `VITE_API_URL` to the public backend URL in the Vercel project environment variables.

Deploy the backend to a Node-compatible host and configure:

- `DATABASE_URL`
- `FRONTEND_ORIGIN` with the deployed frontend URL
- `NODE_ENV=production`
- `SESSION_TTL_HOURS`

Apply `backend/schema.sql` to the production PostgreSQL database before using the API. The production frontend must use HTTPS because the session cookie is marked `Secure`.

## Security Notes

- OTPs are stored as SHA-256 hashes, not plaintext.
- OTPs expire after 10 minutes and are limited to five attempts.
- Sessions use random tokens stored as hashes and are delivered in HTTP-only cookies.
- SQL queries are parameterized.
- Input is validated on the server as well as in the frontend.
- Payment processing is intentionally not implemented.
