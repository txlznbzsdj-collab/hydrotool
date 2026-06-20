import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeftRight, Check, Loader2 } from 'lucide-react'
import type { SlotInfo } from '@/types'

interface SlotManagerProps {
  serial: string
  onSwitchSlot?: (slot: string) => Promise<any>
}

export function SlotManager({ serial, onSwitchSlot }: SlotManagerProps) {
  const [info, setInfo] = useState<SlotInfo | null>(null)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!serial) return
    fetch(`/api/flash/slots/${serial}`)
      .then(r => r.json())
      .then(setInfo)
      .catch(() => setInfo(null))
  }, [serial])

  const handleSwitch = async (slot: string) => {
    if (!onSwitchSlot || switching) return
    setSwitching(true)
    setError('')
    try {
      await onSwitchSlot(slot)
      setInfo(prev => prev ? { ...prev, current_slot: slot } : null)
    } catch (e: any) {
      setError(e.message || '切换失败')
    } finally {
      setSwitching(false)
    }
  }

  if (!info || !info.ab_support) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-6">
          <span className="text-xs text-muted-foreground">设备不支持 A/B 槽位</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">A/B 槽位</span>
        </div>

        <div className="flex gap-2">
          {info.slots.map(slot => {
            const active = slot === info.current_slot
            return (
              <div
                key={slot}
                className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-sm font-mono ${
                  active ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'
                }`}
              >
                <span className="uppercase">{slot}</span>
                {active && <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">当前</Badge>}
              </div>
            )
          })}
        </div>

        {info.current_slot && (
          <div className="flex gap-2">
            {info.slots.filter(s => s !== info.current_slot).map(slot => (
              <Button
                key={slot}
                variant="outline"
                size="sm"
                disabled={switching}
                onClick={() => handleSwitch(slot)}
                className="text-xs h-7 gap-1"
              >
                {switching ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowLeftRight className="w-3 h-3" />}
                切换到 {slot.toUpperCase()}
              </Button>
            ))}
          </div>
        )}

        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </CardContent>
    </Card>
  )
}
