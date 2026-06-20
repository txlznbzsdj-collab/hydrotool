import { useState, useEffect } from 'react'

interface Device {
  serial: string
  model?: string
  brand?: string
  android_version?: string
  type: 'adb' | 'fastboot'
  status?: string
}

type Page = 'dashboard' | 'ai-auto' | 'flash' | 'root' | 'modules'

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [devices, setDevices] = useState<Device[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    fetch('/api/devices')
      .then(r => r.json())
      .then(d => setDevices(d.devices || []))
      .catch(() => setDevices([]))

    const ws = new WebSocket(`ws://${window.location.hostname}:8000/ws/devices`)
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'device_status') {
          // Simple mapping from WebSocket data
          const wsDevices: Device[] = (data.devices || []).map((d: any) => ({
            serial: d.serial,
            model: d.model,
            brand: d.brand,
            type: d.type,
            status: d.status,
          }))
          if (wsDevices.length > 0) setDevices(wsDevices)
        }
      } catch {}
    }

    // Poll every 5s as fallback
    const interval = setInterval(() => {
      fetch('/api/devices')
        .then(r => r.json())
        .then(d => {
          if (d.devices?.length > 0) setDevices(d.devices)
        })
        .catch(() => {})
    }, 5000)

    return () => { ws.close(); clearInterval(interval) }
  }, [])

  const navItems: { id: Page; label: string }[] = [
    { id: 'dashboard', label: '仪表盘' },
    { id: 'ai-auto', label: '🤖 AI 刷机' },
    { id: 'flash', label: '刷机' },
    { id: 'root', label: 'Root' },
    { id: 'modules', label: '模块' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-blue-600">
            HydroTool <span className="text-slate-400 font-normal text-sm">鸿德工具箱</span>
          </h1>
          <div className="flex items-center gap-2 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className="text-slate-500">{connected ? '后端已连接' : '后端未连接'}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              {devices.length > 0 ? `${devices.length} 台设备` : '无设备'}
            </span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                page === item.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {page === 'dashboard' && <Dashboard devices={devices} />}
        {page === 'ai-auto' && <AiAutoPage devices={devices} />}
        {page === 'flash' && <FlashPage />}
        {page === 'root' && <RootPage />}
        {page === 'modules' && <ModulePage />}
      </main>
    </div>
  )
}

/* ── Dashboard ── */
function Dashboard({ devices }: { devices: Device[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">📱 设备仪表盘</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="已连接设备" value={devices.length} color="blue" />
        <StatCard
          label="ADB 设备"
          value={devices.filter(d => d.type === 'adb').length}
          color="green"
        />
        <StatCard
          label="Fastboot 设备"
          value={devices.filter(d => d.type === 'fastboot').length}
          color="orange"
        />
      </div>

      {/* Device List */}
      {devices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">📵</div>
          <h3 className="text-lg font-medium text-slate-700 mb-1">未检测到设备</h3>
          <p className="text-slate-500 text-sm">
            请通过 USB 连接 Android 手机，并开启 USB 调试模式
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {devices.map(device => (
            <div key={device.serial} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">
                📱
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800">
                  {device.brand && device.model
                    ? `${device.brand} ${device.model}`
                    : device.serial}
                </div>
                <div className="text-xs text-slate-500 font-mono">{device.serial}</div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                  device.type === 'adb' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {device.type.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  )
}

/* ── AI 自动模式 ── */
function AiAutoPage({ devices }: { devices: Device[] }) {
  const [step, setStep] = useState(1)
  const [target, setTarget] = useState('detect')
  const [running, setRunning] = useState(false)

  const handleStart = () => {
    if (target === 'detect') return
    setRunning(true)
    // Simulate steps
    setTimeout(() => setStep(4), 3000)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">🤖 AI 自动刷机模式</h2>
      <p className="text-slate-500 text-sm">小白专属：识别环境 → 检测设备 → 一键操作</p>

      {/* Step 1: Environment */}
      <StepCard step={1} active={step === 1} done={step > 1} title="运行环境检测">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <EnvItem label="操作系统" value="Windows / Linux / macOS" ok />
          <EnvItem label="ADB 工具" value="需安装 Android Platform Tools" ok={false} />
          <EnvItem label="Fastboot" value="同上" ok={false} />
          <EnvItem label="USB 驱动" value="需手机厂商驱动" ok={false} />
        </div>
      </StepCard>

      {/* Step 2: Device */}
      <StepCard step={2} active={step === 2} done={step > 2} title="设备识别">
        {devices.length > 0 ? (
          <div className="text-sm text-green-600">
            ✅ 已检测到 {devices.length} 台设备
          </div>
        ) : (
          <div className="text-sm text-slate-500">等待设备连接...</div>
        )}
      </StepCard>

      {/* Step 3: Choose target */}
      <StepCard step={3} active={step === 3} done={step > 3} title="选择目标">
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'detect', label: '仅检测' },
            { value: 'root', label: '🛡️ 获取 Root' },
            { value: 'flash', label: '🔥 刷入 ROM' },
            { value: 'unbrick', label: '💀 救砖恢复' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setTarget(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                target === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </StepCard>

      {/* Step 4: Execute */}
      <StepCard step={4} active={step === 4} done={false} title="执行">
        {running ? (
          <div className="flex items-center gap-3 text-sm text-blue-600">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            正在自动执行...（Phase 3 将实现完整流程）
          </div>
        ) : (
          <button
            onClick={handleStart}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {target === 'detect' ? '选择目标后开始' : '▶ 开始自动执行'}
          </button>
        )}
      </StepCard>
    </div>
  )
}

function StepCard({ step, active, done, title, children }: {
  step: number; active: boolean; done: boolean; title: string; children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border-2 p-4 transition-colors ${
      active ? 'border-blue-400 bg-blue-50/30' :
      done ? 'border-green-300 bg-green-50/20' :
      'border-slate-200 bg-white'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          done ? 'bg-green-500 text-white' :
          active ? 'bg-blue-600 text-white' :
          'bg-slate-200 text-slate-500'
        }`}>
          {done ? '✓' : step}
        </div>
        <h3 className={`font-medium ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-slate-600'}`}>
          {title}
        </h3>
      </div>
      {active && <div className="ml-10">{children}</div>}
      {done && <div className="ml-10 text-sm text-green-600">✅ 已完成</div>}
    </div>
  )
}

function EnvItem({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span>{ok ? '✅' : '⚠️'}</span>
      <span className="text-slate-600">{label}:</span>
      <span className="text-slate-400">{value}</span>
    </div>
  )
}

/* ── Flash Page ── */
function FlashPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">🔥 刷机</h2>
      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <h3 className="font-medium mb-3">手动刷机步骤</h3>
        <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
          <li>确保手机已解锁 Bootloader</li>
          <li>重启到 Fastboot 模式: <code className="bg-slate-100 px-1 rounded">adb reboot bootloader</code></li>
          <li>刷入 ROM: <code className="bg-slate-100 px-1 rounded">hydrotool flash payload your_rom.bin</code></li>
          <li>或刷入 boot: <code className="bg-slate-100 px-1 rounded">hydrotool flash boot patched_boot.img</code></li>
          <li>刷完自动重启</li>
        </ol>
        <p className="mt-4 text-sm text-blue-600">
          💡 推荐使用 "AI 自动刷机" 模式，无需手动输入命令
        </p>
      </div>
    </div>
  )
}

/* ── Root Page ── */
function RootPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">🛡️ Root 管理</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { name: 'Magisk', desc: '最成熟的用户态方案，模块生态丰富', tag: '推荐' },
          { name: 'KernelSU', desc: '内核级方案，隐藏能力更强', tag: '进阶' },
          { name: 'APatch', desc: '内核补丁 + 用户态融合', tag: '新方案' },
        ].map(opt => (
          <div key={opt.name} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{opt.name}</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{opt.tag}</span>
            </div>
            <p className="text-sm text-slate-500 mb-3">{opt.desc}</p>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              查看安装步骤 →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Module Page ── */
function ModulePage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">📦 模块管理</h2>
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="text-4xl mb-3">📦</div>
        <h3 className="font-medium mb-1">模块市场即将上线</h3>
        <p className="text-sm text-slate-500">支持 Magisk / KernelSU 模块浏览、安装和管理</p>
        <p className="text-xs text-slate-400 mt-2">Phase 3 版本推出</p>
      </div>
    </div>
  )
}

export default App
