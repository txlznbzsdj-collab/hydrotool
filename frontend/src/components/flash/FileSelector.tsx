import { useState, useRef, useCallback } from 'react'
import { Upload, File, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileSelectorProps {
  value: string
  onChange: (path: string) => void
  accept?: string
  placeholder?: string
}

export function FileSelector({ value, onChange, accept = '.img,.bin,.zip', placeholder = '拖拽镜像文件到此处或点击浏览' }: FileSelectorProps) {
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setFileName(file.name)
      onChange(e.dataTransfer.getData('text') || file.name)
    }
  }, [onChange])

  const handleBrowse = () => {
    inputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFileName(f.name)
      onChange(f.name)
    }
  }

  const handlePathInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    onChange(v)
    const parts = v.replace(/\\/g, '/').split('/')
    setFileName(parts[parts.length - 1] || '')
  }

  const clear = () => {
    setFileName('')
    onChange('')
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">镜像文件</label>

      {value && fileName ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-brand/20">
          <File className="w-4 h-4 text-brand flex-shrink-0" />
          <span className="text-sm truncate flex-1">{fileName}</span>
          <button onClick={clear} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer ${
            dragging ? 'border-brand bg-brand/5 scale-[1.02]' : 'border-border hover:border-muted-foreground/30'
          }`}
          onClick={handleBrowse}
        >
          <Upload className={`w-6 h-6 ${dragging ? 'text-brand' : 'text-muted-foreground/40'}`} />
          <span className="text-xs text-muted-foreground">{placeholder}</span>
          <Button type="button" variant="outline" size="sm" className="text-xs h-7">
            浏览文件
          </Button>
        </div>
      )}

      {/* Path input */}
      <input
        type="text"
        value={value}
        onChange={handlePathInput}
        placeholder="或直接输入镜像路径..."
        className="w-full bg-transparent border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground focus:outline-none focus:border-brand/50"
      />

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
