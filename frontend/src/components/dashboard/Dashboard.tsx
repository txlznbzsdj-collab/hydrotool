import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Smartphone, Usb, Cpu, Monitor,
  BatteryFull, BatteryMedium, BatteryLow,
  HardDrive, MemoryStickIcon as Memory,
  Unlock, Lock, Layers, ChevronDown, ChevronRight,
  Fingerprint,
} from 'lucide-react'
import type { Device } from '@/types'

interface DashboardProps { devices: Device[] }

export function Dashboard({ devices }: DashboardProps) {
  const [expandedSerial, setExpandedSerial] = useState<string | null>(null)
  const adbCount = devices.filter(d => d.type === 'adb').length
  const fastbootCount = devices.filter(d => d.type === 'fastboot').length

  const toggle = (serial: string) => setExpandedSerial(p => p === serial ? null : serial)

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">设备仪表盘</h1>
        <p className="text-sm text-muted-foreground">实时监控连接的 Android 设备状态</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Stat label="已连接" value={devices.length} icon={Smartphone} variant="default" />
        <Stat label="ADB 设备" value={adbCount} icon={Usb} variant={adbCount > 0 ? 'success' : 'muted'} />
        <Stat label="Fastboot" value={fastbootCount} icon={Cpu} variant={fastbootCount > 0 ? 'warning' : 'muted'} />
        <Stat label="已解锁" value={devices.filter(d => d.bootloader_unlocked).length} icon={Unlock} variant={fastbootCount > 0 ? 'warning' : 'muted'} />
      </div>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">设备列表</h2>
          <span className="text-xs text-muted-foreground">{devices.length === 0 ? '无设备' : `共 ${devices.length} 台`}</span>
        </div>

        {devices.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Monitor className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">未检测到设备</p>
              <p className="text-xs text-muted-foreground/60">请通过 USB 连接 Android 手机，并开启 USB 调试</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {devices.map(device => (
              <div key={device.serial}>
                <DeviceCard device={device} expanded={expandedSerial === device.serial} onClick={() => toggle(device.serial)} />
                {expandedSerial === device.serial && <DeviceDetail device={device} />}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/* Stat */
function Stat({ label, value, icon: Icon, variant }: { label: string; value: number; icon: typeof Smartphone; variant: string }) {
  const v: Record<string, string> = {
    default: 'from-brand/10 to-brand/5 border-brand/20',
    success: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    warning: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    muted: 'from-muted to-muted border-border',
  }
  return (
    <Card className={`bg-gradient-to-br ${v[variant]} transition-all duration-300 hover:scale-[1.02]`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${variant === 'default' ? 'bg-brand/15' : variant === 'success' ? 'bg-emerald-500/15' : variant === 'warning' ? 'bg-amber-500/15' : 'bg-muted-foreground/10'}`}>
          <Icon className={`w-4.5 h-4.5 ${variant === 'default' ? 'text-brand' : variant === 'success' ? 'text-emerald-400' : variant === 'warning' ? 'text-amber-400' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <div className="text-xl font-bold tabular-nums">{value}</div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

/* Device Card */
function DeviceCard({ device, expanded, onClick }: { device: Device; expanded: boolean; onClick: () => void }) {
  const hasInfo = !!(device.brand && device.model)
  const storagePct = device.storage_total ? Math.round((device.storage_used || 0) / device.storage_total * 100) : 0
  const batteryIcon = (device.battery_level ?? -1) >= 80 ? BatteryFull : (device.battery_level ?? -1) >= 30 ? BatteryMedium : BatteryLow

  return (
    <Card className="group cursor-pointer hover:border-brand/30 transition-all duration-200 hover:shadow-md hover:shadow-brand/5" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${device.type === 'adb' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
            <Smartphone className={`w-5 h-5 ${device.type === 'adb' ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-medium text-sm truncate">{hasInfo ? `${device.brand} ${device.model}` : device.serial}</span>
              {device.android_version && <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">{device.android_version}</span>}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {!hasInfo && <span className="font-mono truncate">{device.serial}</span>}
              {device.bootloader_unlocked !== undefined && (
                <span className={`flex items-center gap-0.5 ${device.bootloader_unlocked ? 'text-amber-400' : ''}`}>
                  {device.bootloader_unlocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                  {device.bootloader_unlocked ? '已解锁' : '已锁定'}
                </span>
              )}
              {device.current_slot && <span className="font-mono uppercase">{device.current_slot}</span>}
              {device.battery_level !== undefined && device.battery_level >= 0 && (
                <span className="flex items-center gap-0.5">
                  <batteryIcon className="w-2.5 h-2.5" /> {device.battery_level}%
                </span>
              )}
            </div>
            {/* Storage bar */}
            {storagePct > 0 && (
              <div className="mt-1.5 flex items-center gap-2">
                <Progress value={storagePct} className="h-1 flex-1" />
                <span className="text-[10px] text-muted-foreground tabular-nums">{storagePct}%</span>
              </div>
            )}
          </div>
          <Badge variant={device.type === 'adb' ? 'default' : 'secondary'} className="text-[10px] font-mono flex-shrink-0">
            {device.type.toUpperCase()}
          </Badge>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />}
        </div>
      </CardContent>
    </Card>
  )
}

/* Device Detail — inline expandable panel */
function DeviceDetail({ device }: { device: Device }) {
  const storagePct = device.storage_total ? Math.round((device.storage_used || 0) / device.storage_total * 100) : 0
  const ramGB = device.ram_total ? (device.ram_total / 1024 / 1024 / 1024).toFixed(1) : ''

  return (
    <Card className="border-t-0 rounded-t-none border-brand/10 bg-muted/30">
      <CardContent className="p-4">
        <div className="grid gap-4 md:grid-cols-3">
          {/* System */}
          <div className="space-y-2">
            <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider">系统信息</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Android</span><span>{device.android_version || '-'} (SDK {device.sdk || '-'})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">安全补丁</span><span>{device.security_patch || '-'}</span></div>
              {device.build_fingerprint && <div className="flex justify-between"><span className="text-muted-foreground">Build</span><span className="text-[10px] font-mono truncate ml-2 max-w-[140px]">{device.build_fingerprint.split('/').slice(-1)[0] || '-'}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">内核</span><span className="text-[10px] truncate ml-2 max-w-[160px]">{device.kernel_version || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CPU 核心</span><span>{device.cpu_cores || '-'}</span></div>
            </div>
          </div>

          {/* Storage */}
          <div className="space-y-2">
            <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider">存储与内存</h4>
            <div className="space-y-3 text-xs">
              {storagePct > 0 && (
                <div>
                  <div className="flex justify-between mb-1"><HardDrive className="w-3 h-3 text-muted-foreground" /><span>{formatBytes(device.storage_used || 0)} / {formatBytes(device.storage_total || 0)}</span></div>
                  <Progress value={storagePct} className="h-1.5" />
                </div>
              )}
              {ramGB && (
                <div className="flex justify-between"><Memory className="w-3 h-3 text-muted-foreground" /><span>{ramGB} GB</span></div>
              )}
              {device.battery_level !== undefined && device.battery_level >= 0 && (
                <div className="flex justify-between"><BatteryFull className="w-3 h-3 text-muted-foreground" /><span>{device.battery_level}%</span></div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider">状态</h4>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge label="Bootloader" value={device.bootloader_unlocked ? '已解锁' : '已锁定'} icon={device.bootloader_unlocked ? Unlock : Lock} active={!!device.bootloader_unlocked} warnOnActive />
              {device.current_slot && <StatusBadge label="槽位" value={device.current_slot.toUpperCase()} active mono />}
              <StatusBadge label="序列号" value={device.serial} mono />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ label, value, icon: Icon, active, warnOnActive, mono }: { label: string; value: string; icon?: typeof Smartphone; active?: boolean; warnOnActive?: boolean; mono?: boolean }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border ${active ? (warnOnActive ? 'border-amber-500/20 bg-amber-500/5 text-amber-400' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400') : 'border-border bg-muted text-muted-foreground'}`}>
      {Icon && <Icon className="w-3 h-3" />}
      <span className="text-[9px] opacity-60">{label}</span>
      <span className={mono ? 'font-mono' : ''}>{value}</span>
    </div>
  )
}

function formatBytes(b: number): string {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
  if (b >= 1e3) return (b / 1e3).toFixed(1) + ' KB'
  return b + ' B'
}
