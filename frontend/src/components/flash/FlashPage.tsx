import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Zap, Cpu, HardDrive, Trash2, RotateCw, Unlock, Lock, Sparkles, AlertTriangle, Info,
  ArrowRight,
} from 'lucide-react'
import { DeviceSelector } from '@/components/flash/DeviceSelector'
import { FileSelector } from '@/components/flash/FileSelector'
import { ProgressViewer } from '@/components/flash/ProgressViewer'
import { SlotManager } from '@/components/flash/SlotManager'
import { DangerConfirm } from '@/components/flash/DangerConfirm'
import { useFlashTask } from '@/hooks/useFlashTask'
import { useFlashWebSocket } from '@/hooks/useFlashWebSocket'
import type { Device, FlashMode, FastbootDevice } from '@/types'

interface FlashPageProps {
  devices: Device[]
}

export function FlashPage({ devices }: FlashPageProps) {
  const [serial, setSerial] = useState('')
  const [mode, setMode] = useState<FlashMode>('partition')
  const [partition, setPartition] = useState('boot')
  const [imagePath, setImagePath] = useState('')
  const [fastbootDevices, setFastbootDevices] = useState<FastbootDevice[]>([])
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [lockOpen, setLockOpen] = useState(false)
  const [rebooting, setRebooting] = useState('')

  const { taskId, loading, error: taskError, startTask, resetTask, callSync } = useFlashTask()
  const { progress, logs, status, currentStep, message, connected } = useFlashWebSocket(taskId)

  // Fetch fastboot devices
  useEffect(() => {
    fetch('/api/flash/devices')
      .then(r => r.json())
      .then(d => setFastbootDevices(d.devices || []))
      .catch(() => setFastbootDevices([]))
  }, [devices])

  const handleStartFlash = async () => {
    const params: Record<string, any> = { serial, image_path: imagePath || `/path/to/${partition}.img` }
    if (mode === 'partition') {
      params.partition = partition
    }
    await startTask(mode, params)
  }

  const handleReboot = async (target: string) => {
    setRebooting(target)
    try {
      await callSync('/api/flash/reboot', { serial, target })
    } catch {}
    setRebooting('')
  }

  const handleUnlock = async () => {
    await callSync('/api/flash/unlock', { serial })
  }

  const handleLock = async () => {
    await callSync('/api/flash/lock', { serial })
  }

  const handleSwitchSlot = async (slot: string) => {
    return callSync(`/api/flash/slots/${serial}/switch`, { serial, slot })
  }

  const validate = (): string | null => {
    if (!serial) return '请选择设备'
    if (mode !== 'erase' && !imagePath) return '请选择镜像文件'
    return null
  }
  const validationError = validate()

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">手动刷机</h1>
        <p className="text-sm text-muted-foreground">刷写分区、boot.img、整包 ROM，管理 A/B 槽位</p>
      </div>

      {/* Top row: Device + Mode */}
      <div className="grid gap-4 md:grid-cols-3">
        <DeviceSelector
          devices={devices}
          selected={serial}
          onSelect={setSerial}
          fastbootDevices={fastbootDevices}
        />

        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">刷写模式</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                { id: 'partition' as FlashMode, label: '单分区', icon: HardDrive, desc: '刷写指定分区镜像' },
                { id: 'boot' as FlashMode, label: 'Boot.img', icon: Cpu, desc: '刷入 boot 镜像' },
                { id: 'flash_all' as FlashMode, label: '整包', icon: Zap, desc: 'fastboot flashall' },
                { id: 'erase' as FlashMode, label: '擦除', icon: Trash2, desc: '擦除指定分区' },
              ]).map(opt => {
                const active = mode === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => { setMode(opt.id); resetTask() }}
                    className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-center transition-all ${
                      active ? 'bg-brand/10 border border-brand/30' : 'bg-card border border-border hover:border-muted-foreground/20'
                    }`}
                  >
                    <opt.icon className={`w-4 h-4 ${active ? 'text-brand' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-medium ${active ? 'text-brand' : 'text-muted-foreground'}`}>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flash form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand" />
            {mode === 'partition' && '刷写分区'}
            {mode === 'boot' && '刷入 Boot'}
            {mode === 'flash_all' && '整包刷写'}
            {mode === 'erase' && '擦除分区'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Partition name */}
          {mode === 'partition' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">分区名</label>
              <Input
                value={partition}
                onChange={e => setPartition(e.target.value)}
                placeholder="boot, system, vendor, recovery..."
                className="h-9 text-sm font-mono"
              />
            </div>
          )}

          {/* Erase partition */}
          {mode === 'erase' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">分区名</label>
              <Input
                value={partition}
                onChange={e => setPartition(e.target.value)}
                placeholder="要擦除的分区名..."
                className="h-9 text-sm font-mono"
              />
            </div>
          )}

          {/* File selector (not for erase-only) */}
          {mode !== 'erase' && (
            <FileSelector
              value={imagePath}
              onChange={setImagePath}
              accept={mode === 'flash_all' ? '.zip,.bin' : '.img,.bin'}
              placeholder={
                mode === 'flash_all' ? '拖拽 ROM 包或 payload.bin 到此处' :
                mode === 'boot' ? '拖拽 boot.img 到此处' :
                '拖拽分区镜像到此处'
              }
            />
          )}

          {/* Action */}
          <div className="flex items-center gap-3">
            <Button onClick={handleStartFlash} disabled={loading || !!validationError || status === 'running'} className="gap-2">
              <Zap className="w-4 h-4" />
              {loading ? '提交中...' : status === 'running' ? '执行中' : '开始刷写'}
            </Button>
            {validationError && <span className="text-xs text-amber-400">{validationError}</span>}
            {taskError && <span className="text-xs text-red-400">{taskError}</span>}
            {connected && status === 'running' && (
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">WS 已连接</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <ProgressViewer progress={progress} status={status} currentStep={currentStep} message={message} logs={logs} />

      <Separator />

      {/* Bottom row: Slots + Reboot + Danger */}
      <div className="grid gap-4 md:grid-cols-2">
        <SlotManager serial={serial} onSwitchSlot={handleSwitchSlot} />

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">设备重启</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { target: 'system', label: '系统', icon: RotateCw },
                { target: 'bootloader', label: 'Bootloader', icon: Cpu },
                { target: 'fastbootd', label: 'FastbootD', icon: Zap },
              ]).map(opt => (
                <Button
                  key={opt.target}
                  variant="outline"
                  size="sm"
                  disabled={!serial || rebooting !== ''}
                  onClick={() => handleReboot(opt.target)}
                  className="text-xs h-7 gap-1"
                >
                  <opt.icon className="w-3 h-3" />
                  {rebooting === opt.target ? '重启中...' : opt.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger zone */}
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">危险操作区</p>
                <p className="text-xs text-muted-foreground mt-0.5">OEM 解锁/锁定将清空所有数据</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!serial} onClick={() => setUnlockOpen(true)} className="text-xs h-7 text-amber-400 border-amber-500/30 gap-1">
                <Unlock className="w-3 h-3" /> 解锁
              </Button>
              <Button variant="outline" size="sm" disabled={!serial} onClick={() => setLockOpen(true)} className="text-xs h-7 gap-1">
                <Lock className="w-3 h-3" /> 锁定
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-brand/5 border border-brand/10">
        <Sparkles className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          第一次使用？推荐 <span className="text-brand font-medium">AI 自动刷机</span> 模式 — 自动检测设备、分析 ROM 格式、按序刷写，无需手动输入命令。
        </p>
      </div>

      {/* Dialogs */}
      <DangerConfirm
        open={unlockOpen}
        title="确认解锁 Bootloader"
        description="解锁 Bootloader 将清空设备所有数据，且可能导致保修失效。此操作不可逆。"
        confirmText="UNLOCK"
        onConfirm={handleUnlock}
        onCancel={() => setUnlockOpen(false)}
      />
      <DangerConfirm
        open={lockOpen}
        title="确认锁定 Bootloader"
        description="锁定 Bootloader 后设备将恢复到出厂安全状态。如果当前系统不是原厂固件，锁定后可能无法启动。"
        confirmText="LOCK"
        onConfirm={handleLock}
        onCancel={() => setLockOpen(false)}
      />
    </div>
  )
}
