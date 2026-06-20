export interface Device {
  serial: string
  model?: string
  brand?: string
  android_version?: string
  type: 'adb' | 'fastboot'
  status?: string
}

export type Page = 'dashboard' | 'ai-auto' | 'flash' | 'root' | 'modules'

export type RootMethod = 'magisk' | 'kernelsu' | 'apatch'

export type AiTarget = 'detect' | 'root' | 'flash' | 'unbrick'

export type AiStep = 1 | 2 | 3 | 4
