import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'tertiary'
  children: ReactNode
  fullWidth?: boolean
}

export function Button({ variant = 'primary', fullWidth = false, className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`button button--${variant}${fullWidth ? ' button--full' : ''} ${className}`} {...props}>
      {children}
    </button>
  )
}
