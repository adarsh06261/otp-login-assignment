export type FormValues = Record<string, string>
export type FormErrors<T extends FormValues> = Partial<Record<keyof T, string>>
export type Validator<T extends FormValues> = (value: string, values: T) => string

export function validateForm<T extends FormValues>(
  values: T,
  validators: Partial<Record<keyof T, Validator<T>>>,
): FormErrors<T> {
  const errors: FormErrors<T> = {}

  for (const field of Object.keys(validators) as Array<keyof T>) {
    const validator = validators[field]
    if (validator) {
      const error = validator(values[field], values)
      if (error) errors[field] = error
    }
  }

  return errors
}

export function required(label: string): Validator<FormValues> {
  return (value) => (value.trim() ? '' : `${label} is required`)
}

export function isEmail(value: string): string {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Enter a valid email address'
}

export function minLength(length: number, message: string): Validator<FormValues> {
  return (value) => (value.length >= length ? '' : message)
}
