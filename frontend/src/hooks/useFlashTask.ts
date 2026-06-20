import { useState, useCallback } from 'react'
import type { FlashMode } from '@/types'

interface UseFlashTaskReturn {
  taskId: string | null
  loading: boolean
  error: string
  startTask: (mode: FlashMode, params: Record<string, any>) => Promise<{ task_id?: string; status?: string } | null>
  resetTask: () => void
  callSync: (endpoint: string, body: Record<string, any>) => Promise<any>
}

const ENDPOINTS: Record<FlashMode, string> = {
  partition: '/api/flash/partition',
  boot: '/api/flash/boot',
  flash_all: '/api/flash/flash-all',
  erase: '/api/flash/erase',
}

export function useFlashTask(): UseFlashTaskReturn {
  const [taskId, setTaskId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const startTask = useCallback(async (mode: FlashMode, params: Record<string, any>) => {
    setLoading(true)
    setError('')
    try {
      const endpoint = ENDPOINTS[mode]
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || '请求失败')
        return null
      }
      if (data.task_id) setTaskId(data.task_id)
      return data
    } catch (e: any) {
      setError(e.message || '网络错误')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const callSync = useCallback(async (endpoint: string, body: Record<string, any>) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || '请求失败')
    return data
  }, [])

  const resetTask = useCallback(() => {
    setTaskId(null)
    setError('')
    setLoading(false)
  }, [])

  return { taskId, loading, error, startTask, resetTask, callSync }
}
