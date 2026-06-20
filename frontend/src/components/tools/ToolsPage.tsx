import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Wrench, FileArchive, FileImage, HardDrive, Download, Layers,
  Loader2, CheckCircle2, XCircle, Cpu,
} from 'lucide-react'

interface PayloadInfo {
  path: string; version: number; block_size: number; manifest_size: number
  partitions: { name: string; operations: number; new_size: number; has_hash_tree: boolean }[]
}

interface BootInfo {
  path: string; header_version: number; kernel_size: number; ramdisk_size: number
  page_size: number; total_size: number; kernel_addr: string; ramdisk_addr: string
}

interface ExtractResult {
  path: string; output_dir: string; files: Record<string, string>
}

export function ToolsPage() {
  // Payload
  const [payloadPath, setPayloadPath] = useState('')
  const [payloadInfo, setPayloadInfo] = useState<PayloadInfo | null>(null)
  const [payloadLoading, setPayloadLoading] = useState(false)
  const [payloadError, setPayloadError] = useState('')

  // Boot
  const [bootPath, setBootPath] = useState('')
  const [bootInfo, setBootInfo] = useState<BootInfo | null>(null)
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null)
  const [bootLoading, setBootLoading] = useState(false)
  const [bootError, setBootError] = useState('')

  const analyzePayload = async () => {
    if (!payloadPath.trim()) return
    setPayloadLoading(true); setPayloadError(''); setPayloadInfo(null)
    try {
      const r = await fetch('/api/rom/payload-info', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: payloadPath }),
      })
      if (!r.ok) throw new Error((await r.json()).detail)
      setPayloadInfo(await r.json())
    } catch (e: any) { setPayloadError(e.message)
    } finally { setPayloadLoading(false) }
  }

  const analyzeBoot = async () => {
    if (!bootPath.trim()) return
    setBootLoading(true); setBootError(''); setBootInfo(null); setExtractResult(null)
    try {
      const r = await fetch('/api/rom/boot-info', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: bootPath }),
      })
      if (!r.ok) throw new Error((await r.json()).detail)
      setBootInfo(await r.json())
    } catch (e: any) { setBootError(e.message)
    } finally { setBootLoading(false) }
  }

  const extractBoot = async () => {
    if (!bootPath.trim()) return
    setBootLoading(true); setBootError('')
    try {
      const r = await fetch('/api/rom/boot-extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: bootPath }),
      })
      if (!r.ok) throw new Error((await r.json()).detail)
      setExtractResult(await r.json())
    } catch (e: any) { setBootError(e.message)
    } finally { setBootLoading(false) }
  }

  const formatBytes = (b: number) => b >= 1e6 ? `${(b/1e6).toFixed(1)} MB` : b >= 1e3 ? `${(b/1e3).toFixed(1)} KB` : `${b} B`

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">ROM 工具箱</h1>
        <p className="text-sm text-muted-foreground">payload.bin 解析、boot.img 拆包/打包、分区备份</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Payload parser */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileArchive className="w-4 h-4 text-brand" />
              Payload.bin 解析
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">解析 Google update_engine payload.bin，查看分区列表</p>
            <div className="flex gap-2">
              <Input value={payloadPath} onChange={e => setPayloadPath(e.target.value)} placeholder="payload.bin 路径..." className="h-9 text-sm font-mono flex-1" />
              <Button size="sm" onClick={analyzePayload} disabled={payloadLoading} className="gap-1.5 flex-shrink-0">
                {payloadLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                解析
              </Button>
            </div>
            {payloadError && <p className="text-xs text-red-400">{payloadError}</p>}
            {payloadInfo && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="text-xs text-muted-foreground">版本 {payloadInfo.version} · {payloadInfo.block_size}B 块 · {payloadInfo.partitions.length} 个分区</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {payloadInfo.partitions.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted">
                      <span className="font-mono font-medium">{p.name}</span>
                      <span className="text-muted-foreground">{p.operations} ops · {formatBytes(p.new_size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Boot tools */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileImage className="w-4 h-4 text-brand" />
              Boot.img 拆包
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">拆包 Android boot image (支持 header v0-v4)</p>
            <div className="flex gap-2">
              <Input value={bootPath} onChange={e => setBootPath(e.target.value)} placeholder="boot.img 路径..." className="h-9 text-sm font-mono flex-1" />
              <Button size="sm" onClick={analyzeBoot} disabled={bootLoading} className="gap-1.5 flex-shrink-0">
                {bootLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                查看
              </Button>
              <Button size="sm" variant="outline" onClick={extractBoot} disabled={bootLoading || !bootInfo} className="gap-1.5 flex-shrink-0">
                <Download className="w-3.5 h-3.5" /> 拆包
              </Button>
            </div>
            {bootError && <p className="text-xs text-red-400">{bootError}</p>}
            {bootInfo && (
              <div className="space-y-1 p-3 rounded-lg bg-muted/50 border border-border text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Header</span><span>v{bootInfo.header_version}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Kernel</span><span>{formatBytes(bootInfo.kernel_size)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ramdisk</span><span>{formatBytes(bootInfo.ramdisk_size)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Page Size</span><span>{bootInfo.page_size}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{formatBytes(bootInfo.total_size)}</span></div>
              </div>
            )}
            {extractResult && (
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> 拆包完成</div>
                <div className="text-muted-foreground">{extractResult.output_dir}</div>
                {Object.entries(extractResult.files).map(([k, v]) => (
                  <div key={k} className="text-muted-foreground font-mono">  {k}: {v}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backup */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4 text-brand" />
              分区备份
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">通过 fastboot 备份分区到本地</p>
            <div className="flex gap-2">
              <Input placeholder="分区名 (如 boot)..." className="h-9 text-sm font-mono flex-1" />
              <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0"><Download className="w-3.5 h-3.5" /> 备份</Button>
            </div>
          </CardContent>
        </Card>

        {/* DSU */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <HardDrive className="w-4 h-4" />
              DSU 制作
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground/60">动态系统更新镜像制作 — 后续版本推出</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
