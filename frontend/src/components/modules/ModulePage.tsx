import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, PackageOpen, RefreshCw, ToggleLeft, ToggleRight, Loader2, Shield } from 'lucide-react'

interface ModuleItem {
  name: string; source: string; disabled: boolean; description: string
}

const SOURCE_LABELS: Record<string, string> = { '/data/adb/modules': 'Magisk', '/data/adb/ksu/modules': 'KernelSU', '/data/adb/ap/modules': 'APatch' }

export function ModulePage() {
  const [serial, setSerial] = useState('')
  const [modules, setModules] = useState<ModuleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  const loadModules = async () => {
    if (!serial.trim()) return
    setLoading(true); setError('')
    try {
      const r = await fetch(`/api/modules/list/${serial}`)
      if (!r.ok) throw new Error((await r.json()).detail)
      setModules((await r.json()).modules)
    } catch (e: any) { setError(e.message)
    } finally { setLoading(false) }
  }

  const toggleModule = async (mod: ModuleItem) => {
    try {
      const r = await fetch(`/api/modules/toggle/${serial}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: mod.name, enable: mod.disabled, source: mod.source }),
      })
      if (r.ok) {
        setModules(prev => prev.map(m => m.name === mod.name && m.source === mod.source ? { ...m, disabled: !m.disabled } : m))
      }
    } catch {}
  }

  const filtered = filter === 'all' ? modules : filter === 'enabled' ? modules.filter(m => !m.disabled) : modules.filter(m => m.disabled)

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">模块管理</h1>
        <p className="text-sm text-muted-foreground">查看和管理 Magisk / KernelSU / APatch 已安装模块</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4 text-brand" /> 设备模块</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={serial} onChange={e => setSerial(e.target.value)} placeholder="设备序列号..." className="h-9 text-sm font-mono flex-1" />
            <Button size="sm" onClick={loadModules} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              加载
            </Button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </CardContent>
      </Card>

      {modules.length > 0 && (
        <>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs">全部 ({modules.length})</TabsTrigger>
              <TabsTrigger value="enabled" className="text-xs">已启用 ({modules.filter(m => !m.disabled).length})</TabsTrigger>
              <TabsTrigger value="disabled" className="text-xs">已禁用 ({modules.filter(m => m.disabled).length})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            {filtered.map((mod, i) => (
              <Card key={i} className={mod.disabled ? 'opacity-50' : ''}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${mod.disabled ? 'bg-muted' : 'bg-emerald-500/10'}`}>
                    <PackageOpen className={`w-4 h-4 ${mod.disabled ? 'text-muted-foreground' : 'text-emerald-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{mod.name}</span>
                      <Badge variant="outline" className="text-[9px]">{SOURCE_LABELS[mod.source] || mod.source}</Badge>
                      {mod.disabled && <Badge variant="secondary" className="text-[9px]">已禁用</Badge>}
                    </div>
                    {mod.description && <p className="text-[11px] text-muted-foreground truncate">{mod.description}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toggleModule(mod)} className="h-7 gap-1">
                    {mod.disabled ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4 text-emerald-400" />}
                    {mod.disabled ? '启用' : '禁用'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {!serial && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
          <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">输入设备序列号并点击加载，查看该设备上安装的所有 Magisk/KernelSU/APatch 模块。</p>
        </div>
      )}
    </div>
  )
}
