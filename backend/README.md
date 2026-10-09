# OTP Login Backend

Small Express + PostgreSQL API for the existing frontend. It does not send email or process payments.

## Setup

1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Apply the schema:

```bash
psql "$DATABASE_URL" -f schema.sql
```

4. Install and run:

```bash
npm install
npm run dev
```

The API runs on `http://localhost:4000` by default. Do not commit `.env`.

## Local OTP testing

OTP generation is server-side and uses a cryptographically secure random value. OTPs are stored only as SHA-256 hashes. Email delivery is intentionally not implemented.

For this assignment's demo flow, the registration response includes the generated OTP so the frontend can display it. The OTP is still verified by the backend, expires after 10 minutes, and is stored only as a hash. In a real production flow, replace this demo response with an email/SMS provider and remove the OTP from the response. `DEV_OTP_OUTPUT=true` may also print it during local debugging, but is not required by the frontend.

## API

- `GET /api/health` checks that the server is running.
- `POST /api/auth/register` accepts `{ email, firstName, lastName, phone }`, creates a user, and creates an expiring OTP.
- `POST /api/auth/verify-otp` accepts `{ email, otp }`, verifies the latest unexpired OTP, and sets an HTTP-only session cookie.
- `POST /api/auth/logout` clears the current session.
- `GET /api/auth/me` returns the user associated with the session cookie.
- `GET /api/users/check?email=...` returns `{ registered: boolean }` for checkout lookup.
- `POST /api/checkout` requires the session cookie and accepts `{ email, phone, shippingAddress }`.

All write endpoints validate input and use parameterized SQL. Invalid or expired OTPs return the same generic `401` response, and OTP attempts are limited to five.
