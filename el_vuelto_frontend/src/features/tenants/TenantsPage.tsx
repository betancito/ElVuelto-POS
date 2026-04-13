import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useListTenantsQuery, useCreateTenantMutation, useToggleTenantActiveMutation } from './tenantsApi'
import { generateAdminPassword } from '@/utils/generatePassword'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import styles from './TenantsPage.module.css'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  nit: z.string().min(5, 'NIT inválido'),
  ciudad: z.string().min(2, 'Ciudad requerida'),
  correo: z.string().email('Correo inválido'),
  admin_nombre: z.string().min(2, 'Nombre requerido'),
  admin_correo: z.string().email('Correo admin inválido'),
})

type FormData = z.infer<typeof schema>

export default function TenantsPage() {
  const { data: tenants, isLoading } = useListTenantsQuery()
  const [createTenant, { isLoading: creating }] = useCreateTenantMutation()
  const [toggleActive] = useToggleTenantActiveMutation()

  const [showModal, setShowModal] = useState(false)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const password = generateAdminPassword()
    try {
      await createTenant({ ...data, admin_password: password }).unwrap()
      setCreatedPassword(password)
      reset()
      setShowModal(false)
    } catch {}
  }

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.heading}>Negocios</h1>
          <p className={styles.sub}>{tenants?.length ?? 0} sucursales registradas</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <span className="material-symbols-outlined">add</span>
          Nuevo negocio
        </Button>
      </div>

      {/* Generated password banner */}
      {createdPassword && (
        <div className={styles.passwordBanner}>
          <span className="material-symbols-outlined">key</span>
          <div>
            <strong>Negocio creado.</strong> Contraseña del administrador:{' '}
            <code className={styles.pw}>{createdPassword}</code>
            <span className={styles.pwWarning}> — No se puede recuperar. Entréguala ahora.</span>
          </div>
          <button className={styles.closeBanner} onClick={() => setCreatedPassword(null)}>
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
                <th>Negocio</th>
                <th>NIT</th>
                <th>Ciudad</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(tenants ?? []).map((t) => (
                <tr key={t.id}>
                  <td className={styles.tenantName}>{t.nombre}</td>
                  <td>{t.nit}</td>
                  <td>{t.ciudad}</td>
                  <td>{t.correo}</td>
                  <td>
                    <Badge variant={t.activo ? 'success' : 'neutral'}>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(t.id)}
                    >
                      {t.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create tenant modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo negocio" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className={styles.formRow}>
            <Input label="Nombre del negocio" error={errors.nombre?.message} {...register('nombre')} />
            <Input label="NIT" error={errors.nit?.message} {...register('nit')} />
          </div>
          <div className={styles.formRow}>
            <Input label="Ciudad" error={errors.ciudad?.message} {...register('ciudad')} />
            <Input label="Correo del negocio" type="email" error={errors.correo?.message} {...register('correo')} />
          </div>
          <hr className={styles.divider} />
          <p className={styles.sectionLabel}>Administrador inicial</p>
          <div className={styles.formRow}>
            <Input label="Nombre" error={errors.admin_nombre?.message} {...register('admin_nombre')} />
            <Input label="Correo" type="email" error={errors.admin_correo?.message} {...register('admin_correo')} />
          </div>
          <p className={styles.hint}>
            Se generará una contraseña automática y se mostrará <strong>una sola vez</strong>.
          </p>
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={creating}>Crear negocio</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
