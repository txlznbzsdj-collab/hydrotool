import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Shield, ShieldCheck, ShieldAlert, Zap, Download, Loader2, CheckCircle2, Cpu, Layers,
} from 'lucide-react'

const ROOT_METHODS = [
  { id: 'magisk', name: 'Magisk', desc: '最成熟的用户态方案，模块生态庞大。', tag: '推荐', icon: ShieldCheck, color: 'emerald' },
  { id: 'kernelsu', name: 'KernelSU', desc: '内核级方案，隐藏能力更强。', tag: '进阶', icon: Shield, color: 'amber' },
  { id: 'apatch', name: 'APatch', desc: '内核补丁+用户态融合。', tag: '新方案', icon: ShieldAlert, color: 'violet' },
]

export function RootPage() {
  const [serial, setSerial] = useState('')
  const [bootSlots, setBootSlots] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const scanBoot = async () => {
    if (!serial.trim()) return
    setLoading(true); setError(''); setBootSlots(null)
    try {
      const r = await fetch(`/api/root/boot-slots/${serial}`)
      if (!r.ok) throw new Error((await r.json()).detail)
      setBootSlots((await r.json()).slots)
    } catch (e: any) { setError(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Root 管理</h1>
        <p className="text-sm text-muted-foreground">Magisk / KernelSU / APatch — 查看 boot 分区，准备修补</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ROOT_METHODS.map(m => (
          <Card key={m.id} className="group hover:border-brand/30 transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${m.color}-500/10`}>
                  <m.icon className={`w-5 h-5 text-${m.color}-400`} />
                </div>
                <Badge variant="outline" className="text-[10px]">{m.tag}</Badge>
              </div>
              <h3 className="font-semibold mb-1.5">{m.name}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Boot scan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Layers className="w-4 h-4 text-brand" /> Boot 分区查看</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">输入设备序列号，扫描 A/B boot 分区状态，为 Root 修补做准备</p>
          <div className="flex gap-2">
            <Input value={serial} onChange={e => setSerial(e.target.value)} placeholder="设备序列号..." className="h-9 text-sm font-mono flex-1" />
            <Button size="sm" onClick={scanBoot} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
              扫描
            </Button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {bootSlots && (
            <div className="flex gap-2">
              {bootSlots.map((s: any) => (
                <div key={s.slot} className={`flex-1 p-3 rounded-lg border text-center ${s.exists ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-muted'}`}>
                  <span className="text-xs font-mono uppercase">{s.slot}</span>
                  <div className={`text-[11px] mt-1 ${s.exists ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    {s.exists ? '✅ 存在' : '❌ 不存在'}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">Root 修补流程：提取 boot → Magisk 修补 → 刷入修补后的 boot.img</p>
        </CardContent>
      </Card>
    </div>
  )
}
