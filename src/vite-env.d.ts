/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WIN_TILE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
