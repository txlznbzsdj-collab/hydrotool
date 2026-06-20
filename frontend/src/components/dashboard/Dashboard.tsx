import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Smartphone,
  Usb,
  Cpu,
  Monitor,
  ChevronRight,
  Wifi,
  Cable,
} from 'lucide-react'
import type { Device } from '@/types'

interface DashboardProps {
  devices: Device[]
}

export function Dashboard({ devices }: DashboardProps) {
  const adbCount = devices.filter(d => d.type === 'adb').length
  const fastbootCount = devices.filter(d => d.type === 'fastboot').length

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
      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="已连接设备"
          value={devices.length}
          icon={Smartphone}
          variant="default"
        />
        <Stat
          label="ADB 设备"
          value={adbCount}
          icon={Usb}
          variant={adbCount > 0 ? 'success' : 'muted'}
        />
        <Stat
          label="Fastboot 设备"
          value={fastbootCount}
          icon={Cpu}
          variant={fastbootCount > 0 ? 'warning' : 'muted'}
        />
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
              <DeviceCard key={device.serial} device={device} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/* ── Stat Card ── */
function Stat({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string
  value: number
  icon: typeof Smartphone
  variant: 'default' | 'success' | 'warning' | 'muted'
}) {
  const variants = {
    default: 'from-brand/10 to-brand/5 border-brand/20',
    success: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    warning: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    muted: 'from-muted to-muted border-border',
  }

  return (
    <Card className={`bg-gradient-to-br ${variants[variant]} relative overflow-hidden group transition-all duration-300 hover:scale-[1.02]`}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          variant === 'default' ? 'bg-brand/15' :
          variant === 'success' ? 'bg-emerald-500/15' :
          variant === 'warning' ? 'bg-amber-500/15' :
          'bg-muted-foreground/10'
        }`}>
          <Icon className={`w-5 h-5 ${
            variant === 'default' ? 'text-brand' :
            variant === 'success' ? 'text-emerald-400' :
            variant === 'warning' ? 'text-amber-400' :
            'text-muted-foreground'
          }`} />
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Device Card ── */
function DeviceCard({ device }: { device: Device }) {
  const typeLabel = device.type.toUpperCase()
  const typeVariant = device.type === 'adb' ? 'success' : 'warning'

  return (
    <Card className="group cursor-pointer hover:border-brand/30 transition-all duration-200 hover:shadow-md hover:shadow-brand/5">
      <CardContent className="p-4 flex items-center gap-4">
        {/* Device icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          device.type === 'adb' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
        }`}>
          <Smartphone className={`w-5 h-5 ${
            device.type === 'adb' ? 'text-emerald-400' : 'text-amber-400'
          }`} />
        </div>

        {/* Device info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-sm truncate">
              {device.brand && device.model
                ? `${device.brand} ${device.model}`
                : device.serial}
            </span>
            {device.android_version && (
              <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Android {device.android_version}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{device.serial}</div>
        </div>

        {/* Status badge + arrow */}
        <div className="flex items-center gap-3">
          <Badge variant={typeVariant === 'success' ? 'default' : 'secondary'} className="text-[10px] font-mono">
            {typeLabel}
          </Badge>
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
        </div>
      </CardContent>
    </Card>
  )
}
