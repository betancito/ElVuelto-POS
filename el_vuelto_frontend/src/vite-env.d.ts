/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional on purpose: there is no committed .env, and the correct default is
  // to leave this unset so the app calls the API at the relative path /api on
  // the same origin. See src/app/apiBase.ts.
  readonly VITE_API_URL?: string
  readonly VITE_APP_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
