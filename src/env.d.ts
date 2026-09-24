/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, any>
  export default component
}

declare module 'marked-katex-extension'
declare module 'github-slugger'

interface Window {
  renderMathInElement?: (element: HTMLElement, options?: Record<string, unknown>) => void
}
