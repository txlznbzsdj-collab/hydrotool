import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Smartphone,
  Usb,
  Cpu,
  Monitor,
  ChevronRight,
  Wifi,
  Cable,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Unlock,
  Lock,
  Layers,
  Tag,
  CpuIcon,
} from 'lucide-react'
import type { Device } from '@/types'

interface DashboardProps {
  devices: Device[]
}

export function Dashboard({ devices }: DashboardProps) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)

  const adbCount = devices.filter(d => d.type === 'adb').length
  const fastbootCount = devices.filter(d => d.type === 'fastboot').length
  const unlockedCount = devices.filter(d => d.bootloader_unlocked).length
  const rootedCount = devices.filter(d => d.root_method).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          设备仪表盘
        </h1>
        <p className="text-sm text-muted-foreground">
          实时监控连接的 Android 设备状态
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Stat label="已连接" value={devices.length} icon={Smartphone} variant="default" />
        <Stat label="ADB 设备" value={adbCount} icon={Usb} variant={adbCount > 0 ? 'success' : 'muted'} />
        <Stat label="Fastboot" value={fastbootCount} icon={Cpu} variant={fastbootCount > 0 ? 'warning' : 'muted'} />
        <Stat label="已 Root" value={rootedCount} icon={ShieldCheck} variant={rootedCount > 0 ? 'success' : 'muted'} />
      </div>

      <Separator />

      {/* Device List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">
            设备列表
          </h2>
          <span className="text-xs text-muted-foreground">
            {devices.length === 0 ? '无设备' : `共 ${devices.length} 台`}
          </span>
        </div>

        {devices.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Monitor className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-muted-foreground">未检测到设备</p>
                <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">
                  请通过 USB 连接 Android 手机，并开启开发者选项中的 USB 调试模式
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground/50 mt-2">
                <div className="flex items-center gap-1.5">
                  <Cable className="w-3.5 h-3.5" />
                  <span>USB 连接</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>无线调试</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {devices.map(device => (
              <DeviceCard key={device.serial} device={device} onClick={() => setSelectedDevice(device)} />
            ))}
          </div>
        )}
      </section>

      {/* Detail Dialog */}
      <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
        {selectedDevice && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="w-5 h-5 text-brand" />
                {selectedDevice.brand && selectedDevice.model
                  ? `${selectedDevice.brand} ${selectedDevice.model}`
                  : selectedDevice.serial}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {/* Basic info grid */}
              <div className="grid grid-cols-2 gap-3">
                <DetailItem icon={Tag} label="序列号" value={selectedDevice.serial} mono />
                <DetailItem icon={CpuIcon} label="类型" value={selectedDevice.type.toUpperCase()} />
                {selectedDevice.android_version && (
                  <DetailItem icon={Tag} label="Android" value={`${selectedDevice.android_version} (SDK ${selectedDevice.sdk || '?'})`} />
                )}
                {selectedDevice.brand && (
                  <DetailItem icon={Monitor} label="品牌" value={selectedDevice.brand} />
                )}
                {selectedDevice.current_slot && (
                  <DetailItem icon={Layers} label="当前槽位" value={selectedDevice.current_slot.toUpperCase()} mono />
                )}
              </div>

              <Separator />

              {/* Status row */}
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label="Bootloader"
                  value={selectedDevice.bootloader_unlocked ? '已解锁' : '已锁定'}
                  icon={selectedDevice.bootloader_unlocked ? Unlock : Lock}
                  active={!!selectedDevice.bootloader_unlocked}
                  warnOnActive
                />
                <StatusBadge
                  label="Root"
                  value={selectedDevice.root_method ? selectedDevice.root_method : '未获取'}
                  icon={selectedDevice.root_method ? ShieldCheck : ShieldAlert}
                  active={!!selectedDevice.root_method}
                />
                {selectedDevice.current_slot && (
                  <StatusBadge label="槽位" value={selectedDevice.current_slot.toUpperCase()} active mono />
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

/* ── Stat Card ── */
function Stat({ label, value, icon: Icon, variant }: {
  label: string; value: number; icon: typeof Smartphone
  variant: 'default' | 'success' | 'warning' | 'muted'
}) {
  const variants: Record<string, string> = {
    default: 'from-brand/10 to-brand/5 border-brand/20',
    success: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    warning: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    muted: 'from-muted to-muted border-border',
  }

  return (
    <Card className={`bg-gradient-to-br ${variants[variant]} relative overflow-hidden group transition-all duration-300 hover:scale-[1.02]`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          variant === 'default' ? 'bg-brand/15' :
          variant === 'success' ? 'bg-emerald-500/15' :
          variant === 'warning' ? 'bg-amber-500/15' : 'bg-muted-foreground/10'
        }`}>
          <Icon className={`w-4.5 h-4.5 ${
            variant === 'default' ? 'text-brand' :
            variant === 'success' ? 'text-emerald-400' :
            variant === 'warning' ? 'text-amber-400' : 'text-muted-foreground'
          }`} />
        </div>
        <div>
          <div className="text-xl font-bold tracking-tight tabular-nums">{value}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Device Card ── */
function DeviceCard({ device, onClick }: { device: Device; onClick?: () => void }) {
  const hasInfo = !!(device.brand && device.model)
  const typeLabel = device.type.toUpperCase()

  return (
    <Card className="group cursor-pointer hover:border-brand/30 transition-all duration-200 hover:shadow-md hover:shadow-brand/5" onClick={onClick}>
      <CardContent className="p-4 flex items-center gap-4">
        {/* Device icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          device.type === 'adb' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
        }`}>
          <Smartphone className={`w-5 h-5 ${device.type === 'adb' ? 'text-emerald-400' : 'text-amber-400'}`} />
        </div>

        {/* Device info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-sm truncate">
              {hasInfo ? `${device.brand} ${device.model}` : device.serial}
            </span>
            {device.android_version && (
              <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                {device.android_version}
              </span>
            )}
          </div>
          {/* Status badges row */}
          <div className="flex items-center gap-2 text-xs">
            {!hasInfo && <span className="text-muted-foreground/50 font-mono truncate">{device.serial}</span>}
            {device.bootloader_unlocked !== undefined && (
              <span className={`flex items-center gap-0.5 ${device.bootloader_unlocked ? 'text-amber-400' : 'text-muted-foreground/50'}`}>
                {device.bootloader_unlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                <span className="text-[10px]">{device.bootloader_unlocked ? '已解锁' : '已锁定'}</span>
              </span>
            )}
            {device.root_method && (
              <span className="flex items-center gap-0.5 text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                <span className="text-[10px]">{device.root_method}</span>
              </span>
            )}
            {device.current_slot && (
              <span className="text-[10px] text-muted-foreground/50 font-mono uppercase">{device.current_slot}</span>
            )}
          </div>
        </div>

        {/* Type badge + arrow */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={device.type === 'adb' ? 'default' : 'secondary'} className="text-[10px] font-mono">
            {typeLabel}
          </Badge>
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Detail Item ── */
function DetailItem({ icon: Icon, label, value, mono }: {
  icon: typeof Tag; label: string; value: string; mono?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/50 uppercase">{label}</p>
        <p className={`text-sm truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  )
}

/* ── Status Badge ── */
function StatusBadge({ label, value, icon: Icon, active, warnOnActive, mono }: {
  label: string; value: string
  icon?: typeof Shield
  active?: boolean
  warnOnActive?: boolean
  mono?: boolean
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${
      active
        ? warnOnActive ? 'border-amber-500/20 bg-amber-500/5 text-amber-400' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
        : 'border-border bg-muted text-muted-foreground'
    }`}>
      {Icon && <Icon className="w-3 h-3" />}
      <span className="text-[10px] opacity-60">{label}</span>
      <span className={mono ? 'font-mono' : ''}>{value}</span>
    </div>
  )
}
