import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import type { FlashLogEntry } from '@/types'

interface ProgressViewerProps {
  progress: number
  status: string
  currentStep: string
  message: string
  logs: FlashLogEntry[]
}

const LEVEL_ICONS: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
  warn: AlertTriangle,
}

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-muted-foreground',
  success: 'text-emerald-400',
  error: 'text-red-400',
  warn: 'text-amber-400',
}

export function ProgressViewer({ progress, status, currentStep, message, logs }: ProgressViewerProps) {
  const isActive = status === 'running' || status === 'pending'
  const isDone = status === 'completed'
  const isFailed = status === 'failed'

  if (status === 'idle') return null

  return (
    <Card className={isDone ? 'border-emerald-500/20' : isFailed ? 'border-red-500/20' : ''}>
      <CardContent className="p-4 space-y-3">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isActive && <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />}
              {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
              <span className="text-sm font-medium">
                {isActive ? currentStep || '执行中...' : isDone ? '完成' : isFailed ? '失败' : '等待中'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{Math.round(progress)}%</span>
          </div>
          <Progress
            value={progress}
            className={`h-1.5 ${isDone ? '[&>div]:bg-emerald-500' : isFailed ? '[&>div]:bg-red-500' : ''}`}
          />
        </div>

        {/* Message */}
        {message && (
          <p className={`text-xs ${isDone ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-muted-foreground'}`}>
            {message}
          </p>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <ScrollArea className="h-32">
            <div className="space-y-0.5 font-mono">
              {logs.map((log, i) => {
                const Icon = LEVEL_ICONS[log.level] || Info
                return (
                  <div key={i} className={`flex items-start gap-1.5 text-[11px] ${LEVEL_COLORS[log.level] || ''}`}>
                    <Icon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span className="break-all">{log.message}</span>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
