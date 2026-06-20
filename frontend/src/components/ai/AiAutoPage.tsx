import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Settings2,
  Terminal,
  XCircle,
} from 'lucide-react'
import type { Device, AiTarget, AiStep } from '@/types'

const TARGETS: { value: AiTarget; label: string; desc: string; icon: typeof Cpu }[] = [
  { value: 'detect', label: '仅检测', desc: '检查环境与设备，不执行操作', icon: Monitor },
  { value: 'root', label: '获取 Root', desc: '自动修补 boot.img 并刷入', icon: Shield },
  { value: 'flash', label: '刷入 ROM', desc: '智能识别 ROM 格式并刷入', icon: Zap },
  { value: 'unbrick', label: '救砖恢复', desc: '检测设备模式并执行恢复', icon: Heart },
]

interface AiAutoPageProps {
  devices: Device[]
}

interface ExecutionStep {
  step: number
  tool: string
  args: Record<string, string>
  result: string
}

export function AiAutoPage({ devices }: AiAutoPageProps) {
  const [step, setStep] = useState<AiStep>(1)
  const [target, setTarget] = useState<AiTarget>('detect')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [steps, setSteps] = useState<ExecutionStep[]>([])
  const [summary, setSummary] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Settings
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('hydrotool_ai_key') || '')
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('hydrotool_ai_url') || '')
  const [model, setModel] = useState(() => localStorage.getItem('hydrotool_ai_model') || 'gpt-4o-mini')
  const wsRef = useRef<WebSocket | null>(null)

  // Cleanup WS on unmount
  useEffect(() => {
    return () => { wsRef.current?.close() }
  }, [])

  const saveSettings = () => {
    localStorage.setItem('hydrotool_ai_key', apiKey)
    localStorage.setItem('hydrotool_ai_url', baseUrl)
    localStorage.setItem('hydrotool_ai_model', model)
    setShowSettings(false)
  }

  const handleStart = async () => {
    if (target === 'detect' || !apiKey.trim()) return
    setRunning(true)
    setProgress(10)
    setSteps([])
    setSummary('')
    setError('')
    setSuccess(false)

    // Connect WebSocket for real-time progress
    const wsUrl = `ws://${window.location.hostname}:8000/api/ai/progress`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'ai_step') {
          setSteps(prev => {
            const newSteps = [...prev, {
              step: msg.step,
              tool: msg.tool,
              args: msg.args || {},
              result: msg.result || '',
            }]
            return newSteps
          })
          setProgress(10 + Math.min(msg.step * 20, 85))
        }
      } catch {}
    }

    // Wait briefly for WS to connect
    await new Promise<void>((resolve) => {
      ws.onopen = () => resolve()
      setTimeout(() => resolve(), 2000)
    })

    // Call API
    try {
      setStep(4) // Move to execution step
      const resp = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: TARGETS.find(t => t.value === target)?.label + ' - ' +
                (target === 'root' ? '为设备获取 Root 权限' :
                 target === 'flash' ? '刷入 ROM 固件' :
                 '恢复设备'),
          api_key: apiKey,
          base_url: baseUrl || undefined,
          model: model || undefined,
        }),
      })
      const data = await resp.json()

      if (!resp.ok) {
        throw new Error(data.detail || '请求失败')
      }

      setSummary(data.summary || '执行完成')
      setSuccess(data.success)
      setProgress(100)
    } catch (err: any) {
      setError(err.message || '执行出错')
      setProgress(0)
    } finally {
      setRunning(false)
      ws.close()
      wsRef.current = null
    }
  }

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'check_environment': return <Monitor className="w-4 h-4" />
      case 'get_device_info': return <Terminal className="w-4 h-4" />
      case 'run_adb_command': return <Terminal className="w-4 h-4" />
      case 'run_fastboot_command': return <Zap className="w-4 h-4" />
      case 'finalize': return <CheckCircle2 className="w-4 h-4" />
      default: return <Cpu className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            AI 自动刷机模式
          </h1>
          <p className="text-sm text-muted-foreground">
            AI 分析目标 → 自动生成命令 → 执行 → 反馈 → 循环直到完成
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)} className="gap-1.5">
          <Settings2 className="w-3.5 h-3.5" />
          设置
        </Button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <Card className="border-brand/20 animate-in slide-in-from-top-2 duration-300">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              配置 OpenAI 兼容 API（支持 OpenAI / DeepSeek / 硅基流动 / 本地模型等）
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">API Key *</label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Base URL（可选）</label>
                <Input
                  placeholder="默认 OpenAI"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">模型</label>
                <Input
                  placeholder="gpt-4o-mini"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={saveSettings}>保存设置</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <div className="space-y-4">
        {([
          { s: 1 as AiStep, title: '运行环境检测', desc: '检查 ADB、Fastboot、驱动是否就绪' },
          { s: 2 as AiStep, title: '设备识别', desc: '自动检测设备型号与 BL 状态' },
          { s: 3 as AiStep, title: '选择目标', desc: '选择您需要的操作' },
          { s: 4 as AiStep, title: 'AI 自动执行', desc: 'AI 分析 → 命令生成 → 执行 → 反馈循环' },
        ]).map((s) => {
          const isActive = step === s.s
          const isDone = step > s.s

          return (
            <Card
              key={s.s}
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isActive
                        ? 'bg-brand text-white shadow-md shadow-brand/30'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.s}
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

                    {/* Step 1: Env check */}
                    {isActive && s.s === 1 && (
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

                    {/* Step 2: Device detect */}
                    {isActive && s.s === 2 && (
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

                    {/* Step 3: Target */}
                    {isActive && s.s === 3 && (
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

                    {/* Step 4: AI Execution */}
                    {isActive && s.s === 4 && (
                      <div className="mt-3 space-y-3">
                        {/* Real-time steps from AI */}
                        {steps.length > 0 && (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {steps.map((st, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className="mt-0.5 flex-shrink-0">{getToolIcon(st.tool)}</span>
                                <div className="min-w-0 flex-1">
                                  <span className="font-mono text-muted-foreground">{st.tool}</span>
                                  <span className="text-muted-foreground/60 ml-2 truncate">
                                    {st.result?.slice(0, 80)}
                                  </span>
                                </div>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Progress bar */}
                        {running && (
                          <div className="space-y-2">
                            <Progress value={progress} className="h-1.5" />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-brand flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                AI 正在分析并执行...
                              </span>
                              <span className="text-muted-foreground tabular-nums">{progress}%</span>
                            </div>
                          </div>
                        )}

                        {/* Summary */}
                        {summary && !running && (
                          <div className={`p-4 rounded-lg ${
                            success ? 'bg-emerald-500/10 border border-emerald-500/20' :
                            'bg-red-500/10 border border-red-500/20'
                          }`}>
                            <div className="flex items-start gap-2">
                              {success
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                : <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                              }
                              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {summary}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Error */}
                        {error && !running && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                            {error}
                          </div>
                        )}

                        {/* Action button */}
                        {!running && !summary && (
                          <Button
                            onClick={handleStart}
                            disabled={target === 'detect' || !apiKey.trim()}
                            className="gap-2"
                          >
                            {target === 'detect' ? (
                              <>
                                <ArrowRight className="w-4 h-4" />
                                请先选择目标
                              </>
                            ) : !apiKey.trim() ? (
                              <>
                                <Settings2 className="w-4 h-4" />
                                请先配置 API Key
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                开始 AI 自动执行
                              </>
                            )}
                          </Button>
                        )}

                        {/* Retry */}
                        {!running && (summary || error) && (
                          <Button
                            variant="outline"
                            onClick={handleStart}
                            className="gap-2"
                          >
                            <Play className="w-4 h-4" />
                            重新执行
                          </Button>
                        )}
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
