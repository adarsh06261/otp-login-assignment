import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import 'dotenv/config'
import { createSession, clearSession, generateOtp, hashValue, matchesHash, requireAuth, type AuthenticatedRequest } from './auth.js'
import { pool } from './db.js'

const app = express()
const port = Number(process.env.PORT ?? 4000)
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^[+()\d\s-]{10,20}$/
const otpLifetimeMinutes = 10

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [frontendOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173']
    callback(null, !origin || allowedOrigins.includes(origin))
  },
  credentials: true,
}))
app.use(express.json({ limit: '32kb' }))

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function validRegistration(body: unknown): body is { email: string; firstName: string; lastName: string; phone: string } {
  if (!body || typeof body !== 'object') return false
  const candidate = body as Record<string, unknown>
  return emailPattern.test(text(candidate.email)) && text(candidate.firstName).length >= 1 && text(candidate.firstName).length <= 80 && text(candidate.lastName).length >= 1 && text(candidate.lastName).length <= 80 && phonePattern.test(text(candidate.phone))
}

function validCheckout(body: unknown): body is { email: string; phone: string; shippingAddress: string } {
  if (!body || typeof body !== 'object') return false
  const candidate = body as Record<string, unknown>
  return emailPattern.test(text(candidate.email)) && phonePattern.test(text(candidate.phone)) && text(candidate.shippingAddress).length >= 5 && text(candidate.shippingAddress).length <= 300
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.post('/api/auth/register', async (request, response, next) => {
  if (!validRegistration(request.body)) {
    response.status(400).json({ error: 'Valid email, first name, last name, and phone are required' })
    return
  }

  const email = text(request.body.email).toLowerCase()
  const firstName = text(request.body.firstName)
  const lastName = text(request.body.lastName)
  const phone = text(request.body.phone)
  const otp = generateOtp()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows[0]) {
      await client.query('ROLLBACK')
      response.status(409).json({ error: 'Email is already registered' })
      return
    }

    const userResult = await client.query<{ id: number }>(
      'INSERT INTO users (email, first_name, last_name, phone) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, firstName, lastName, phone],
    )
    const expiresAt = new Date(Date.now() + otpLifetimeMinutes * 60 * 1000)
    await client.query(
      'INSERT INTO otp_verifications (user_id, otp_hash, expires_at) VALUES ($1, $2, $3)',
      [userResult.rows[0].id, hashValue(otp), expiresAt],
    )
    await client.query('COMMIT')

    if (process.env.NODE_ENV !== 'production' && process.env.DEV_OTP_OUTPUT === 'true') {
      console.info(`[DEV ONLY] OTP for ${email}: ${otp}`)
    }

    response.status(201).json({
      user: { email, firstName, lastName, phone },
      otp,
      otpExpiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
})

app.post('/api/auth/verify-otp', async (request, response, next) => {
  const email = text(request.body?.email).toLowerCase()
  const otp = text(request.body?.otp)
  if (!emailPattern.test(email) || !/^\d{6}$/.test(otp)) {
    response.status(401).json({ error: 'Invalid or expired OTP' })
    return
  }

  try {
    const result = await pool.query<{ id: number; user_id: number; otp_hash: string; expires_at: Date; attempts: number }>(
      `SELECT otp.id, otp.user_id, otp.otp_hash, otp.expires_at, otp.attempts
       FROM otp_verifications otp JOIN users u ON u.id = otp.user_id
       WHERE u.email = $1 AND otp.verified_at IS NULL
       ORDER BY otp.created_at DESC LIMIT 1`,
      [email],
    )
    const record = result.rows[0]
    if (!record || record.expires_at <= new Date() || record.attempts >= 5) {
      response.status(401).json({ error: 'Invalid or expired OTP' })
      return
    }

    if (!matchesHash(otp, record.otp_hash)) {
      await pool.query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1', [record.id])
      response.status(401).json({ error: 'Invalid or expired OTP' })
      return
    }

    await pool.query('UPDATE otp_verifications SET verified_at = NOW() WHERE id = $1', [record.id])
    const user = await pool.query<{ email: string; first_name: string; last_name: string; phone: string }>(
      'SELECT email, first_name, last_name, phone FROM users WHERE id = $1',
      [record.user_id],
    )
    await createSession(record.user_id, response)
    response.json({
      user: {
        email: user.rows[0].email,
        firstName: user.rows[0].first_name,
        lastName: user.rows[0].last_name,
        phone: user.rows[0].phone,
      },
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/auth/me', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  try {
    const result = await pool.query<{ email: string; first_name: string; last_name: string; phone: string }>(
      'SELECT email, first_name, last_name, phone FROM users WHERE id = $1',
      [request.userId],
    )
    if (!result.rows[0]) {
      response.status(401).json({ error: 'Authentication required' })
      return
    }
    response.json({
      user: {
        email: result.rows[0].email,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        phone: result.rows[0].phone,
      },
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/logout', async (request, response, next) => {
  try {
    await clearSession(request, response)
    response.status(204).send()
  } catch (error) {
    next(error)
  }
})

app.get('/api/users/check', async (request, response, next) => {
  const email = text(request.query.email).toLowerCase()
  if (!emailPattern.test(email)) {
    response.status(400).json({ error: 'A valid email is required' })
    return
  }
  try {
    const result = await pool.query('SELECT 1 FROM users WHERE email = $1', [email])
    response.json({ registered: Boolean(result.rows[0]) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/checkout', requireAuth, async (request: AuthenticatedRequest, response, next) => {
  if (!validCheckout(request.body)) {
    response.status(400).json({ error: 'Valid email, phone, and shipping address are required' })
    return
  }

  try {
    const userResult = await pool.query<{ email: string }>('SELECT email FROM users WHERE id = $1', [request.userId])
    const user = userResult.rows[0]
    if (!user || user.email !== text(request.body.email).toLowerCase()) {
      response.status(403).json({ error: 'Checkout email does not match the authenticated user' })
      return
    }

    const result = await pool.query<{ id: number; created_at: Date }>(
      `INSERT INTO checkout_submissions (user_id, email, phone, shipping_address)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [request.userId, user.email, text(request.body.phone), text(request.body.shippingAddress)],
    )
    response.status(201).json({ submissionId: result.rows[0].id, createdAt: result.rows[0].created_at })
  } catch (error) {
    next(error)
  }
})

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' })
})

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
})

async function start(): Promise<void> {
  await pool.query('SELECT 1')
  app.listen(port, () => console.info(`API listening on http://localhost:${port}`))
}

start().catch((error: unknown) => {
  console.error('Unable to start API. Check DATABASE_URL and PostgreSQL availability.')
  console.error(error)
  process.exitCode = 1
})
