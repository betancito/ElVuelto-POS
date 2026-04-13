import styles from './Spinner.module.css'

interface Props {
  size?: 'sm' | 'md' | 'lg'
}

export default function Spinner({ size = 'md' }: Props) {
  return <div className={[styles.spinner, styles[size]].join(' ')} role="status" aria-label="Cargando" />
}
