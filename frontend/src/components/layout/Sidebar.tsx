import {
  LayoutDashboard,
  Cpu,
  Zap,
  Shield,
  Box,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Terminal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import type { Page, Device } from '@/types'

interface SidebarProps {
  page: Page
  onNavigate: (page: Page) => void
  devices: Device[]
  connected: boolean
  collapsed: boolean
  onToggleCollapse: () => void
}

const NAV_ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
  { id: 'ai-auto', label: 'AI 刷机', icon: Cpu },
  { id: 'flash', label: '刷机', icon: Zap },
  { id: 'root', label: 'Root', icon: Shield },
  { id: 'modules', label: '模块', icon: Box },
]

export function Sidebar({ page, onNavigate, devices, connected, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={`relative flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 min-h-[56px] border-b border-sidebar-border">
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <Terminal className="w-4 h-4 text-brand-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-sidebar-foreground leading-tight truncate">
                HydroTool
              </div>
              <div className="text-[10px] text-sidebar-foreground/50 leading-tight">
                鸿德工具箱
              </div>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground flex-shrink-0"
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto" id="sidebar-scroll">
        <nav className={`flex flex-col gap-0.5 p-2 ${collapsed ? 'px-2' : 'px-3'}`}>
          {NAV_ITEMS.map((item) => {
            const active = page === item.id
            return collapsed ? (
              <Tooltip key={item.id} delay={200}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                        : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer — device status */}
      <div className={`border-t border-sidebar-border ${collapsed ? 'p-2' : 'px-4 py-3'}`}>
        <Separator className="mb-3 bg-sidebar-border" />
        {collapsed ? (
          <Tooltip delay={200}>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    connected ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}
                >
                  <Smartphone
                    className={`w-4 h-4 ${connected ? 'text-emerald-400' : 'text-red-400'}`}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              <div>{connected ? '后端已连接' : '后端未连接'}</div>
              <div className="text-muted-foreground">
                {devices.length > 0 ? `${devices.length} 台设备` : '无设备'}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div className={`status-dot ${connected ? 'online' : 'offline'}`} />
              <span className="text-sidebar-foreground/60">
                {connected ? '服务已连接' : '服务未连接'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-sidebar-foreground/40">
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                {devices.length > 0 ? `${devices.length} 台设备在线` : '无设备连接'}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
