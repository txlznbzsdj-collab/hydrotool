import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Smartphone, Cpu, Lock, Unlock, Check } from 'lucide-react'
import type { Device, FastbootDevice } from '@/types'

interface DeviceSelectorProps {
  devices: Device[]
  selected: string
  onSelect: (serial: string) => void
  fastbootDevices?: FastbootDevice[]
}

export function DeviceSelector({ devices, selected, onSelect, fastbootDevices }: DeviceSelectorProps) {
  const all = devices.filter(d => d.type === 'fastboot')

  if (all.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
          <Smartphone className="w-6 h-6 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">未检测到 Fastboot 设备</p>
          <p className="text-[10px] text-muted-foreground/50">请将设备重启到 Fastboot 模式</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">选择设备</label>
      <div className="space-y-1">
        {all.map(d => {
          const active = selected === d.serial
          const fbInfo = fastbootDevices?.find(fd => fd.serial === d.serial)
          return (
            <button
              key={d.serial}
              onClick={() => onSelect(d.serial)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                active
                  ? 'bg-brand/10 border border-brand/30'
                  : 'bg-card border border-border hover:border-muted-foreground/20'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                active ? 'bg-brand/20' : 'bg-muted'
              }`}>
                <Cpu className={`w-4 h-4 ${active ? 'text-brand' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{d.serial}</span>
                  {active && <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {fbInfo?.mode && (
                    <Badge variant="outline" className="text-[9px] font-mono px-1 py-0">{fbInfo.mode}</Badge>
                  )}
                  {fbInfo?.unlocked !== null && (
                    <span className={`text-[10px] flex items-center gap-1 ${fbInfo?.unlocked ? 'text-amber-400' : 'text-muted-foreground'}`}>
                      {fbInfo?.unlocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                      {fbInfo?.unlocked ? '已解锁' : '已锁定'}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
