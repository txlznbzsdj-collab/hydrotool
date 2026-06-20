import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Wrench, FileArchive, FileImage, HardDrive, Download, Layers,
} from 'lucide-react'

export function ToolsPage() {
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
            <p className="text-xs text-muted-foreground">解析 Google update_engine payload.bin，查看分区列表和提取镜像</p>
            <div className="space-y-2">
              <Input placeholder="payload.bin 文件路径..." className="h-9 text-sm font-mono" />
              <Button variant="outline" size="sm" className="text-xs gap-1.5 w-full">
                <Layers className="w-3.5 h-3.5" /> 解析并预览分区
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Boot tools */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileImage className="w-4 h-4 text-brand" />
              Boot.img 工具
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">拆包/打包 Android boot image (支持 v0-v4 header)</p>
            <div className="space-y-2">
              <Input placeholder="boot.img 文件路径..." className="h-9 text-sm font-mono" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs flex-1 gap-1">拆包</Button>
                <Button variant="outline" size="sm" className="text-xs flex-1 gap-1">打包</Button>
              </div>
            </div>
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
            <p className="text-xs text-muted-foreground">通过 fastboot 或 ADB 备份设备分区到本地</p>
            <div className="space-y-2">
              <Input placeholder="分区名 (如 boot, recovery)..." className="h-9 text-sm font-mono" />
              <Button variant="outline" size="sm" className="text-xs gap-1.5 w-full">
                <Download className="w-3.5 h-3.5" /> 备份分区
              </Button>
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

      <Separator />

      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
        <Wrench className="w-4 h-4 text-muted-foreground mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>可通过 CLI 命令行使用完整功能：</p>
          <code className="bg-muted px-2 py-1 rounded text-[11px] block font-mono">
            hydrotool rom unpack-payload payload.bin<br />
            hydrotool rom unpack-boot boot.img<br />
            hydrotool rom backup boot
          </code>
        </div>
      </div>
    </div>
  )
}
