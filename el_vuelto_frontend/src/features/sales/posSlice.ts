import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface CartItem {
  productId: string
  nombre: string
  precioUnitario: number
  cantidad: number
  tipo: 'SIN_CODIGO' | 'CON_CODIGO'
}

interface PosState {
  items: CartItem[]
  metodoPago: 'EFECTIVO' | 'NEQUI_TRANSFERENCIA'
  montoRecibido: number | null
}

const initialState: PosState = {
  items: [],
  metodoPago: 'EFECTIVO',
  montoRecibido: null,
}

export const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<Omit<CartItem, 'cantidad'>>) => {
      const existing = state.items.find((i) => i.productId === action.payload.productId)
      if (existing) {
        existing.cantidad += 1
      } else {
        state.items.push({ ...action.payload, cantidad: 1 })
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.productId !== action.payload)
    },
    updateQuantity: (state, action: PayloadAction<{ productId: string; cantidad: number }>) => {
      const item = state.items.find((i) => i.productId === action.payload.productId)
      if (item) {
        if (action.payload.cantidad <= 0) {
          state.items = state.items.filter((i) => i.productId !== action.payload.productId)
        } else {
          item.cantidad = action.payload.cantidad
        }
      }
    },
    clearCart: (state) => {
      state.items = []
      state.montoRecibido = null
      state.metodoPago = 'EFECTIVO'
    },
    setMetodoPago: (state, action: PayloadAction<'EFECTIVO' | 'NEQUI_TRANSFERENCIA'>) => {
      state.metodoPago = action.payload
      state.montoRecibido = null
    },
    setMontoRecibido: (state, action: PayloadAction<number | null>) => {
      state.montoRecibido = action.payload
    },
  },
})

export const { addItem, removeItem, updateQuantity, clearCart, setMetodoPago, setMontoRecibido } =
  posSlice.actions
export default posSlice.reducer
