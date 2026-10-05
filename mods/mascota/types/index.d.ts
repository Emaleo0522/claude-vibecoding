/** Repo de una mascota: clave = git-common-dir normalizado (un worktree comparte mascota). */
export type MascotaRepo = { key: string; label: string; top: string }
/** Aviso pendiente para el final del turno (uno solo, el de mayor prioridad). */
export type MascotaNotice = { kind: 'nace' | 'etapa' | 'enferma' | 'cura'; texto: string }

declare module 'claude-code' {
  interface PluginState {
    mascota: {
      /** Clave del repo cuya mascota se ve en la línea de estado. */
      shown: string | null
      pending: MascotaNotice | null
      /** Repos con actividad en esta sesión (se chequean sus commits al final del turno). */
      touched: string[]
      repos: Record<string, MascotaRepo>
      /** Carpeta normalizada → clave de repo, o null si no es un repo. */
      dirs: Record<string, string | null>
      /** Último chequeo de commits por repo (ms). */
      checked: Record<string, number>
      paneOpen: boolean
      /** Cuadro del parpadeo del panel (0-3). */
      frame: number
    }
  }
}
