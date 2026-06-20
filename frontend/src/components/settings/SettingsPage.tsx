import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Settings2, Key, Globe, Cpu, Info } from 'lucide-react'

export function SettingsPage() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('hydrotool_ai_key') || '')
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('hydrotool_ai_url') || '')
  const [model, setModel] = useState(() => localStorage.getItem('hydrotool_ai_model') || 'gpt-4o-mini')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('hydrotool_ai_key', apiKey)
    localStorage.setItem('hydrotool_ai_url', baseUrl)
    localStorage.setItem('hydrotool_ai_model', model)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">设置</h1>
        <p className="text-sm text-muted-foreground">全局配置与系统信息</p>
      </div>

      {/* API Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-brand" />
            AI 接口配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">配置 OpenAI 兼容 API，用于 AI 自动刷机模式。支持 OpenAI / DeepSeek / 硅基流动 / 本地模型。</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">API Key</label>
              <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Base URL</label>
              <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="默认 OpenAI" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">模型</label>
              <Input value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o-mini" className="h-9 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave}>{saved ? '✅ 已保存' : '保存'}</Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Connection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand" />
            后端连接
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">地址</span>
            <span className="font-mono">localhost:8000</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">状态</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> 本地服务
            </span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* About */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-brand" />
            关于
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">版本</span><span>v0.4.0</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">环境</span><span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Python + FastAPI</span></div>
            <div className="flex justify-between col-span-2"><span className="text-muted-foreground">许可</span><span>AGPL-3.0</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
