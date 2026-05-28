import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useListProductsQuery,
  useListCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadProductImageMutation,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useUploadCategoryImageMutation,
} from './productsApi'
import { formatCOP } from '@/utils/formatCOP'
import Spinner from '@/components/ui/Spinner'
import type { Product, Category, ProductPayload } from './productsApi'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined'
import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'

// ─── Schemas ────────────────────────────────────────────────────────
const productSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  category: z.string().min(1, 'Selecciona una categoría'),
  tipo: z.enum(['SIN_CODIGO', 'CON_CODIGO']),
  precio_venta: z.string().min(1, 'Requerido'),
  precio_costo: z.string().optional(),
  barcode: z.string().optional(),
  proveedor: z.string().optional(),
})
type ProductFormData = z.infer<typeof productSchema>

const categorySchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
})
type CategoryFormData = z.infer<typeof categorySchema>

type Tab = 'products' | 'categories'

// ─── Root page ───────────────────────────────────────────────────────
export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('products')

  return (
    <div className="ta-page">
      <div className="ta-page-hero">
        <div>
          <h1 className="ta-page-title">Productos y Categorías</h1>
          <p className="ta-page-sub">Gestiona el catálogo de productos y sus categorías.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--outline-variant)' }}>
        {(
          [
            { key: 'products' as Tab, label: 'Productos', Icon: InventoryOutlinedIcon },
            { key: 'categories' as Tab, label: 'Categorías', Icon: CategoryOutlinedIcon },
          ]
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: activeTab === key ? 700 : 500,
              color: activeTab === key ? 'var(--primary)' : 'var(--on-surface-variant)',
              borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'color 0.15s',
            }}
          >
            <Icon fontSize="small" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'products' ? <ProductsTab /> : <CategoriesTab />}
    </div>
  )
}

// ─── Products Tab ────────────────────────────────────────────────────
function ProductsTab() {
  const { data: products, isLoading } = useListProductsQuery()
  const { data: categories } = useListCategoriesQuery()
  const [createProduct] = useCreateProductMutation()
  const [updateProduct] = useUpdateProductMutation()
  const [deleteProduct] = useDeleteProductMutation()
  const [uploadProductImage] = useUploadProductImageMutation()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('Todos')
  const imageInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { tipo: 'SIN_CODIGO' },
  })
  const tipo = watch('tipo')

  function openCreate() {
    setEditing(null)
    setImageFile(null)
    setImagePreview(null)
    setImageError('')

    reset({ tipo: 'SIN_CODIGO', nombre: '', precio_venta: '', precio_costo: '' })
    setShowModal(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setImageFile(null)
    setImagePreview(p.imagen_url ?? null)
    setImageError('')

    reset({
      nombre: p.nombre,
      category: p.category ?? '',
      tipo: p.tipo,
      precio_venta: p.precio_venta,
      precio_costo: p.precio_costo ?? '',
      barcode: p.barcode ?? '',
      proveedor: p.proveedor ?? '',
    })
    setShowModal(true)
  }

  function handleImageFile(file: File | null) {
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageError('')
  }

  function handlePaste(e: React.ClipboardEvent) {
    const imageItem = Array.from(e.clipboardData.items).find((item) => item.type.startsWith('image/'))
    if (imageItem) handleImageFile(imageItem.getAsFile())
  }

  async function onSubmit(data: ProductFormData) {
    if (!editing && !imageFile) {
      setImageError('La imagen es obligatoria para crear un producto.')
      return
    }
    setSubmitting(true)
    try {
      const payload: ProductPayload = {
        nombre: data.nombre,
        tipo: data.tipo,
        precio_venta: data.precio_venta,
        category: data.category,
        precio_costo: data.precio_costo || null,
        barcode: tipo === 'CON_CODIGO' ? (data.barcode || null) : null,
        proveedor: tipo === 'CON_CODIGO' ? (data.proveedor || null) : null,
      }

      let productId: string
      if (editing) {
        await updateProduct({ id: editing.id, ...payload }).unwrap()
        productId = editing.id
      } else {
        const created = await createProduct(payload).unwrap()
        productId = created.id
      }

      if (imageFile) {
        const fd = new FormData()
        fd.append('image', imageFile)
        await uploadProductImage({ id: productId, formData: fd }).unwrap()
      }

      setShowModal(false)
      reset()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const categoryNames = ['Todos', ...(categories ?? []).map((c) => c.nombre)]
  const filtered = (products ?? []).filter((p) => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase())
    const matchFilter = activeFilter === 'Todos' || p.category_nombre === activeFilter
    return matchSearch && matchFilter
  })

  return (
    <>
      {/* Search + action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: '24rem', flex: 1 }}>
          <SearchOutlinedIcon style={{
            position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--outline)', fontSize: '1.125rem', pointerEvents: 'none',
          }} />
          <input
            className="ta-input"
            style={{ paddingLeft: '2.5rem', borderRadius: 'var(--radius-lg)' }}
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="ta-btn ta-btn-primary" onClick={openCreate}>
          <AddCircleOutlineIcon style={{ fontSize: '1.125rem' }} />
          Nuevo producto
        </button>
      </div>

      {/* Category filter chips */}
      <div className="ta-chips">
        {categoryNames.map((name) => (
          <button
            key={name}
            className={`ta-chip${activeFilter === name ? ' ta-chip-active' : ''}`}
            onClick={() => setActiveFilter(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Card grid grouped by category */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <p className="ta-empty">
          {search ? `No hay resultados para "${search}"` : 'Sin productos registrados'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {(() => {
            const groups: Record<string, typeof filtered> = {}
            filtered.forEach((p) => {
              const key = p.category_nombre ?? 'Sin categoría'
              if (!groups[key]) groups[key] = []
              groups[key].push(p)
            })
            return Object.entries(groups).map(([catName, prods]) => (
              <div key={catName}>
                <h2
                  className="ta-serif"
                  style={{
                    fontSize: '1.375rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    marginBottom: '1rem',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid var(--outline-variant)',
                  }}
                >
                  {catName}
                  <span
                    className="ta-mono ta-mono--muted"
                    style={{ fontSize: '0.875rem', fontWeight: 400, marginLeft: '0.75rem' }}
                  >
                    {prods.length} {prods.length === 1 ? 'producto' : 'productos'}
                  </span>
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {prods.map((p) => (
                    <div
                      key={p.id}
                      className="ta-card"
                      style={{ padding: '1.25rem', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                      onClick={() => openEdit(p)}
                      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(106,38,0,0.12)')}
                      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '')}
                    >
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          marginBottom: '0.875rem',
                          background: 'var(--surface-container)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {p.imagen_url ? (
                          <img
                            src={p.imagen_url}
                            alt={p.nombre}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <InventoryOutlinedIcon
                            style={{ fontSize: '2.5rem', color: 'var(--on-surface-variant)', opacity: 0.4 }}
                          />
                        )}
                      </div>

                      <p
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          color: 'var(--on-surface)',
                          marginBottom: '0.5rem',
                          lineHeight: 1.3,
                        }}
                      >
                        {p.nombre}
                      </p>

                      <div style={{ marginBottom: '0.625rem' }}>
                        <div className={`ta-status ta-status--${p.activo ? 'active' : 'inactive'}`}>
                          <span className="ta-status-dot" />
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </div>
                      </div>

                      <p className="ta-mono ta-mono--primary" style={{ fontSize: '1rem', fontWeight: 700 }}>
                        {formatCOP(parseFloat(p.precio_venta))}
                      </p>

                      {p.tipo === 'CON_CODIGO' && (
                        <p
                          className="ta-mono ta-mono--muted"
                          style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}
                        >
                          Stock: {p.stock_actual} u.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <ConfirmModal
          title="Eliminar producto"
          message="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
          onConfirm={async () => { await deleteProduct(deletingId); setDeletingId(null) }}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <div className="ta-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="ta-modal ta-modal--lg">
            <div className="ta-modal-header">
              <div>
                <h3 className="ta-modal-title">{editing ? 'Editar producto' : 'Nuevo producto'}</h3>
                <p className="ta-modal-sub">
                  {editing ? 'Modifica los datos del producto.' : 'Completa los campos para registrar el producto.'}
                </p>
              </div>
              <button className="ta-btn-icon" onClick={() => setShowModal(false)}>
                <CloseIcon style={{ fontSize: '1.25rem' }} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              onPaste={handlePaste}
              noValidate
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
            >
              <div className="ta-modal-body">

                {/* Image upload */}
                <ImageUploadField
                  label={`Imagen del producto${!editing ? ' *' : ''}`}
                  hint={editing ? 'Opcional — solo si deseas cambiarla' : 'Requerida'}
                  preview={imagePreview}
                  fileName={imageFile?.name ?? null}
                  error={imageError}
                  inputRef={imageInputRef}
                  onChange={handleImageFile}
                />

                {/* Name + category */}
                <div className="ta-form-grid">
                  <div className="ta-field">
                    <label className="ta-label">Nombre del producto</label>
                    <input className="ta-input" placeholder="Ej: Pan de Bono Premium" {...register('nombre')} />
                    {errors.nombre && <span className="ta-field-error">{errors.nombre.message}</span>}
                  </div>
                  <div className="ta-field">
                    <label className="ta-label">Categoría <span style={{ color: 'var(--error)' }}>*</span></label>
                    <CategorySelect
                      categories={categories ?? []}
                      value={watch('category') ?? ''}
                      onChange={(id) => setValue('category', id, { shouldValidate: true })}
                    />
                    {errors.category && <span className="ta-field-error">{errors.category.message}</span>}
                  </div>
                </div>

                {/* IVA notice */}
                <div className="ta-info-note" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <InfoOutlinedIcon style={{ fontSize: '1.125rem', color: 'var(--primary)', flexShrink: 0, marginTop: '0.125rem' }} />
                  <p className="ta-info-text">
                    <strong>IVA 19% incluido:</strong> El precio de venta debe ser el precio final al consumidor con el IVA ya aplicado. No ingreses el precio base sin impuesto.
                  </p>
                </div>

                {/* Barcode toggle */}
                <div style={{
                  background: 'rgba(254,206,165,0.2)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--secondary-container)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '3rem', height: '3rem', background: 'var(--secondary-container)',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <QrCodeScannerOutlinedIcon style={{ color: 'var(--on-secondary-container)' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: 'var(--on-secondary-container)' }}>Producto con código de barras</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--on-secondary-container)', opacity: 0.8 }}>
                        Permite escaneo rápido y control de stock unitario.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Sin código</span>
                    <label className="ta-toggle-wrap">
                      <div className={`ta-toggle-track${tipo === 'CON_CODIGO' ? ' ta-toggle-track--on' : ''}`}>
                        <div className="ta-toggle-thumb" />
                      </div>
                      <input
                        type="checkbox"
                        style={{ display: 'none' }}
                        checked={tipo === 'CON_CODIGO'}
                        onChange={(e) => setValue('tipo', e.target.checked ? 'CON_CODIGO' : 'SIN_CODIGO')}
                      />
                    </label>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Con código</span>
                  </div>
                </div>

                {/* Price / cost / barcode / proveedor */}
                <div className="ta-form-grid">
                  <div className="ta-field">
                    <label className="ta-label">Precio de venta – IVA 19% incluido (COP)</label>
                    <PriceInput
                      value={watch('precio_venta') ?? ''}
                      onChange={(val) => setValue('precio_venta', val, { shouldValidate: true })}
                    />
                    {errors.precio_venta && <span className="ta-field-error">{errors.precio_venta.message}</span>}
                  </div>
                  <div className="ta-field">
                    <label className="ta-label">
                      Precio de costo (COP)
                      {tipo === 'SIN_CODIGO' && (
                        <span style={{ fontWeight: 400, color: 'var(--on-surface-variant)', marginLeft: '0.25rem' }}>(opcional)</span>
                      )}
                    </label>
                    <PriceInput
                      value={watch('precio_costo') ?? ''}
                      onChange={(val) => setValue('precio_costo', val)}
                    />
                  </div>
                  {tipo === 'CON_CODIGO' && (
                    <>
                      <div className="ta-field">
                        <label className="ta-label">Código de barras (EAN)</label>
                        <BarcodeField
                          value={watch('barcode') ?? ''}
                          onChange={(code) => setValue('barcode', code)}
                        />
                      </div>
                      <div className="ta-field">
                        <label className="ta-label">Proveedor</label>
                        <input className="ta-input" placeholder="Nombre del proveedor" {...register('proveedor')} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="ta-modal-footer">
                <button type="button" className="ta-btn ta-btn-ghost" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ta-btn ta-btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Categories Tab ──────────────────────────────────────────────────
function CategoriesTab() {
  const { data: products } = useListProductsQuery()
  const { data: categories, isLoading } = useListCategoriesQuery()
  const [createCategory] = useCreateCategoryMutation()
  const [updateCategory] = useUpdateCategoryMutation()
  const [deleteCategory] = useDeleteCategoryMutation()
  const [uploadCategoryImage] = useUploadCategoryImageMutation()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  })

  const productCountByCategory = (products ?? []).reduce<Record<string, number>>((acc, p) => {
    if (p.category) acc[p.category] = (acc[p.category] ?? 0) + 1
    return acc
  }, {})

  function openCreate() {
    setEditing(null)
    setImageFile(null)
    setImagePreview(null)
    setImageError('')
    reset({ nombre: '' })
    setShowModal(true)
  }

  function openEdit(c: Category) {
    setEditing(c)
    setImageFile(null)
    setImagePreview(c.imagen_url ?? null)
    setImageError('')
    reset({ nombre: c.nombre })
    setShowModal(true)
  }

  function handleImageFile(file: File | null) {
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageError('')
  }

  function handlePaste(e: React.ClipboardEvent) {
    const imageItem = Array.from(e.clipboardData.items).find((item) => item.type.startsWith('image/'))
    if (imageItem) handleImageFile(imageItem.getAsFile())
  }

  async function onSubmit(data: CategoryFormData) {
    if (!editing && !imageFile) {
      setImageError('La imagen es obligatoria para crear una categoría.')
      return
    }
    setSubmitting(true)
    try {
      let catId: string
      if (editing) {
        await updateCategory({ id: editing.id, nombre: data.nombre }).unwrap()
        catId = editing.id
      } else {
        const created = await createCategory({ nombre: data.nombre }).unwrap()
        catId = created.id
      }

      if (imageFile) {
        const fd = new FormData()
        fd.append('image', imageFile)
        await uploadCategoryImage({ id: catId, formData: fd }).unwrap()
      }

      setShowModal(false)
      reset()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Action row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="ta-btn ta-btn-primary" onClick={openCreate}>
          <AddCircleOutlineIcon style={{ fontSize: '1.125rem' }} />
          Nueva categoría
        </button>
      </div>

      {/* Card grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
      ) : (categories ?? []).length === 0 ? (
        <p className="ta-empty">Sin categorías registradas</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {(categories ?? []).map((c) => (
            <div
              key={c.id}
              className="ta-card"
              style={{ padding: '1.25rem', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onClick={() => openEdit(c)}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(106,38,0,0.12)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '')}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  marginBottom: '0.875rem',
                  background: 'var(--surface-container)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {c.imagen_url ? (
                  <img
                    src={c.imagen_url}
                    alt={c.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <CategoryOutlinedIcon
                    style={{ fontSize: '2.5rem', color: 'var(--on-surface-variant)', opacity: 0.4 }}
                  />
                )}
              </div>

              <p
                style={{
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  color: 'var(--on-surface)',
                  marginBottom: '0.375rem',
                }}
              >
                {c.nombre}
              </p>

              <p className="ta-mono ta-mono--muted" style={{ fontSize: '0.8125rem' }}>
                {productCountByCategory[c.id] ?? 0}{' '}
                {(productCountByCategory[c.id] ?? 0) === 1 ? 'producto' : 'productos'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <ConfirmModal
          title="Eliminar categoría"
          message="¿Estás seguro de que deseas eliminar esta categoría? Los productos asociados quedarán sin categoría."
          onConfirm={async () => { await deleteCategory(deletingId); setDeletingId(null) }}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <div className="ta-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="ta-modal">
            <div className="ta-modal-header">
              <div>
                <h3 className="ta-modal-title">{editing ? 'Editar categoría' : 'Nueva categoría'}</h3>
                <p className="ta-modal-sub">
                  {editing ? 'Modifica los datos de la categoría.' : 'Crea una nueva categoría para organizar tus productos.'}
                </p>
              </div>
              <button className="ta-btn-icon" onClick={() => setShowModal(false)}>
                <CloseIcon style={{ fontSize: '1.25rem' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} onPaste={handlePaste} noValidate>
              <div className="ta-modal-body">
                <ImageUploadField
                  label={`Imagen de la categoría${!editing ? ' *' : ''}`}
                  hint={editing ? 'Opcional — solo si deseas cambiarla' : 'Requerida'}
                  preview={imagePreview}
                  fileName={imageFile?.name ?? null}
                  error={imageError}
                  inputRef={imageInputRef}
                  onChange={handleImageFile}
                />

                <div className="ta-field">
                  <label className="ta-label">Nombre de la categoría</label>
                  <input className="ta-input" placeholder="Ej: Panadería" {...register('nombre')} />
                  {errors.nombre && <span className="ta-field-error">{errors.nombre.message}</span>}
                </div>
              </div>

              <div className="ta-modal-footer">
                <button type="button" className="ta-btn ta-btn-ghost" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ta-btn ta-btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Category select ────────────────────────────────────────────────
function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = categories.find((c) => c.id === value) ?? null

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const triggerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    background: 'var(--surface-container-highest)',
    border: 'none',
    borderBottom: `1.5px solid ${open ? 'var(--primary)' : 'var(--outline-variant)'}`,
    borderRadius: '8px 8px 0 0',
    padding: '0.5rem 0.875rem',
    cursor: 'pointer',
    textAlign: 'left',
    minHeight: '2.75rem',
    transition: 'border-color 0.15s',
  }

  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.5rem 1rem',
    border: 'none',
    borderBottom: '1px solid var(--outline-variant)',
    background: active ? 'var(--surface-container-low)' : 'var(--surface)',
    cursor: 'pointer',
    textAlign: 'left',
    minHeight: '3.25rem',
  })

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button type="button" style={triggerStyle} onClick={() => setOpen((o) => !o)}>
        {selected ? (
          <>
            {selected.imagen_url ? (
              <img
                src={selected.imagen_url}
                alt={selected.nombre}
                style={{ width: '1.75rem', height: '1.75rem', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: '1.75rem', height: '1.75rem', borderRadius: '4px',
                background: 'var(--surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <CategoryOutlinedIcon style={{ fontSize: '1rem', color: 'var(--on-surface-variant)' }} />
              </div>
            )}
            <span style={{ fontSize: '0.9375rem', color: 'var(--on-surface)', flex: 1 }}>{selected.nombre}</span>
          </>
        ) : (
          <span style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)', flex: 1 }}>Selecciona una categoría…</span>
        )}
        <ChevronIcon open={open} />
      </button>

      {/* Dropdown list */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 2px)',
          left: 0,
          right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 200,
          overflowY: 'auto',
          maxHeight: 'calc(3.25rem * 4)',
        }}>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              style={itemStyle(value === c.id)}
              onClick={() => { onChange(c.id); setOpen(false) }}
            >
              {c.imagen_url ? (
                <img
                  src={c.imagen_url}
                  alt={c.nombre}
                  style={{ width: '2.25rem', height: '2.25rem', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: '2.25rem', height: '2.25rem', borderRadius: '6px',
                  background: 'var(--surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <CategoryOutlinedIcon style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)' }} />
                </div>
              )}
              <span style={{
                fontSize: '0.9375rem',
                color: 'var(--on-surface)',
                fontWeight: value === c.id ? 700 : 400,
              }}>
                {c.nombre}
              </span>
              {value === c.id && (
                <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="var(--on-surface-variant)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─── Camera-based barcode scanner ─────────────────────────────────────
declare class BarcodeDetector {
  static getSupportedFormats(): Promise<string[]>
  constructor(options?: { formats: string[] })
  detect(image: HTMLVideoElement): Promise<Array<{ rawValue: string; format: string }>>
}

interface CameraScannerProps {
  onDetect: (code: string) => void
  onClose: () => void
}

function CameraScanner({ onDetect, onClose }: CameraScannerProps) {
  const [status, setStatus] = useState<'requesting' | 'scanning' | 'error'>('requesting')
  const [errorMsg, setErrorMsg] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const zxingControlsRef = useRef<IScannerControls | null>(null)
  const detectedRef = useRef(false)

  function stopAll() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (zxingControlsRef.current) { zxingControlsRef.current.stop(); zxingControlsRef.current = null }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  function handleClose() {
    stopAll()
    onClose()
  }

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error')
        setErrorMsg('Tu navegador no expone acceso a la cámara. Asegúrate de estar en HTTPS o localhost.')
        return
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        })
      } catch (err) {
        if (cancelled) return
        const name = (err as { name?: string })?.name ?? ''
        setStatus('error')
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setErrorMsg('Permiso de cámara denegado. Habilítalo en los ajustes del navegador y vuelve a intentar.')
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setErrorMsg('No se encontró una cámara disponible en este dispositivo.')
        } else {
          setErrorMsg('No se pudo acceder a la cámara. Inténtalo de nuevo.')
        }
        return
      }

      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => { /* play interruptions are non-fatal */ })
      }

      setStatus('scanning')

      function handleHit(rawValue: string) {
        if (detectedRef.current) return
        detectedRef.current = true
        navigator.vibrate?.(120)
        stopAll()
        onDetect(rawValue)
      }

      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
        })
        intervalRef.current = setInterval(async () => {
          if (detectedRef.current || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) handleHit(codes[0].rawValue)
          } catch {
            /* transient detect errors are non-fatal */
          }
        }, 400)
        return
      }

      try {
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromVideoElement(videoRef.current!, (result) => {
          if (result) handleHit(result.getText())
        })
        if (cancelled) { controls.stop(); return }
        zxingControlsRef.current = controls
      } catch {
        if (cancelled) return
        setStatus('error')
        setErrorMsg('No se pudo iniciar el decodificador de códigos. Intenta de nuevo o usa el lector físico.')
      }
    }

    start()
    return () => { cancelled = true; stopAll() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '1rem',
    }}>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Cerrar"
        style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
          width: '2.5rem', height: '2.5rem', cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <CloseIcon />
      </button>

      {status === 'error' ? (
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '280px' }}>
          <QrCodeScannerOutlinedIcon style={{ color: 'var(--error)', fontSize: '3rem', marginBottom: '1rem' }} />
          <p style={{ color: '#fff', fontSize: '0.9375rem' }}>{errorMsg}</p>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', width: 'min(90vw, 360px)', aspectRatio: '1' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
            />
            <svg
              viewBox="0 0 240 240"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            >
              <path d="M20,60 L20,20 L60,20" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <path d="M180,20 L220,20 L220,60" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <path d="M220,180 L220,220 L180,220" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <path d="M60,220 L20,220 L20,180" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', textAlign: 'center' }}>
            {status === 'requesting' ? 'Accediendo a la cámara…' : 'Apunta hacia el código de barras'}
          </p>
        </>
      )}
    </div>
  )
}

// ─── Barcode field with scanner state machine ─────────────────────────
type ScanState = 'idle' | 'scanning' | 'scanned'

function BarcodeField({ value, onChange }: {
  value: string
  onChange: (code: string) => void
}) {
  const [scanState, setScanState] = useState<ScanState>(value ? 'scanned' : 'idle')
  const [buffer, setBuffer] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bufferRef = useRef('')
  const prevValueRef = useRef(value)

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  function acceptCode(code: string) {
    clearTimer()
    const trimmed = code.trim()
    onChange(trimmed || '')
    setScanState(trimmed ? 'scanned' : 'idle')
    setBuffer('')
    bufferRef.current = ''
  }

  function startScan() {
    prevValueRef.current = value
    clearTimer()
    setBuffer('')
    bufferRef.current = ''
    setScanState('scanning')
  }

  function cancelScan() {
    clearTimer()
    setBuffer('')
    bufferRef.current = ''
    onChange(prevValueRef.current)
    setScanState(prevValueRef.current ? 'scanned' : 'idle')
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setBuffer(v)
    bufferRef.current = v
    clearTimer()
    if (v) timerRef.current = setTimeout(() => acceptCode(bufferRef.current), 2000)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); acceptCode(bufferRef.current) }
    else if (e.key === 'Escape') { cancelScan() }
  }

  useEffect(() => {
    if (scanState === 'scanning') {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [scanState])

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [])

  /* ── Scanning state ── */
  if (scanState === 'scanning') {
    return (
      <div style={{
        background: 'rgba(220,38,38,0.06)',
        border: '2px solid var(--error)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
      }}>
        <input
          ref={inputRef}
          type="text"
          value={buffer}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => inputRef.current?.focus(), 80)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            width: '2.75rem', height: '2.75rem', borderRadius: '50%', flexShrink: 0,
            background: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <QrCodeScannerOutlinedIcon style={{ color: '#fff', fontSize: '1.375rem' }} />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--error)' }}>
              Esperando código…
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>
              Pasa el artículo por el lector de código de barras
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.7)', borderRadius: 'var(--radius-md)',
          padding: '0.5rem 0.875rem', minHeight: '2.25rem', display: 'flex', alignItems: 'center',
        }}>
          {buffer ? (
            <span className="ta-mono" style={{ fontSize: '1rem', letterSpacing: '0.08em', color: 'var(--error)' }}>
              {buffer}
            </span>
          ) : (
            <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
              Esperando lectura…
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="ta-btn ta-btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={cancelScan}>
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  /* ── Idle / Scanned state ── */
  const isScanned = scanState === 'scanned'
  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{
          flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: isScanned ? 'rgba(5,150,105,0.06)' : 'var(--surface-container)',
          border: 'none',
          borderBottom: `1.5px solid ${isScanned ? '#059669' : 'var(--outline-variant)'}`,
          borderRadius: '8px 8px 0 0',
          padding: '0.5rem 0.875rem', minHeight: '2.75rem',
          transition: 'border-color 0.2s, background 0.2s',
        }}>
          {isScanned ? (
            <>
              <CheckCircleOutlinedIcon style={{ fontSize: '1.125rem', color: '#059669', flexShrink: 0 }} />
              <span className="ta-mono" style={{ fontSize: '0.9375rem', color: '#059669', letterSpacing: '0.05em' }}>
                {value}
              </span>
            </>
          ) : (
            <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
              Sin código asignado
            </span>
          )}
        </div>
        <button
          type="button"
          className="ta-btn ta-btn-secondary"
          style={{ flexShrink: 0, gap: '0.375rem' }}
          onClick={startScan}
          title={isScanned ? 'Volver a escanear' : 'Escanear código'}
        >
          <QrCodeScannerOutlinedIcon style={{ fontSize: '1.125rem' }} />
          {isScanned ? 'Re-escanear' : 'Escanear'}
        </button>
        <button
          type="button"
          className="ta-btn ta-btn-secondary"
          style={{ flexShrink: 0, gap: '0.375rem' }}
          onClick={() => setCameraOpen(true)}
          title="Escanear con la cámara"
        >
          <QrCodeScannerOutlinedIcon style={{ fontSize: '1.125rem' }} />
          Cámara
        </button>
      </div>
      {cameraOpen && (
        <CameraScanner
          onDetect={(code) => { acceptCode(code); setCameraOpen(false) }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </>
  )
}

// ─── Price input with dot-thousands formatting ───────────────────────
function formatThousands(raw: string): string {
  // Backend may return "1000.00" — take the integer part only
  const intPart = raw.includes('.') ? raw.split('.')[0] : raw
  // Keep only digits
  const digits = intPart.replace(/\D/g, '')
  if (!digits) return ''
  // Insert dots every 3 digits from the right
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function PriceInput({
  value,
  onChange,
}: {
  value: string
  onChange: (raw: string) => void
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip thousands-separator dots the user sees, keep only digits
    const raw = e.target.value.replace(/\./g, '')
    onChange(raw)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className="ta-input ta-mono"
      placeholder="$ 0"
      value={formatThousands(value)}
      onChange={handleChange}
    />
  )
}

// ─── Shared components ───────────────────────────────────────────────
interface ImageUploadFieldProps {
  label: string
  hint: string
  preview: string | null
  fileName: string | null
  error: string
  inputRef: React.RefObject<HTMLInputElement>
  onChange: (file: File | null) => void
}

function ImageUploadField({ label, hint, preview, fileName, error, inputRef, onChange }: ImageUploadFieldProps) {
  return (
    <div>
      <label className="ta-label">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          background: 'var(--surface-container)',
          borderRadius: 'var(--radius-lg)',
          border: error ? '2px dashed var(--error)' : '2px dashed var(--outline-variant)',
          display: 'flex',
          flexDirection: preview ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: preview ? 'flex-start' : 'center',
          padding: preview ? '1rem 1.5rem' : '2rem',
          cursor: 'pointer',
          gap: '1rem',
          minHeight: '8rem',
          transition: 'border-color 0.15s',
        }}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              style={{ width: '5rem', height: '5rem', borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
            />
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--on-surface)' }}>
                {fileName ?? 'Imagen actual'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
                Haz clic para cambiar · o pega una nueva con{' '}
                <kbd style={{ fontFamily: 'var(--font-mono)', background: 'var(--surface-container-highest)', borderRadius: '4px', padding: '0 4px', fontSize: '0.6875rem' }}>Ctrl+V</kbd>
              </p>
            </div>
          </>
        ) : (
          <>
            <AddAPhotoOutlinedIcon style={{ fontSize: '2.5rem', color: 'var(--outline)' }} />
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--on-surface)', textAlign: 'center' }}>
              Subir imagen
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textAlign: 'center' }}>
              {hint} · JPG, PNG – máx. 2 MB
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textAlign: 'center' }}>
              o pega directamente con{' '}
              <kbd style={{ fontFamily: 'var(--font-mono)', background: 'var(--surface-container-highest)', borderRadius: '4px', padding: '0 4px', fontSize: '0.6875rem' }}>Ctrl+V</kbd>
            </p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {error && <span className="ta-field-error">{error}</span>}
    </div>
  )
}

function ConfirmModal({ title, message, onConfirm, onCancel }: {
  title: string
  message: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  return (
    <div className="ta-modal-backdrop">
      <div className="ta-modal" style={{ maxWidth: '28rem' }}>
        <div className="ta-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <WarningAmberOutlinedIcon style={{ color: 'var(--error)', fontSize: '1.5rem' }} />
            <h3 className="ta-modal-title" style={{ fontSize: '1.25rem' }}>{title}</h3>
          </div>
        </div>
        <div className="ta-modal-body">
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="ta-modal-footer">
          <button className="ta-btn ta-btn-ghost" onClick={onCancel}>Cancelar</button>
          <button
            className="ta-btn ta-btn-primary"
            style={{ background: 'var(--error)', border: 'none' }}
            disabled={loading}
            onClick={async () => { setLoading(true); await onConfirm(); setLoading(false) }}
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ShoppingBagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}
