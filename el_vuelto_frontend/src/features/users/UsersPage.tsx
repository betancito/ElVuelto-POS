import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useListUsersQuery,
  useCreateUserMutation,
  useToggleUserActiveMutation,
  useResetPasswordMutation,
} from './usersApi'
import { generateAdminPassword, generatePin } from '@/utils/generatePassword'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import styles from './UsersPage.module.css'

const schema = z.object({
  nombre: z.string().min(2),
  rol: z.enum(['ADMIN', 'CAJERO']),
  correo: z.string().email().optional().or(z.literal('')),
  cedula: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function UsersPage() {
  const { data: users, isLoading } = useListUsersQuery()
  const [createUser, { isLoading: creating }] = useCreateUserMutation()
  const [toggleActive] = useToggleUserActiveMutation()
  const [resetPassword] = useResetPasswordMutation()

  const [showModal, setShowModal] = useState(false)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<{ userId: string; pw: string } | null>(null)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { rol: 'CAJERO' },
  })

  const rol = watch('rol')

  async function onSubmit(data: FormData) {
    const password = data.rol === 'CAJERO' ? generatePin() : generateAdminPassword()
    try {
      await createUser({ ...data, password }).unwrap()
      setCreatedPassword(password)
      reset()
      setShowModal(false)
    } catch {}
  }

  async function handleReset(id: string) {
    const r = await resetPassword(id).unwrap()
    setResetResult({ userId: id, pw: r.new_password })
  }

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.heading}>Personal</h1>
          <p className={styles.sub}>{users?.length ?? 0} usuarios</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <span className="material-symbols-outlined">person_add</span>
          Nuevo usuario
        </Button>
      </div>

      {/* Password banners */}
      {createdPassword && (
        <div className={styles.banner}>
          <span className="material-symbols-outlined">key</span>
          <div>
            Usuario creado. Contraseña/PIN:{' '}
            <code className={styles.pw}>{createdPassword}</code>
            <span className={styles.warn}> — Entregar ahora, no se puede recuperar.</span>
          </div>
          <button className={styles.closeBtn} onClick={() => setCreatedPassword(null)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {resetResult && (
        <div className={styles.banner}>
          <span className="material-symbols-outlined">lock_reset</span>
          <div>
            Nueva contraseña:{' '}
            <code className={styles.pw}>{resetResult.pw}</code>
            <span className={styles.warn}> — Entregar ahora.</span>
          </div>
          <button className={styles.closeBtn} onClick={() => setResetResult(null)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}><Spinner /></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Correo</th>
                <th>Cédula</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id}>
                  <td className={styles.name}>{u.nombre}</td>
                  <td>
                    <Badge variant={u.rol === 'ADMIN' ? 'info' : 'neutral'}>{u.rol}</Badge>
                  </td>
                  <td>{u.correo ?? '—'}</td>
                  <td>{u.cedula ?? '—'}</td>
                  <td>
                    <Badge variant={u.activo ? 'success' : 'neutral'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(u.id)}>
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleReset(u.id)}>
                        Reset
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo usuario">
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className={styles.formRow}>
            <Input label="Nombre completo" error={errors.nombre?.message} {...register('nombre')} />
            <div className={styles.field}>
              <label className={styles.label}>Rol</label>
              <select className={styles.select} {...register('rol')}>
                <option value="CAJERO">Cajero</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          {rol === 'ADMIN' ? (
            <Input label="Correo (para login)" type="email" error={errors.correo?.message} {...register('correo')} />
          ) : (
            <Input label="Cédula (para login)" error={errors.cedula?.message} {...register('cedula')} />
          )}
          <p className={styles.hint}>
            {rol === 'CAJERO'
              ? 'Se generará un PIN de 4 dígitos automáticamente.'
              : 'Se generará una contraseña automáticamente.'}
          </p>
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={creating}>Crear usuario</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
