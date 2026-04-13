import styles from './AuthLayout.module.css'

interface Props {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  return <div className={styles.root}>{children}</div>
}
