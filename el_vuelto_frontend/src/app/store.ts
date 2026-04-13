import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage/session'

import authReducer from '@/features/auth/authSlice'
import posReducer from '@/features/sales/posSlice'
import { apiBase } from './apiBase'

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['accessToken', 'refreshToken', 'user', 'isAuthenticated'],
}

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  pos: posReducer,
  [apiBase.reducerPath]: apiBase.reducer,
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) =>
    getDefault({ serializableCheck: { ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'] } }).concat(
      apiBase.middleware
    ),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
