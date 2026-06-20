import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

const ROOT_METHODS: {
  id: string
  name: string
  desc: string
  tag: string
  tagVariant: 'default' | 'secondary' | 'outline'
  icon: typeof Shield
}[] = [
  {
    id: 'magisk',
    name: 'Magisk',
    desc: '最成熟的用户态方案，拥有庞大的模块生态，社区活跃，更新稳定。适合大多数用户。',
    tag: '推荐',
    tagVariant: 'default',
    icon: ShieldCheck,
  },
  {
    id: 'kernelsu',
    name: 'KernelSU',
    desc: '内核级 Root 方案，隐藏能力更强，Root 检测难以发现。适合需要高隐蔽性的场景。',
    tag: '进阶',
    tagVariant: 'secondary',
    icon: Shield,
  },
  {
    id: 'apatch',
    name: 'APatch',
    desc: '内核补丁与用户态融合的全新方案，兼顾兼容性与隐蔽性。适合追求最新技术的用户。',
    tag: '新方案',
    tagVariant: 'outline',
    icon: ShieldAlert,
  },
]

export function RootPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Root 管理
        </h1>
        <p className="text-sm text-muted-foreground">
          选择适合你的 Root 方案，统一管理 Magisk / KernelSU / APatch
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ROOT_METHODS.map(method => (
          <Card
            key={method.id}
            className="group hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300 flex flex-col"
          >
            <CardContent className="p-5 flex flex-col flex-1">
              {/* Icon + Tag */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  method.id === 'magisk'
                    ? 'bg-emerald-500/10'
                    : method.id === 'kernelsu'
                      ? 'bg-amber-500/10'
                      : 'bg-violet-500/10'
                }`}>
                  <method.icon className={`w-5 h-5 ${
                    method.id === 'magisk'
                      ? 'text-emerald-400'
                      : method.id === 'kernelsu'
                        ? 'text-amber-400'
                        : 'text-violet-400'
                  }`} />
                </div>
                <Badge variant={method.tagVariant} className="text-[10px]">
                  {method.tag}
                </Badge>
              </div>

              {/* Content */}
              <h3 className="font-semibold mb-2">{method.name}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                {method.desc}
              </p>

              {/* Action */}
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 self-start gap-1.5 text-brand hover:text-brand hover:bg-brand/5 group-hover:gap-2 transition-all"
              >
                查看安装步骤
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
        <Sparkles className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          不确定选哪个？使用 <span className="text-brand font-medium">AI 自动模式</span>，系统会根据你的设备和需求自动推荐最合适的 Root 方案。
        </p>
      </div>
    </div>
  )
}
