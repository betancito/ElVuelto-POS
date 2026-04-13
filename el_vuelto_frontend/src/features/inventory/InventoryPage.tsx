import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useListMovementsQuery, useCreateMovementMutation, useGetStockQuery } from './inventoryApi'
import { formatCOP } from '@/utils/formatCOP'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import styles from './InventoryPage.module.css'

const schema = z.object({
  product: z.string().min(1, 'Selecciona un producto'),
  tipo_movimiento: z.enum(['ENTRADA', 'AJUSTE']),
  cantidad: z.coerce.number().min(1),
  precio_costo: z.string().min(1),
  nota: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function InventoryPage() {
  const { data: movements, isLoading } = useListMovementsQuery()
  const { data: stock } = useGetStockQuery()
  const [createMovement, { isLoading: creating }] = useCreateMovementMutation()
  const [showModal, setShowModal] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo_movimiento: 'ENTRADA' },
  })

  async function onSubmit(data: FormData) {
    await createMovement(data).unwrap()
    setShowModal(false)
    reset()
  }

  const tipoLabel: Record<string, string> = {
    ENTRADA: 'Entrada',
    SALIDA_VENTA: 'Venta',
    AJUSTE: 'Ajuste',
  }

  const tipoBadge: Record<string, 'success' | 'info' | 'warning'> = {
    ENTRADA: 'success',
    SALIDA_VENTA: 'info',
    AJUSTE: 'warning',
  }

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.heading}>Movimientos de Inventario</h1>
          <p className={styles.sub}>{movements?.length ?? 0} registros</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <span className="material-symbols-outlined">add</span>
          Registrar movimiento
        </Button>
      </div>

      {isLoading ? (
        <div className={styles.loading}><Spinner /></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Costo</th>
                <th>Usuario</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {(movements ?? []).map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className={styles.productName}>{m.product_nombre}</td>
                  <td>
                    <Badge variant={tipoBadge[m.tipo_movimiento] ?? 'neutral'}>
                      {tipoLabel[m.tipo_movimiento] ?? m.tipo_movimiento}
                    </Badge>
                  </td>
                  <td className={styles[m.tipo_movimiento === 'ENTRADA' ? 'positive' : 'negative']}>
                    {m.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{m.cantidad}
                  </td>
                  <td className={styles.amount}>{formatCOP(parseFloat(m.precio_costo))}</td>
                  <td>{m.user_nombre}</td>
                  <td className={styles.nota}>{m.nota || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Registrar movimiento">
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Producto</label>
              <select className={styles.select} {...register('product')}>
                <option value="">Seleccionar...</option>
                {(stock ?? []).map((s) => (
                  <option key={s.product_id} value={s.product_id}>
                    {s.nombre} (stock: {s.stock_actual})
                  </option>
                ))}
              </select>
              {errors.product && <span className={styles.err}>{errors.product.message}</span>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Tipo</label>
              <select className={styles.select} {...register('tipo_movimiento')}>
                <option value="ENTRADA">Entrada</option>
                <option value="AJUSTE">Ajuste</option>
              </select>
            </div>
          </div>
          <div className={styles.formRow}>
            <Input label="Cantidad" type="number" error={errors.cantidad?.message} {...register('cantidad')} />
            <Input label="Precio de costo" type="number" error={errors.precio_costo?.message} {...register('precio_costo')} />
          </div>
          <Input label="Nota (opcional)" {...register('nota')} />
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={creating}>Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
