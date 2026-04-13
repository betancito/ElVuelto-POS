import styles from './Badge.module.css'

type Variant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface Props {
  variant?: Variant
  children: React.ReactNode
}

export default function Badge({ variant = 'neutral', children }: Props) {
  return <span className={[styles.badge, styles[variant]].join(' ')}>{children}</span>
}
