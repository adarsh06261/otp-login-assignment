import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { OTP_LENGTH, ROUTES } from '../constants'
import { checkRegisteredEmail, logout as logoutApi, submitCheckout, verifyOtp } from '../services/api'
import { clearAuth, setActiveUser } from '../store/authSlice'
import type { RootState } from '../store/store'
import { isEmail, minLength, required, validateForm, type FormErrors } from '../utils/validation'

type CheckoutValues = { email: string; phone: string; address: string }
const validators = {
  email: (value: string) => value.trim() ? isEmail(value) : 'Email is required',
  phone: (value: string) => value.trim() ? minLength(10, 'Enter a valid phone number')(value, { email: '', phone: '', address: '' }) : 'Phone number is required',
  address: required('Delivery address'),
}

export function Checkout() {
  const dispatch = useDispatch()
  const { activeUser, pendingUser } = useSelector((state: RootState) => state.auth)
  const navigate = useNavigate()
  const [values, setValues] = useState<CheckoutValues>({ email: pendingUser?.email ?? activeUser?.email ?? '', phone: pendingUser?.phone ?? activeUser?.phone ?? '', address: '' })
  const [errors, setErrors] = useState<FormErrors<CheckoutValues>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof CheckoutValues, boolean>>>({})
  const [isOtpOpen, setIsOtpOpen] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRegistered, setIsRegistered] = useState(Boolean(activeUser))
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const email = values.email.trim()
    if (!email || isEmail(email) !== '') {
      setIsRegistered(false)
      setIsLookingUp(false)
      return
    }

    setIsLookingUp(true)
    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await checkRegisteredEmail(email)
        setIsRegistered(result.registered)
        if (!result.registered) setErrors((current) => ({ ...current, email: 'No registered user found for this email' }))
      } catch (error) {
        setIsRegistered(false)
        setErrors((current) => ({ ...current, email: error instanceof Error ? error.message : 'Unable to check this email' }))
      } finally {
        setIsLookingUp(false)
      }
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [values.email])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const nextValues = { ...values, [name]: value }
    setValues(nextValues)
    setMessage('')
    if (name === 'email') {
      dispatch(clearAuth())
      setIsRegistered(false)
      setErrors((current) => ({ ...current, email: '' }))
    }
    if (touched[name as keyof CheckoutValues]) setErrors(validateForm(nextValues, validators))
  }

  const handleBlur = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as keyof CheckoutValues
    setTouched({ ...touched, [field]: true })
    setErrors(validateForm(values, validators))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    const nextErrors = validateForm(values, validators)
    setErrors(nextErrors)
    setTouched({ email: true, phone: true, address: true })
    if (Object.keys(nextErrors).length > 0 || !isRegistered) {
      if (!isRegistered && Object.keys(nextErrors).length === 0) setErrors({ ...nextErrors, email: 'Enter the email used during registration' })
      return
    }

    if (!activeUser) {
      setOtpError('')
      setIsOtpOpen(true)
      return
    }

    setIsSubmitting(true)
    setMessage('')
    try {
      await submitCheckout({ email: values.email, phone: values.phone, shippingAddress: values.address })
      setIsSubmitted(true)
      setMessage('Checkout submitted successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Checkout submission failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async () => {
    setOtpError('')
    setMessage('')
    setIsVerifying(true)
    try {
      const result = await verifyOtp(values.email, otp)
      dispatch(setActiveUser(result.user))
      setIsOtpOpen(false)
      setOtp('')
      setMessage('OTP verified successfully. Submit checkout to complete your order.')
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Invalid or expired OTP')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSkipOtp = () => {
    setIsOtpOpen(false)
    setOtp('')
    setOtpError('')
    setMessage('Login skipped. Verify your OTP before submitting checkout.')
  }

  const handleLogout = async () => {
    await logoutApi().catch(() => undefined)
    dispatch(clearAuth())
    navigate(ROUTES.registration)
  }

  return (
    <main className="page">
      <section className="checkout-panel">
        <div className="checkout-top">
          <div>
            <p className="eyebrow">Secure checkout</p>
            <h1>Almost yours.</h1>
            {activeUser && <p className="signed-in-user">Signed in as {activeUser.firstName} {activeUser.lastName}</p>}
            <p className="lede">Confirm your delivery details and verify your identity with a one-time passcode.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="checkout-email">Checkout email</label>
            <input id="checkout-email" name="email" type="email" value={values.email} disabled={isSubmitted} aria-invalid={Boolean(touched.email && errors.email)} onChange={handleChange} onBlur={handleBlur} />
            <p className="error">{touched.email ? errors.email : ''}</p>
          </div>
          <div className="field">
            <label htmlFor="checkout-phone">Phone number</label>
            <input id="checkout-phone" name="phone" value={values.phone} placeholder="+1 555 123 4567" disabled={isSubmitted} aria-invalid={Boolean(touched.phone && errors.phone)} onChange={handleChange} onBlur={handleBlur} />
            <p className="error">{touched.phone ? errors.phone : ''}</p>
          </div>
          <div className="field">
            <label htmlFor="address">Delivery address</label>
            <input id="address" name="address" value={values.address} placeholder="42 Garden Street, Brooklyn" disabled={isSubmitted} aria-invalid={Boolean(touched.address && errors.address)} onChange={handleChange} onBlur={handleBlur} />
            <p className="error">{touched.address ? errors.address : ''}</p>
          </div>
          {!isSubmitted && <Button type="submit" fullWidth disabled={isSubmitting || isLookingUp}>{isSubmitting ? 'Submitting...' : activeUser ? 'Submit Checkout' : 'Verify OTP'}</Button>}
        </form>
        {message && <p className="status" role="status">{message}</p>}
        {activeUser && <Button type="button" variant="tertiary" onClick={handleLogout}>Log out</Button>}
      </section>

      {isOtpOpen && (
        <Modal title="Verify your checkout" onClose={() => setIsOtpOpen(false)}>
          <p className="lede">Enter the six-digit OTP displayed after registration.</p>
          <div className="field">
            <label htmlFor="otp">One-time passcode</label>
            <input id="otp" className="otp-input" inputMode="numeric" maxLength={OTP_LENGTH} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="000000" />
          </div>
          <Button type="button" fullWidth disabled={isVerifying || otp.length !== OTP_LENGTH} onClick={handleVerifyOtp}>{isVerifying ? 'Verifying...' : 'Verify OTP'}</Button>
          <Button type="button" variant="secondary" fullWidth onClick={handleSkipOtp}>Skip login</Button>
          {otpError && <p className="error" role="alert">{otpError}</p>}
        </Modal>
      )}
    </main>
  )
}
