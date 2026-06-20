import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Cpu,
  Monitor,
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Zap,
  Heart,
  ArrowRight,
} from 'lucide-react'
import type { Device, AiTarget, AiStep } from '@/types'

interface AiAutoPageProps {
  devices: Device[]
}

const TARGETS: { value: AiTarget; label: string; desc: string; icon: typeof Cpu }[] = [
  { value: 'detect', label: '仅检测', desc: '检查环境与设备，不执行操作', icon: Monitor },
  { value: 'root', label: '获取 Root', desc: '自动修补 boot.img 并刷入', icon: Shield },
  { value: 'flash', label: '刷入 ROM', desc: '智能识别 ROM 格式并刷入', icon: Zap },
  { value: 'unbrick', label: '救砖恢复', desc: '检测设备模式并执行恢复', icon: Heart },
]

const STEPS = [
  { step: 1 as AiStep, title: '运行环境检测', desc: '检查 ADB、Fastboot、驱动是否就绪' },
  { step: 2 as AiStep, title: '设备识别', desc: '自动检测设备型号与 BL 状态' },
  { step: 3 as AiStep, title: '选择目标', desc: '选择您需要的操作' },
  { step: 4 as AiStep, title: '自动执行', desc: '全自动完成所选操作' },
]

export function AiAutoPage({ devices }: AiAutoPageProps) {
  const [step, setStep] = useState<AiStep>(1)
  const [target, setTarget] = useState<AiTarget>('detect')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleStart = () => {
    if (target === 'detect') return
    setRunning(true)
    setProgress(0)
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          setRunning(false)
          return 100
        }
        return prev + 1
      })
    }, 50)
    setTimeout(() => setStep(4), 2000)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          AI 自动刷机模式
        </h1>
        <p className="text-sm text-muted-foreground">
          面向小白的一键式体验：环境检测 → 设备识别 → 目标选择 → 全自动执行
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((s) => {
          const isActive = step === s.step
          const isDone = step > s.step

          return (
            <Card
              key={s.step}
              className={`transition-all duration-300 ${
                isActive
                  ? 'border-brand/40 bg-brand/5 shadow-lg shadow-brand/5'
                  : isDone
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-border opacity-60'
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Step indicator */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isActive
                        ? 'bg-brand text-white shadow-md shadow-brand/30'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-sm font-semibold ${
                        isActive ? 'text-brand' :
                        isDone ? 'text-emerald-400' :
                        'text-muted-foreground'
                      }`}>
                        {s.title}
                      </h3>
                      {isDone && <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">已完成</Badge>}
                      {isActive && <Badge variant="outline" className="text-[10px] text-brand border-brand/30">进行中</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>

                    {/* Step 1 content — env check */}
                    {isActive && s.step === 1 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {[
                          { label: '操作系统', value: 'Windows / Linux / macOS', ok: true },
                          { label: 'ADB 工具', value: '需安装 Android Platform Tools', ok: false },
                          { label: 'Fastboot', value: '需安装（同上）', ok: false },
                          { label: 'USB 驱动', value: '需安装手机厂商驱动', ok: false },
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-2 text-xs">
                            {item.ok
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            }
                            <span className="text-muted-foreground">{item.label}:</span>
                            <span className="text-muted-foreground/60 truncate">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Step 2 content — device detect */}
                    {isActive && s.step === 2 && (
                      <div className="mt-3">
                        {devices.length > 0 ? (
                          <div className="flex items-center gap-2 text-sm text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            已检测到 {devices.length} 台设备
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            等待设备连接...
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 3 content — target selection */}
                    {isActive && s.step === 3 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {TARGETS.map(opt => {
                          const selected = target === opt.value
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setTarget(opt.value)}
                              className={`flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-200 ${
                                selected
                                  ? 'bg-brand text-white shadow-md shadow-brand/20'
                                  : 'bg-card hover:bg-accent border border-border'
                              }`}
                            >
                              <opt.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                selected ? 'text-white' : 'text-muted-foreground'
                              }`} />
                              <div>
                                <div className="text-sm font-medium">{opt.label}</div>
                                <div className={`text-xs mt-0.5 ${
                                  selected ? 'text-white/70' : 'text-muted-foreground/60'
                                }`}>
                                  {opt.desc}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Step 4 content — execution */}
                    {isActive && s.step === 4 && (
                      <div className="mt-3 space-y-3">
                        {running && (
                          <div className="space-y-2">
                            <Progress value={progress} className="h-1.5" />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">正在执行...</span>
                              <span className="text-muted-foreground tabular-nums">{progress}%</span>
                            </div>
                          </div>
                        )}
                        <Button
                          onClick={handleStart}
                          disabled={running || target === 'detect'}
                          className="gap-2"
                        >
                          {running ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              执行中...
                            </>
                          ) : target === 'detect' ? (
                            <>
                              <ArrowRight className="w-4 h-4" />
                              请先选择目标
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              开始自动执行
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
