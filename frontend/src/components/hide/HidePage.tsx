import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle,
  Loader2, RefreshCw, Eye,
} from 'lucide-react'

interface CheckItem { check: string; status: string; output: string; label: string; description: string }

export function HidePage() {
  const [serial, setSerial] = useState('')
  const [results, setResults] = useState<CheckItem[]>([])
  const [verdict, setVerdict] = useState('')
  const [riskCount, setRiskCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const scan = async () => {
    if (!serial.trim()) return
    setLoading(true); setError(''); setResults([]); setVerdict('')
    try {
      const r = await fetch(`/api/hide/scan/${serial}`, { method: 'POST' })
      if (!r.ok) throw new Error((await r.json()).detail)
      const data = await r.json()
      setResults(data.checks)
      setVerdict(data.verdict)
      setRiskCount(data.risk_count)
    } catch (e: any) { setError(e.message)
    } finally { setLoading(false) }
  }

  const verdictColor = verdict === 'safe' ? 'emerald' : verdict === 'exposed' ? 'amber' : 'red'
  const VerdictIcon = verdict === 'safe' ? ShieldCheck : verdict === 'exposed' ? ShieldAlert : XCircle

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">环境隐藏检测</h1>
        <p className="text-sm text-muted-foreground">扫描常见 Root 检测点，评估设备环境隐藏状态</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4 text-brand" /> 扫描设备</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={serial} onChange={e => setSerial(e.target.value)} placeholder="设备序列号..." className="h-9 text-sm font-mono flex-1" />
            <Button size="sm" onClick={scan} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              扫描
            </Button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </CardContent>
      </Card>

      {verdict && (
        <Card className={`border-${verdictColor}-500/20 bg-${verdictColor}-500/5`}>
          <CardContent className="p-4 flex items-center gap-3">
            <VerdictIcon className={`w-8 h-8 text-${verdictColor}-400`} />
            <div>
              <p className={`text-lg font-bold text-${verdictColor}-400`}>
                {verdict === 'safe' ? '环境安全' : verdict === 'exposed' ? '存在暴露风险' : '高风险'}
              </p>
              <p className="text-xs text-muted-foreground">{results.length} 项检测，{riskCount} 项存在风险</p>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((item, i) => (
            <Card key={i} className={item.status === 'risky' ? 'border-amber-500/10' : ''}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  item.status === 'risky' ? 'bg-amber-500/10' : item.status === 'safe' ? 'bg-emerald-500/10' : 'bg-muted'
                }`}>
                  {item.status === 'risky' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> :
                   item.status === 'safe' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> :
                   <XCircle className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">{item.label}</span>
                    <Badge variant={item.status === 'risky' ? 'secondary' : 'outline'} className={`text-[9px] ${item.status === 'risky' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {item.status === 'risky' ? '⚠ 风险' : item.status === 'safe' ? '✅ 安全' : '❓ 未知'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                  {item.output && item.status === 'risky' && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{item.output}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!serial && !verdict && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
          <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>输入设备序列号后扫描以下检测点：</p>
            <ul className="list-disc list-inside space-y-0.5 ml-1 text-[11px]">
              <li>su / Magisk 二进制文件</li>
              <li>Magisk Manager / Xposed / LSPosed 应用</li>
              <li>SELinux 状态与 Verified Boot</li>
              <li>ADB Root 与 debuggable 属性</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
