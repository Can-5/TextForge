export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'app-theme'

export function getPref(): ThemePref {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
}

export function initTheme(): void {
  applyTheme(getPref())
}

export function cycleTheme(): ThemePref {
  const order: ThemePref[] = ['system', 'light', 'dark']
  const next = order[(order.indexOf(getPref()) + 1) % order.length]
  localStorage.setItem(KEY, next)
  applyTheme(next)
  return next
}

export function effectiveTheme(): 'light' | 'dark' {
  const p = getPref()
  if (p !== 'system') return p
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
