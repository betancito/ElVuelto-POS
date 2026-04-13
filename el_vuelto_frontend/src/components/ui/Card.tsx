import styles from './Card.module.css'

interface Props {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: Props) {
  return (
    <div
      className={[styles.card, onClick ? styles.clickable : '', className].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
