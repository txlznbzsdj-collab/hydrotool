import { useState, useEffect, useCallback } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/layout/Sidebar'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { AiAutoPage } from '@/components/ai/AiAutoPage'
import { FlashPage } from '@/components/flash/FlashPage'
import { RootPage } from '@/components/root-manager/RootPage'
import { ModulePage } from '@/components/modules/ModulePage'
import type { Page, Device } from '@/types'

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [devices, setDevices] = useState<Device[]>([])
  const [connected, setConnected] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const fetchDevices = useCallback(() => {
    fetch('/api/devices')
      .then(r => r.json())
      .then(d => {
        if (d.devices?.length > 0) setDevices(d.devices)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchDevices()

    const wsUrl = `ws://${window.location.hostname}:8000/ws/devices`
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'device_status' && data.devices?.length > 0) {
          setDevices(data.devices.map((d: any) => ({
            serial: d.serial,
            model: d.model,
            brand: d.brand,
            type: d.type,
            status: d.status,
          })))
        }
      } catch {}
    }

    const interval = setInterval(fetchDevices, 5000)
    return () => { ws.close(); clearInterval(interval) }
  }, [fetchDevices])

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard devices={devices} />
      case 'ai-auto':
        return <AiAutoPage devices={devices} />
      case 'flash':
        return <FlashPage />
      case 'root':
        return <RootPage />
      case 'modules':
        return <ModulePage />
    }
  }

  return (
    <TooltipProvider delay={200}>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar
          page={page}
          onNavigate={setPage}
          devices={devices}
          connected={connected}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Page content */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-5xl px-6 py-8">
              {renderPage()}
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}

export default App
