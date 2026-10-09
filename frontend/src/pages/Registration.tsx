import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ROUTES } from '../constants'
import { registerUser as registerUserApi } from '../services/api'
import { setPendingUser, type UserProfile } from '../store/authSlice'
import type { AppDispatch } from '../store/store'
import { isEmail, minLength, required, validateForm, type FormErrors } from '../utils/validation'

type RegistrationValues = UserProfile
const initialValues: RegistrationValues = { firstName: '', lastName: '', email: '', phone: '' }
const validators = {
  firstName: required('First name'),
  lastName: required('Last name'),
  email: (value: string) => value.trim() ? isEmail(value) : 'Email is required',
  phone: (value: string) => value.trim() ? minLength(10, 'Enter a valid phone number')(value, initialValues) : 'Phone number is required',
}

type Field = keyof RegistrationValues

export function Registration() {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<FormErrors<RegistrationValues>>({})
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [registrationOtp, setRegistrationOtp] = useState('')
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const nextValues = { ...values, [name]: value }
    setValues(nextValues)
    if (touched[name as Field]) setErrors(validateForm(nextValues, validators))
  }

  const handleBlur = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as Field
    const nextTouched = { ...touched, [field]: true }
    setTouched(nextTouched)
    setErrors(validateForm(values, validators))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateForm(values, validators)
    setErrors(nextErrors)
    setTouched({ firstName: true, lastName: true, email: true, phone: true })
    if (Object.keys(nextErrors).length === 0) {
      setApiError('')
      setIsSubmitting(true)
      try {
        const result = await registerUserApi(values)
        dispatch(setPendingUser(result.user))
        setRegistrationOtp(result.otp)
        setRegistrationComplete(true)
      } catch (error) {
        setApiError(error instanceof Error ? error.message : 'Registration failed. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <main className="page auth-layout">
      <section>
        <p className="eyebrow">A simpler welcome</p>
        <h1>Your account, ready when you are.</h1>
        <p className="lede">Create your profile once, then use a one-time passcode to confirm checkout. No passwords to remember.</p>
        <aside className="feature-note">
          <h2>Less friction, more flow.</h2>
          <p>Your details stay available as you move between registration and checkout in this demo.</p>
        </aside>
      </section>

      {registrationComplete ? (
        <section className="form-panel">
          <p className="eyebrow">Registration complete</p>
          <h2 className="form-heading">Your OTP is ready</h2>
          <p className="lede">Use this six-digit OTP to verify your account at checkout. It expires soon.</p>
          <p className="otp-demo" aria-label="One-time passcode">{registrationOtp}</p>
          <Button type="button" fullWidth onClick={() => navigate(ROUTES.checkout)}>Continue to checkout</Button>
        </section>
      ) : (
      <form className="form-panel" onSubmit={handleSubmit} noValidate>
        <h2 className="form-heading">Create your profile</h2>
        {([['firstName', 'First name', 'Alex'], ['lastName', 'Last name', 'Morgan'], ['email', 'Email address', 'alex@example.com'], ['phone', 'Phone number', '+1 555 123 4567']] as const).map(([field, label, placeholder]) => (
          <div className="field" key={field}>
            <label htmlFor={field}>{label}</label>
            <input id={field} name={field} type={field === 'email' ? 'email' : 'text'} value={values[field]} placeholder={placeholder} aria-invalid={Boolean(touched[field] && errors[field])} onChange={handleChange} onBlur={handleBlur} />
            <p className="error">{touched[field] ? errors[field] : ''}</p>
          </div>
        ))}
        {apiError && <p className="error" role="alert">{apiError}</p>}
        <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Continue to checkout'}</Button>
      </form>
      )}
    </main>
  )
}
