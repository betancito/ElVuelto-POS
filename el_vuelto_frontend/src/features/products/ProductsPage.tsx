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
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import type { Product } from './productsApi'
import styles from './ProductsPage.module.css'

const schema = z.object({
  nombre: z.string().min(2),
  category: z.string().optional(),
  tipo: z.enum(['SIN_CODIGO', 'CON_CODIGO']),
  precio_venta: z.string().min(1),
  precio_costo: z.string().min(1),
  barcode: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function ProductsPage() {
  const { data: products, isLoading } = useListProductsQuery()
  const { data: categories } = useListCategoriesQuery()
  const [createProduct, { isLoading: creating }] = useCreateProductMutation()
  const [updateProduct] = useUpdateProductMutation()
  const [deleteProduct] = useDeleteProductMutation()
  const [createCategory] = useCreateCategoryMutation()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [newCat, setNewCat] = useState('')
  const [search, setSearch] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'SIN_CODIGO' },
  })

  function openCreate() {
    setEditing(null)
    reset({ tipo: 'SIN_CODIGO', nombre: '', precio_venta: '', precio_costo: '' })
    setShowModal(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    reset({
      nombre: p.nombre,
      category: p.category?.id,
      tipo: p.tipo,
      precio_venta: p.precio_venta,
      precio_costo: p.precio_costo,
      barcode: p.barcode ?? '',
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

  const filtered = (products ?? []).filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.heading}>Inventario</h1>
          <p className={styles.sub}>{products?.length ?? 0} productos</p>
        </div>
        <Button onClick={openCreate}>
          <span className="material-symbols-outlined">add</span>
          Nuevo producto
        </Button>
      </div>

      <Input
        placeholder="Buscar producto..."
        leftIcon="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <div className={styles.loading}><Spinner /></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>P. Venta</th>
                <th>P. Costo</th>
                <th>Stock</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className={styles.productName}>{p.nombre}</td>
                  <td>{p.category?.nombre ?? '—'}</td>
                  <td>{p.tipo === 'SIN_CODIGO' ? 'Sin código' : 'Con código'}</td>
                  <td className={styles.amount}>{formatCOP(parseFloat(p.precio_venta))}</td>
                  <td className={styles.amount}>{formatCOP(parseFloat(p.precio_costo))}</td>
                  <td>{p.stock_actual}</td>
                  <td><Badge variant={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activo' : 'Inact.'}</Badge></td>
                  <td>
                    <div className={styles.actions}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        <span className="material-symbols-outlined">edit</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteProduct(p.id)}>
                        <span className="material-symbols-outlined">delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className={styles.formRow}>
            <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} />
            <div className={styles.field}>
              <label className={styles.label}>Categoría</label>
              <div className={styles.catRow}>
                <select className={styles.select} {...register('category')}>
                  <option value="">Sin categoría</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={styles.newCatRow}>
                <input
                  className={styles.newCatInput}
                  placeholder="Nueva categoría..."
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleAddCategory}>
                  Agregar
                </Button>
              </div>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Tipo</label>
              <select className={styles.select} {...register('tipo')}>
                <option value="SIN_CODIGO">Sin código</option>
                <option value="CON_CODIGO">Con código de barras</option>
              </select>
            </div>
            <Input label="Código de barras" {...register('barcode')} />
          </div>
          <div className={styles.formRow}>
            <Input label="Precio de venta" type="number" error={errors.precio_venta?.message} {...register('precio_venta')} />
            <Input label="Precio de costo" type="number" error={errors.precio_costo?.message} {...register('precio_costo')} />
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={creating}>
              {editing ? 'Guardar' : 'Crear producto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
