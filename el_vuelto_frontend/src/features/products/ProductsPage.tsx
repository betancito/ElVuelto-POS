import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useListProductsQuery,
  useListCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateCategoryMutation,
} from './productsApi'
import { formatCOP } from '@/utils/formatCOP'
import Spinner from '@/components/ui/Spinner'
import type { Product } from './productsApi'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined'
import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined'

const schema = z.object({
  nombre:       z.string().min(2),
  category:     z.string().optional(),
  tipo:         z.enum(['SIN_CODIGO', 'CON_CODIGO']),
  precio_venta: z.string().min(1),
  precio_costo: z.string().min(1),
  barcode:      z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function ProductsPage() {
  const { data: products, isLoading } = useListProductsQuery()
  const { data: categories }          = useListCategoriesQuery()
  const [createProduct, { isLoading: creating }] = useCreateProductMutation()
  const [updateProduct]                          = useUpdateProductMutation()
  const [deleteProduct]                          = useDeleteProductMutation()
  const [createCategory]                         = useCreateCategoryMutation()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<Product | null>(null)
  const [newCat, setNewCat]       = useState('')
  const [search, setSearch]       = useState('')
  const [activeFilter, setActiveFilter] = useState('Todos')

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'SIN_CODIGO' },
  })

  const tipo = watch('tipo')

  function openCreate() {
    setEditing(null)
    reset({ tipo: 'SIN_CODIGO', nombre: '', precio_venta: '', precio_costo: '' })
    setShowModal(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    reset({
      nombre:       p.nombre,
      category:     p.category?.id,
      tipo:         p.tipo,
      precio_venta: p.precio_venta,
      precio_costo: p.precio_costo,
      barcode:      p.barcode ?? '',
    })
    setShowModal(true)
  }

  async function onSubmit(data: FormData) {
    if (editing) {
      await updateProduct({ id: editing.id, ...data }).unwrap()
    } else {
      await createProduct(data).unwrap()
    }
    setShowModal(false)
    reset()
  }

  async function handleAddCategory() {
    if (!newCat.trim()) return
    await createCategory({ nombre: newCat.trim() }).unwrap()
    setNewCat('')
  }

  const categoryNames = ['Todos', ...(categories ?? []).map((c) => c.nombre)]

  const filtered = (products ?? []).filter((p) => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase())
    const matchFilter = activeFilter === 'Todos' || p.category?.nombre === activeFilter
    return matchSearch && matchFilter
  })

  return (
    <div className="ta-page">
      {/* ── Hero ── */}
      <div className="ta-page-hero">
        <div>
          <h1 className="ta-page-title">Gestión de Productos</h1>
          <p className="ta-page-sub">Administra el catálogo de productos de la sucursal.</p>
        </div>
        <button className="ta-btn ta-btn-primary" onClick={openCreate}>
          <AddCircleOutlineIcon style={{ fontSize: '1.125rem' }} />
          Nuevo producto
        </button>
      </div>

      {/* ── Search + filters ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: '24rem' }}>
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
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner /></div>
      ) : (
        <div className="ta-table-wrap">
          <table className="ta-table">
            <thead className="ta-thead">
              <tr>
                <th className="ta-th">Estado</th>
                <th className="ta-th">Producto</th>
                <th className="ta-th">Categoría</th>
                <th className="ta-th">Tipo</th>
                <th className="ta-th" style={{ textAlign: 'right' }}>Precio</th>
                <th className="ta-th" style={{ textAlign: 'right' }}>Stock</th>
                <th className="ta-th"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="ta-tr">
                  <td className="ta-td">
                    <div className={`ta-status ta-status--${p.activo ? 'active' : 'inactive'}`}>
                      <span className="ta-status-dot" />
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </div>
                  </td>
                  <td className="ta-td">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '2.75rem', height: '2.75rem', borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-variant)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0,
                      }}>
                        <ShoppingBagIcon />
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--on-surface)' }}>{p.nombre}</p>
                        {p.barcode && (
                          <p className="ta-mono ta-mono--muted" style={{ fontSize: '0.6875rem' }}>{p.barcode}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="ta-td" style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
                    {p.category?.nombre ?? '—'}
                  </td>
                  <td className="ta-td">
                    <span className={`ta-badge ta-badge--${p.tipo === 'CON_CODIGO' ? 'primary' : 'neutral'}`}>
                      {p.tipo === 'CON_CODIGO' ? 'Con código' : 'Sin código'}
                    </span>
                  </td>
                  <td className="ta-td ta-mono ta-mono--primary" style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatCOP(parseFloat(p.precio_venta))}
                  </td>
                  <td className="ta-td ta-mono" style={{ textAlign: 'right', fontSize: '0.875rem' }}>
                    {p.stock_actual} u.
                  </td>
                  <td className="ta-td">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="ta-btn-icon" onClick={() => openEdit(p)} title="Editar">
                        <EditOutlinedIcon style={{ fontSize: '1.125rem' }} />
                      </button>
                      <button className="ta-btn-icon ta-btn-icon--danger" onClick={() => deleteProduct(p.id)} title="Eliminar">
                        <DeleteOutlineIcon style={{ fontSize: '1.125rem' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="ta-empty">
                    {search ? `No hay resultados para "${search}"` : 'Sin productos registrados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="ta-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="ta-modal ta-modal--lg">
            <div className="ta-modal-header">
              <div>
                <h3 className="ta-modal-title">{editing ? 'Editar producto' : 'Nuevo producto'}</h3>
                <p className="ta-modal-sub">Configuración detallada del producto.</p>
              </div>
              <button className="ta-btn-icon" onClick={() => setShowModal(false)}>
                <CloseIcon style={{ fontSize: '1.25rem' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="ta-modal-body">
                {/* Row 1: name + category / image */}
                <div className="ta-form-grid">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="ta-field">
                      <label className="ta-label">Nombre del producto</label>
                      <input className="ta-input" placeholder="Ej: Pan de Bono Premium" {...register('nombre')} />
                      {errors.nombre && <span className="ta-field-error">{errors.nombre.message}</span>}
                    </div>

                    <div className="ta-field">
                      <label className="ta-label">Categoría</label>
                      <select className="ta-select" {...register('category')}>
                        <option value="">Sin categoría</option>
                        {(categories ?? []).map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Add new category */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <div className="ta-field" style={{ flex: 1 }}>
                        <label className="ta-label">Nueva categoría</label>
                        <input
                          className="ta-input"
                          placeholder="Nombre de categoría..."
                          value={newCat}
                          onChange={(e) => setNewCat(e.target.value)}
                        />
                      </div>
                      <button type="button" className="ta-btn ta-btn-secondary" style={{ flexShrink: 0 }} onClick={handleAddCategory}>
                        Agregar
                      </button>
                    </div>
                  </div>

                  {/* Image upload area */}
                  <div style={{
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-lg)',
                    border: '2px dashed var(--outline-variant)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    gap: '0.5rem',
                  }}>
                    <AddAPhotoOutlinedIcon style={{ fontSize: '2.5rem', color: 'var(--outline)' }} />
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--on-surface)' }}>Subir imagen</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>JPG, PNG (Máx 2MB)</p>
                  </div>
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
                      <input type="checkbox" style={{ display: 'none' }}
                        checked={tipo === 'CON_CODIGO'}
                        onChange={(e) => setValue('tipo', e.target.checked ? 'CON_CODIGO' : 'SIN_CODIGO')}
                      />
                    </label>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Con código</span>
                  </div>
                </div>

                {/* Price / stock / barcode fields */}
                <div className="ta-form-grid">
                  <div className="ta-field">
                    <label className="ta-label">Tipo de producto</label>
                    <select className="ta-select" {...register('tipo')}>
                      <option value="SIN_CODIGO">Sin código de barras</option>
                      <option value="CON_CODIGO">Con código de barras</option>
                    </select>
                  </div>

                  {tipo === 'CON_CODIGO' && (
                    <div className="ta-field">
                      <label className="ta-label">Código de barras (EAN)</label>
                      <input className="ta-input ta-mono" placeholder="7701234567890" {...register('barcode')} />
                    </div>
                  )}

                  <div className="ta-field">
                    <label className="ta-label">Precio de venta (COP)</label>
                    <input className="ta-input ta-mono" type="number" placeholder="$ 0" {...register('precio_venta')} />
                    {errors.precio_venta && <span className="ta-field-error">{errors.precio_venta.message}</span>}
                  </div>

                  <div className="ta-field">
                    <label className="ta-label">Precio de costo (COP)</label>
                    <input className="ta-input ta-mono" type="number" placeholder="$ 0" {...register('precio_costo')} />
                    {errors.precio_costo && <span className="ta-field-error">{errors.precio_costo.message}</span>}
                  </div>
                </div>
              </div>

              <div className="ta-modal-footer">
                <button type="button" className="ta-btn ta-btn-ghost" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ta-btn ta-btn-primary" disabled={creating}>
                  {creating ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear producto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ShoppingBagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}
