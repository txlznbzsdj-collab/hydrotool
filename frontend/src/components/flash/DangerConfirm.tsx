import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'

interface DangerConfirmProps {
  open: boolean
  title: string
  description: string
  confirmText?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function DangerConfirm({
  open,
  title,
  description,
  confirmText = 'UNLOCK',
  onConfirm,
  onCancel,
}: DangerConfirmProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (input !== confirmText || loading) return
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
      setInput('')
      onCancel()
    }
  }

  const handleClose = () => {
    setInput('')
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            请输入 <code className="bg-muted px-1.5 py-0.5 rounded text-destructive font-mono">{confirmText}</code> 以确认操作
          </p>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={confirmText}
            className="font-mono"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} size="sm">取消</Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={input !== confirmText || loading}
              size="sm"
            >
              {loading ? '执行中...' : '确认'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
