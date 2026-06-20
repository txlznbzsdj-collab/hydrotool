import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, PackageOpen, Clock } from 'lucide-react'

export function ModulePage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          模块管理
        </h1>
        <p className="text-sm text-muted-foreground">
          Magisk / KernelSU 模块的浏览、安装与统一管理
        </p>
      </div>

      <Card className="border-dashed overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-5">
          {/* Icon */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 gap-1">
                <Clock className="w-3 h-3" />
                即将上线
              </Badge>
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-foreground">模块市场即将上线</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              支持 Magisk / KernelSU 模块的在线浏览、一键安装、自动兼容性检测和模块版本管理。
            </p>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground/50 bg-muted px-3 py-1.5 rounded-full">
            <PackageOpen className="w-3.5 h-3.5" />
            <span>Phase 3 版本推出</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
