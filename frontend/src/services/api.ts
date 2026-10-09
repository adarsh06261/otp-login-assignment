const API_BASE_URL = 'http://localhost:4000'

export type ApiUser = {
  email: string
  firstName: string
  lastName: string
  phone: string
}

export type RegistrationResponse = {
  user: ApiUser
  otp: string
  otpExpiresAt: string
}

export type CheckoutResponse = {
  submissionId: number
  createdAt: string
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? 'Something went wrong. Please try again.')
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function registerUser(values: { email: string; firstName: string; lastName: string; phone: string }): Promise<RegistrationResponse> {
  return request<RegistrationResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(values),
  })
}

export function verifyOtp(email: string, otp: string): Promise<{ user: ApiUser }> {
  return request<{ user: ApiUser }>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  })
}

export function getCurrentUser(): Promise<{ user: ApiUser }> {
  return request<{ user: ApiUser }>('/api/auth/me')
}

export function checkRegisteredEmail(email: string): Promise<{ registered: boolean }> {
  return request<{ registered: boolean }>(`/api/users/check?email=${encodeURIComponent(email)}`)
}

export function submitCheckout(values: { email: string; phone: string; shippingAddress: string }): Promise<CheckoutResponse> {
  return request<CheckoutResponse>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(values),
  })
}

export function logout(): Promise<void> {
  return request<void>('/api/auth/logout', { method: 'POST' })
}
