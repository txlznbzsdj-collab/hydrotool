import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Zap,
  Terminal,
  Cpu,
  HardDrive,
  ArrowRight,
  Info,
} from 'lucide-react'

const FLASH_STEPS = [
  { step: 1, label: '解锁 Bootloader', cmd: 'adb reboot bootloader', note: '首次刷机需要，会清空数据' },
  { step: 2, label: '重启到 Fastboot', cmd: 'adb reboot bootloader', icon: Cpu },
  { step: 3, label: '刷入 ROM', cmd: 'hydrotool flash payload your_rom.bin', icon: HardDrive },
  { step: 4, label: '刷入 boot', cmd: 'hydrotool flash boot patched_boot.img', icon: Zap },
  { step: 5, label: '重启设备', note: '刷写完成后自动重启', icon: ArrowRight },
]

export function FlashPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          手动刷机
        </h1>
        <p className="text-sm text-muted-foreground">
          完整的手动刷机流程，适用于进阶用户
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="w-4 h-4 text-brand" />
            刷机步骤
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {FLASH_STEPS.map((item, idx) => (
              <li key={item.step} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.cmd && (
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {item.cmd}
                      </Badge>
                    )}
                  </div>
                  {item.note && (
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  )}
                </div>
                {idx < FLASH_STEPS.length - 1 && (
                  <Separator orientation="vertical" className="h-4 self-center flex-shrink-0" />
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-brand/5 border border-brand/10">
        <Info className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          推荐使用 <span className="text-brand font-medium">AI 自动刷机</span> 模式，无需手动输入命令，全自动完成检测、刷入与验证。
        </p>
      </div>
    </div>
  )
}
