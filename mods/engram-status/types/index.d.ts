/** Lo que la franja y el panel necesitan del último chequeo. */
export type EngramStatusSnapshot = {
  level: 'ok' | 'syncing' | 'warn' | 'unknown' | 'error'
  /** Texto de la franja, sin el chip. */
  band: string
  /** Nivel + tipo de motivo: si no cambia, "ocultar" sigue vigente. */
  hideKey: string
}

declare module 'claude-code' {
  interface PluginState {
    'engram-status': {
      current: EngramStatusSnapshot | null
      /** hideKey que el usuario ocultó, o null. */
      hiddenKey: string | null
      /** Markdown del panel de detalle. */
      detail: string
      /** Último nivel avisado con toast en esta sesión (sobrevive al hot reload). */
      lastLevel: 'ok' | 'syncing' | 'warn' | 'unknown' | 'error'
    }
  }
}
