import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-toastify'
import {
  useListTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useUploadTenantLogoMutation,
} from '@/features/tenants/tenantsApi'
import type { Tenant } from '@/features/tenants/tenantsApi'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import PageLoader from '@/components/ui/PageLoader'
import CredentialsModal from '@/components/ui/CredentialsModal'
import type { CredentialsData } from '@/components/ui/CredentialsModal'
import TenantsTable from './components/TenantsTable'
import styles from './TenantsPage.module.css'

const createSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  nit: z.string().min(5, 'NIT inválido'),
  ciudad: z.string().min(2, 'Ciudad requerida'),
  correo: z.string().email('Correo inválido'),
  admin_nombre: z.string().min(2, 'Nombre requerido'),
  admin_correo: z.string().email('Correo del administrador inválido'),
})

const editSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  nit: z.string().min(5, 'NIT inválido'),
  ciudad: z.string().min(2, 'Ciudad requerida'),
  correo: z.string().email('Correo inválido'),
})

type CreateFormData = z.infer<typeof createSchema>
type EditFormData = z.infer<typeof editSchema>

export default function TenantsPage() {
  const { data: tenants = [], isLoading, refetch } = useListTenantsQuery()
  const [createTenant, { isLoading: creating }] = useCreateTenantMutation()
  const [updateTenant, { isLoading: updating }] = useUpdateTenantMutation()
  const [uploadLogo, { isLoading: uploading }] = useUploadTenantLogoMutation()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [editActivo, setEditActivo] = useState(true)
  const [credentials, setCredentials] = useState<CredentialsData | null>(null)

  // Logo file state for create and edit modals
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null)
  const [createLogoPreview, setCreateLogoPreview] = useState<string | null>(null)
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null)
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null)

  const createLogoInputRef = useRef<HTMLInputElement>(null)
  const editLogoInputRef = useRef<HTMLInputElement>(null)

  const createForm = useForm<CreateFormData>({ resolver: zodResolver(createSchema) })
  const editForm = useForm<EditFormData>({ resolver: zodResolver(editSchema) })

  function handleLogoFile(
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
  ) {
    if (!file) return
    setFile(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  async function onCreateSubmit(data: CreateFormData) {
    try {
      const result = await createTenant(data).unwrap()

      if (createLogoFile) {
        const fd = new FormData()
        fd.append('logo', createLogoFile)
        await uploadLogo({ id: result.id, formData: fd }).unwrap()
      }

      createForm.reset()
      setCreateLogoFile(null)
      setCreateLogoPreview(null)
      setShowCreateModal(false)
      await refetch()
      setCredentials({
        tenantNombre: result.nombre,
        adminNombre: data.admin_nombre,
        adminCorreo: data.admin_correo,
        password: result.initial_admin_password,
      })
    } catch {
      toast.error('No se pudo crear el negocio. Verifica los datos e intenta de nuevo.')
    }
  }

  function openEditModal(tenant: Tenant) {
    setEditingTenant(tenant)
    setEditActivo(tenant.activo)
    setEditLogoFile(null)
    setEditLogoPreview(tenant.logo_url ?? null)
    editForm.reset({
      nombre: tenant.nombre,
      nit: tenant.nit,
      ciudad: tenant.ciudad,
      correo: tenant.correo,
    })
  }

  async function onEditSubmit(data: EditFormData) {
    if (!editingTenant) return
    try {
      await updateTenant({ id: editingTenant.id, ...data, activo: editActivo }).unwrap()

      if (editLogoFile) {
        const fd = new FormData()
        fd.append('logo', editLogoFile)
        await uploadLogo({ id: editingTenant.id, formData: fd }).unwrap()
      }

      setEditingTenant(null)
      setEditLogoFile(null)
      setEditLogoPreview(null)
      await refetch()
      toast.success(`"${data.nombre}" actualizado correctamente.`)
    } catch {
      toast.error('No se pudo actualizar el negocio. Intenta de nuevo.')
    }
  }

  const busy = isLoading || creating || updating || uploading

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
        <TenantsTable tenants={tenants} onEdit={openEditModal} />
      )}

      {/* ── Create modal ── */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo negocio" size="md">
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className={styles.form} noValidate>
          <div className={styles.formRow}>
            <Input label="Nombre del negocio" error={createForm.formState.errors.nombre?.message} {...createForm.register('nombre')} />
            <Input label="NIT" error={createForm.formState.errors.nit?.message} {...createForm.register('nit')} />
          </div>
          <div className={styles.formRow}>
            <Input label="Ciudad" error={createForm.formState.errors.ciudad?.message} {...createForm.register('ciudad')} />
            <Input label="Correo del negocio" type="email" error={createForm.formState.errors.correo?.message} {...createForm.register('correo')} />
          </div>

          {/* Logo upload */}
          <div className={styles.logoUpload}>
            <span className={styles.logoUploadLabel}>Logo del negocio (opcional)</span>
            <div className={styles.logoUploadArea}>
              {createLogoPreview ? (
                <img src={createLogoPreview} alt="Logo preview" className={styles.logoPreview} />
              ) : (
                <div className={styles.logoPlaceholder}>🖼</div>
              )}
              <div>
                <input
                  ref={createLogoInputRef}
                  type="file"
                  accept="image/*"
                  className={styles.logoFileInput}
                  onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null, setCreateLogoFile, setCreateLogoPreview)}
                />
                <button type="button" className={styles.logoUploadBtn} onClick={() => createLogoInputRef.current?.click()}>
                  {createLogoFile ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </button>
                {createLogoFile && (
                  <p className={styles.logoFileName}>{createLogoFile.name}</p>
                )}
              </div>
            </div>
          </div>

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
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button type="submit" loading={creating || uploading}>Crear negocio</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit modal ── */}
      <Modal isOpen={!!editingTenant} onClose={() => setEditingTenant(null)} title="Editar negocio" size="md">
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className={styles.form} noValidate>
          <div className={styles.formRow}>
            <Input label="Nombre del negocio" error={editForm.formState.errors.nombre?.message} {...editForm.register('nombre')} />
            <Input label="NIT" error={editForm.formState.errors.nit?.message} {...editForm.register('nit')} />
          </div>
          <div className={styles.formRow}>
            <Input label="Ciudad" error={editForm.formState.errors.ciudad?.message} {...editForm.register('ciudad')} />
            <Input label="Correo del negocio" type="email" error={editForm.formState.errors.correo?.message} {...editForm.register('correo')} />
          </div>

          {/* Logo upload */}
          <div className={styles.logoUpload}>
            <span className={styles.logoUploadLabel}>Logo del negocio</span>
            <div className={styles.logoUploadArea}>
              {editLogoPreview ? (
                <img src={editLogoPreview} alt="Logo preview" className={styles.logoPreview} />
              ) : (
                <div className={styles.logoPlaceholder}>🖼</div>
              )}
              <div>
                <input
                  ref={editLogoInputRef}
                  type="file"
                  accept="image/*"
                  className={styles.logoFileInput}
                  onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null, setEditLogoFile, setEditLogoPreview)}
                />
                <button type="button" className={styles.logoUploadBtn} onClick={() => editLogoInputRef.current?.click()}>
                  {editLogoPreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
                </button>
                {editLogoFile && (
                  <p className={styles.logoFileName}>{editLogoFile.name}</p>
                )}
              </div>
            </div>
          </div>

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
            <Button type="button" variant="secondary" onClick={() => setEditingTenant(null)}>Cancelar</Button>
            <Button type="submit" loading={updating || uploading}>Guardar cambios</Button>
          </div>
        </form>
      </Modal>

      {/* ── Credentials modal (shown once after tenant creation) ── */}
      <CredentialsModal data={credentials} onClose={() => setCredentials(null)} />
    </div>
  )
}
