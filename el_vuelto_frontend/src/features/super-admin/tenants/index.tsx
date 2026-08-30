import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-toastify'
import {
  useListTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useUploadTenantLogoMutation,
  useDeleteTenantLogoMutation,
} from '@/features/tenants/tenantsApi'
import type { Tenant } from '@/features/tenants/tenantsApi'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import PageLoader from '@/components/ui/PageLoader'
import CredentialsModal from '@/components/ui/CredentialsModal'
import type { CredentialsData } from '@/components/ui/CredentialsModal'
import TenantsTable from './components/TenantsTable'
import TenantLogoField, { revokeLogoDraft, usePastedLogo } from './components/TenantLogoField'
import type { LogoDraft } from './components/TenantLogoField'
import { applyServerErrors, getServerErrorMessage } from '@/utils/applyServerErrors'
import styles from './TenantsPage.module.css'

const createSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  nit: z.string().min(5, 'NIT inválido'),
  ciudad: z.string().min(2, 'Ciudad requerida'),
  correo: z.string().email('Correo inválido'),
  support_number: z.string().max(20).optional(),
  admin_nombre: z.string().min(2, 'Nombre requerido'),
  admin_correo: z.string().email('Correo del administrador inválido'),
})

const editSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  nit: z.string().min(5, 'NIT inválido'),
  ciudad: z.string().min(2, 'Ciudad requerida'),
  correo: z.string().email('Correo inválido'),
  support_number: z.string().max(20).optional(),
})

type CreateFormData = z.infer<typeof createSchema>
type EditFormData = z.infer<typeof editSchema>

const NO_LOGO_CHANGE: LogoDraft = { kind: 'keep' }

export default function TenantsPage() {
  const { data: tenants = [], isLoading, refetch } = useListTenantsQuery()
  const [createTenant, { isLoading: creating }] = useCreateTenantMutation()
  const [updateTenant, { isLoading: updating }] = useUpdateTenantMutation()
  const [uploadLogo, { isLoading: uploadingLogo }] = useUploadTenantLogoMutation()
  const [deleteLogo, { isLoading: deletingLogo }] = useDeleteTenantLogoMutation()
  const navigate = useNavigate()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [editActivo, setEditActivo] = useState(true)
  // Los dos booleanos viven FUERA de react-hook-form, igual que `editActivo`:
  // un switch no es un input registrado. El precio es que hay que anexarlos a
  // mano al body de la mutation — si se olvida, el super admin mueve el switch,
  // ve el toast de éxito y no se guardó nada.
  const [createFactura, setCreateFactura] = useState(false)
  const [editFactura, setEditFactura] = useState(false)
  const [credentials, setCredentials] = useState<CredentialsData | null>(null)

  // The picked file is a `File`, not a form value — same reason `editActivo`
  // lives outside react-hook-form.
  const [createLogo, setCreateLogo] = useState<LogoDraft>(NO_LOGO_CHANGE)
  const [editLogo, setEditLogo] = useState<LogoDraft>(NO_LOGO_CHANGE)

  const createForm = useForm<CreateFormData>({ resolver: zodResolver(createSchema) })
  const editForm = useForm<EditFormData>({ resolver: zodResolver(editSchema) })

  // Every path that drops a draft revokes its object URL first; this only
  // catches the last one if the page unmounts with a modal still open (the
  // superadmin navigates away mid-edit). Empty deps so the cleanup runs on a
  // real unmount — at mount both drafts are `keep`, so `StrictMode`'s extra
  // mount/unmount cycle has nothing to revoke and cannot break a preview.
  const draftsRef = useRef({ create: createLogo, edit: editLogo })
  draftsRef.current = { create: createLogo, edit: editLogo }
  useEffect(
    () => () => {
      revokeLogoDraft(draftsRef.current.create)
      revokeLogoDraft(draftsRef.current.edit)
    },
    [],
  )

  function changeCreateLogo(next: LogoDraft) {
    revokeLogoDraft(createLogo)
    setCreateLogo(next)
  }

  function changeEditLogo(next: LogoDraft) {
    revokeLogoDraft(editLogo)
    setEditLogo(next)
  }

  // Pasting an image (⌘V / Ctrl+V) is the second way into the same `LogoDraft`,
  // so it goes through `changeCreateLogo`/`changeEditLogo` like the file picker
  // — same validation, same preview, same deferred upload, and the previous
  // draft's object URL still gets revoked. Nothing below this line changes.
  //
  // `!showCreateModal` on the edit one: the listener is on `document`, so if
  // both modals were ever open at once the two would fight over the same paste.
  // The UI cannot do that today; the guard makes it not matter if it ever can.
  usePastedLogo(showCreateModal && !creating && !uploadingLogo, changeCreateLogo)
  usePastedLogo(
    !!editingTenant && !showCreateModal && !updating && !uploadingLogo && !deletingLogo,
    changeEditLogo,
  )

  function closeCreateModal() {
    revokeLogoDraft(createLogo)
    setCreateLogo(NO_LOGO_CHANGE)
    // Se limpia TODO junto. Resetear solo el switch dejaba el formulario con
    // los datos escritos y el toggle en `false`: al reabrir, el super admin veía
    // sus datos intactos y creía que el switch seguía como lo había dejado.
    setCreateFactura(false)
    createForm.reset()
    setShowCreateModal(false)
  }

  function closeEditModal() {
    revokeLogoDraft(editLogo)
    setEditLogo(NO_LOGO_CHANGE)
    setEditingTenant(null)
  }

  /** Runs the deferred logo step for a tenant that already exists.
   *  Returns an error message, or `null` when there was nothing to do or it
   *  worked. Never throws: the caller has already committed the tenant data
   *  and must not be rolled back by a Cloudinary problem. */
  async function applyLogoDraft(id: string, draft: LogoDraft): Promise<string | null> {
    try {
      if (draft.kind === 'replace') {
        const formData = new FormData()
        formData.append('logo', draft.file)
        await uploadLogo({ id, formData }).unwrap()
      } else if (draft.kind === 'remove') {
        await deleteLogo({ id }).unwrap()
      }
      return null
    } catch (err) {
      return getServerErrorMessage(err, 'Intenta de nuevo desde el detalle del negocio.')
    }
  }

  async function onCreateSubmit(data: CreateFormData) {
    const result = await createTenant({ ...data, factura_electronica: createFactura })
      .unwrap()
      .catch((err) => {
        applyServerErrors(
          err,
          createForm.setError,
          'No se pudo crear el negocio. Verifica los datos e intenta de nuevo.',
        )
        return null
      })
    if (!result) return

    // The business exists from here on. Nothing below may stop the credentials
    // modal from opening — `initial_admin_password` is shown exactly once and
    // is unrecoverable afterwards, so a failed logo upload must not eat it.
    const logoError = await applyLogoDraft(result.id, createLogo)

    createForm.reset()
    closeCreateModal()
    await refetch()
    setCredentials({
      tenantNombre: result.nombre,
      adminNombre: data.admin_nombre,
      adminCorreo: data.admin_correo,
      password: result.initial_admin_password,
    })
    if (logoError) {
      toast.error(`El negocio se creó, pero el logo no se pudo subir. ${logoError}`)
    }
  }

  function openEditModal(tenant: Tenant) {
    revokeLogoDraft(editLogo)
    setEditingTenant(tenant)
    setEditActivo(tenant.activo)
    setEditFactura(tenant.factura_electronica)
    setEditLogo(NO_LOGO_CHANGE)
    editForm.reset({
      nombre: tenant.nombre,
      nit: tenant.nit,
      ciudad: tenant.ciudad,
      correo: tenant.correo,
      support_number: tenant.support_number ?? '',
    })
  }

  async function onEditSubmit(data: EditFormData) {
    if (!editingTenant) return
    const { id } = editingTenant

    // Data first, logo second: the other order would leave a new logo behind
    // on an edit the server rejected.
    const saved = await updateTenant({
      id,
      ...data,
      activo: editActivo,
      factura_electronica: editFactura,
    })
      .unwrap()
      .then(() => true)
      .catch((err) => {
        applyServerErrors(
          err,
          editForm.setError,
          'No se pudo actualizar el negocio. Intenta de nuevo.',
        )
        return false
      })
    if (!saved) return

    const logoError = await applyLogoDraft(id, editLogo)

    closeEditModal()
    await refetch()
    if (logoError) {
      toast.error(
        `Los datos de "${data.nombre}" se guardaron, pero el logo no se pudo actualizar. ${logoError}`,
      )
    } else {
      toast.success(`"${data.nombre}" actualizado correctamente.`)
    }
  }

  const busy = isLoading || creating || updating || uploadingLogo || deletingLogo

  return (
    <div className={styles.root}>
      <PageLoader show={busy} />

      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.heading}>Negocios</h1>
          <p className={styles.sub}>{tenants.length} sucursales registradas</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>+ Nuevo negocio</Button>
      </div>

      {!isLoading && (
        <TenantsTable
          tenants={tenants}
          onEdit={openEditModal}
          onOpen={(t) => navigate(`/super-admin/tenants/${t.id}`)}
        />
      )}

      {/* ── Create modal ── */}
      <Modal isOpen={showCreateModal} onClose={closeCreateModal} title="Nuevo negocio" size="md">
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className={styles.form} noValidate>
          {/* No `currentUrl`: the tenant does not exist yet, so the only
              reachable states are "nothing picked" and "picked". */}
          <TenantLogoField
            draft={createLogo}
            busy={creating || uploadingLogo}
            onChange={changeCreateLogo}
          />

          <div className={styles.formRow}>
            <Input label="Nombre del negocio" error={createForm.formState.errors.nombre?.message} {...createForm.register('nombre')} />
            <Input label="NIT" error={createForm.formState.errors.nit?.message} {...createForm.register('nit')} />
          </div>
          <div className={styles.formRow}>
            <Input label="Ciudad" error={createForm.formState.errors.ciudad?.message} {...createForm.register('ciudad')} />
            <Input label="Correo del negocio" type="email" error={createForm.formState.errors.correo?.message} {...createForm.register('correo')} />
          </div>
          <div className={styles.formRow}>
            <Input label="Número de soporte (opcional)" error={createForm.formState.errors.support_number?.message} {...createForm.register('support_number')} />
          </div>

          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>¿Emite factura electrónica?</span>
            <button
              type="button"
              role="switch"
              aria-checked={createFactura}
              aria-label="¿Emite factura electrónica?"
              onClick={() => setCreateFactura((v) => !v)}
              className={[styles.toggle, createFactura ? styles.toggleOn : styles.toggleOff].join(' ')}
            >
              <span className={styles.toggleThumb} />
            </button>
            <span className={styles.toggleStatus}>{createFactura ? 'Sí' : 'No'}</span>
          </div>
          <p className={styles.hint}>
            Si está encendido, el recibo del cajero muestra la pregunta
            «¿Requiere factura electrónica?» junto al correo y, si lo tiene cargado,
            al número de soporte del negocio.
          </p>

          <hr className={styles.divider} />
          <p className={styles.sectionLabel}>Administrador inicial</p>
          <div className={styles.formRow}>
            <Input label="Nombre del administrador" error={createForm.formState.errors.admin_nombre?.message} {...createForm.register('admin_nombre')} />
            <Input label="Correo del administrador" type="email" error={createForm.formState.errors.admin_correo?.message} {...createForm.register('admin_correo')} />
          </div>
          <p className={styles.hint}>
            La contraseña se genera automáticamente y se mostrará <strong>una sola vez</strong>.
          </p>
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={closeCreateModal}>Cancelar</Button>
            <Button type="submit" loading={creating || uploadingLogo}>Crear negocio</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit modal ── */}
      <Modal isOpen={!!editingTenant} onClose={closeEditModal} title="Editar negocio" size="md">
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className={styles.form} noValidate>
          <TenantLogoField
            draft={editLogo}
            currentUrl={editingTenant?.logo_url ?? null}
            nombre={editingTenant?.nombre ?? ''}
            busy={updating || uploadingLogo || deletingLogo}
            onChange={changeEditLogo}
          />

          <div className={styles.formRow}>
            <Input label="Nombre del negocio" error={editForm.formState.errors.nombre?.message} {...editForm.register('nombre')} />
            <Input label="NIT" error={editForm.formState.errors.nit?.message} {...editForm.register('nit')} />
          </div>
          <div className={styles.formRow}>
            <Input label="Ciudad" error={editForm.formState.errors.ciudad?.message} {...editForm.register('ciudad')} />
            <Input label="Correo del negocio" type="email" error={editForm.formState.errors.correo?.message} {...editForm.register('correo')} />
          </div>
          <div className={styles.formRow}>
            <Input label="Número de soporte (opcional)" error={editForm.formState.errors.support_number?.message} {...editForm.register('support_number')} />
          </div>

          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>¿Emite factura electrónica?</span>
            <button
              type="button"
              role="switch"
              aria-checked={editFactura}
              aria-label="¿Emite factura electrónica?"
              onClick={() => setEditFactura((v) => !v)}
              className={[styles.toggle, editFactura ? styles.toggleOn : styles.toggleOff].join(' ')}
            >
              <span className={styles.toggleThumb} />
            </button>
            <span className={styles.toggleStatus}>{editFactura ? 'Sí' : 'No'}</span>
          </div>
          <p className={styles.hint}>
            Apagado, el recibo no muestra la pregunta ni los datos de contacto del negocio.
            El cambio se aplica <strong>cuando el cajero vuelva a iniciar sesión</strong>:
            una caja que ya está abierta sigue imprimiendo como antes hasta ese momento.
          </p>

          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Estado del negocio</span>
            <button
              type="button"
              role="switch"
              aria-checked={editActivo}
              onClick={() => setEditActivo((v) => !v)}
              className={[styles.toggle, editActivo ? styles.toggleOn : styles.toggleOff].join(' ')}
            >
              <span className={styles.toggleThumb} />
            </button>
            <span className={styles.toggleStatus}>
              {editActivo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={closeEditModal}>Cancelar</Button>
            <Button type="submit" loading={updating || uploadingLogo || deletingLogo}>Guardar cambios</Button>
          </div>
        </form>
      </Modal>

      {/* ── Credentials modal (shown once after tenant creation) ── */}
      <CredentialsModal data={credentials} onClose={() => setCredentials(null)} />
    </div>
  )
}
