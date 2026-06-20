export interface Device {
  serial: string
  model?: string
  brand?: string
  android_version?: string
  sdk?: number
  type: 'adb' | 'fastboot'
  status?: string
  bootloader_unlocked?: boolean
  current_slot?: string
  mode?: string
  build_fingerprint?: string
  security_patch?: string
  kernel_version?: string
  battery_level?: number
  storage_total?: number
  storage_used?: number
  ram_total?: number
  cpu_cores?: number
}

export interface FastbootDevice {
  serial: string
  status: string
  mode?: string
  unlocked?: boolean
  current_slot?: string
}

export type Page = 'dashboard' | 'ai-auto' | 'flash' | 'root' | 'modules' | 'tools' | 'settings'

export type AiTarget = 'detect' | 'root' | 'flash' | 'unbrick'

export type AiStep = 1 | 2 | 3 | 4

// ── Flash types ──

export interface FlashTask {
  task_id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  current_step: string
  message: string
  timestamp: string
  logs: FlashLogEntry[]
}

export interface FlashLogEntry {
  timestamp: string
  level: 'info' | 'success' | 'error' | 'warn'
  message: string
}

export interface SlotInfo {
  serial: string
  current_slot: string
  slots: string[]
  ab_support: boolean
}

export type FlashMode = 'partition' | 'boot' | 'flash_all' | 'erase'

export type RebootTarget = 'system' | 'bootloader' | 'fastbootd'
