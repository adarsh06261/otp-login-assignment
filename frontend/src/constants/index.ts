export const ROUTES = {
  registration: '/registration',
  checkout: '/checkout',
} as const

export const OTP_LENGTH = 6

export function generateDemoOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}
