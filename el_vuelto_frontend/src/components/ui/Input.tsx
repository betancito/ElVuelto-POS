import { forwardRef } from 'react'
import styles from './Input.module.css'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: string
  rightElement?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, leftIcon, rightElement, className = '', id, ...rest },
  ref,
) {
  const inputId = id ?? `input-${label?.toLowerCase().replace(/\s+/g, '-') ?? Math.random()}`
  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={[styles.inputWrap, error ? styles.hasError : ''].filter(Boolean).join(' ')}>
        {leftIcon && <span className={`material-symbols-outlined ${styles.leftIcon}`}>{leftIcon}</span>}
        <input ref={ref} id={inputId} className={[styles.input, className].join(' ')} {...rest} />
        {rightElement && <div className={styles.rightElement}>{rightElement}</div>}
      </div>
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
})

export default Input
