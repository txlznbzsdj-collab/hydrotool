import { useState, useEffect } from 'react'
import type { FlashLogEntry } from '@/types'

interface UseFlashWebSocketReturn {
  progress: number
  logs: FlashLogEntry[]
  status: string
  currentStep: string
  message: string
  connected: boolean
}

export function useFlashWebSocket(taskId: string | null): UseFlashWebSocketReturn {
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<FlashLogEntry[]>([])
  const [status, setStatus] = useState('idle')
  const [currentStep, setCurrentStep] = useState('')
  const [message, setMessage] = useState('')
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!taskId) {
      setProgress(0)
      setLogs([])
      setStatus('idle')
      setCurrentStep('')
      setMessage('')
      setConnected(false)
      return
    }

    const host = window.location.hostname
    const ws = new WebSocket(`ws://${host}:8000/ws/flash/${taskId}`)

    ws.onopen = () => setConnected(true)

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        switch (data.type) {
          case 'state':
            setProgress(data.progress || 0)
            setStatus(data.status || 'pending')
            setCurrentStep(data.current_step || '')
            setMessage(data.message || '')
            if (data.logs) setLogs(data.logs)
            break
          case 'progress':
            setProgress(data.progress)
            setStatus('running')
            if (data.current_step) setCurrentStep(data.current_step)
            if (data.message) setMessage(data.message)
            break
          case 'log':
            setLogs(prev => [...prev, { timestamp: data.timestamp, level: data.level, message: data.message }])
            break
          case 'complete':
            setStatus(data.status)
            if (data.message) setMessage(data.message)
            if (data.status === 'completed') setProgress(100)
            break
        }
      } catch {}
    }

    ws.onerror = () => setConnected(false)
    ws.onclose = () => setConnected(false)

    // Ping every 25s
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'ping' }))
      }
    }, 25000)

    return () => {
      ws.close()
      clearInterval(ping)
    }
  }, [taskId])

  return { progress, logs, status, currentStep, message, connected }
}
