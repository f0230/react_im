import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, FC } from 'react'
import {
  Copy,
  Trash2,
  Play,
  Type,
  Image as ImageIcon,
  Box,
  Download,
  Sparkles,
  Plus,
  List,
  AtSign,
  StickyNote,
} from 'lucide-react'

export type ContextMenuMode = 'node' | 'canvas'

export interface ContextMenuProps {
  x: number
  y: number
  isOpen: boolean
  onClose: () => void
  mode: ContextMenuMode
  onDuplicate?: () => void
  onDelete?: () => void
  onRun?: () => void
  onAddNode?: (type: 'prompt' | 'image' | 'model' | 'output' | 'enhancer' | 'multiPrompt' | 'element' | 'note') => void
  nodeType?: string
  nodeLabel?: string
}

interface MenuItem {
  id: 'prompt' | 'image' | 'model' | 'output' | 'enhancer' | 'multiPrompt' | 'element' | 'note'
  label: string
  icon: React.ReactNode
  color: string
  keywords: string
}

const addNodeItems: MenuItem[] = [
  { id: 'prompt', label: 'Prompt', icon: <Type size={14} />, color: 'text-pink-400', keywords: 'prompt texto text describir' },
  { id: 'image', label: 'Image Ref', icon: <ImageIcon size={14} />, color: 'text-green-400', keywords: 'image imagen referencia ref foto picture' },
  { id: 'model', label: 'AI Model', icon: <Box size={14} />, color: 'text-blue-400', keywords: 'model modelo ai generar generate kling veo sora nano banana seedance' },
  { id: 'output', label: 'Output', icon: <Download size={14} />, color: 'text-purple-400', keywords: 'output salida resultado result video imagen' },
  { id: 'enhancer', label: 'Enhancer', icon: <Sparkles size={14} />, color: 'text-yellow-400', keywords: 'enhancer mejorar prompt enhance' },
  { id: 'multiPrompt', label: 'Multi Prompt', icon: <List size={14} />, color: 'text-pink-400', keywords: 'multi prompt segmentos shots escenas' },
  { id: 'element', label: 'Element', icon: <AtSign size={14} />, color: 'text-orange-400', keywords: 'element elemento personaje character kling' },
  { id: 'note', label: 'Note', icon: <StickyNote size={14} />, color: 'text-yellow-400', keywords: 'note nota comentario sticky grupo group recordatorio' },
]

export const ContextMenu: FC<ContextMenuProps> = ({
  x, y, isOpen, onClose, mode, onDuplicate, onDelete, onRun, onAddNode, nodeType, nodeLabel,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Reset + focus the search box each time the canvas menu opens
  useEffect(() => {
    if (isOpen && mode === 'canvas') {
      setQuery('')
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [isOpen, mode])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return addNodeItems
    return addNodeItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q),
    )
  }, [query])

  const getNodeIcon = () => {
    switch (nodeType) {
      case 'prompt': return <span className="text-pink-400 font-semibold text-[10px]">T</span>
      case 'model': return <Box size={12} className="text-blue-400" />
      case 'image': return <ImageIcon size={12} className="text-green-400" />
      case 'output': return <Download size={12} className="text-purple-400" />
      case 'enhancer': return <Sparkles size={12} className="text-yellow-400" />
      case 'multiPrompt': return <List size={12} className="text-pink-400" />
      case 'element': return <AtSign size={12} className="text-orange-400" />
      default: return <Box size={12} className="text-white/50" />
    }
  }

  if (!isOpen) return null

  // Modo CANVAS - Agregar nodos
  if (mode === 'canvas') {
    return (
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ left: x, top: y }}
        className="fixed z-[9999] w-48 rounded-xl border border-white/10 bg-[#1a1a1e]/95 p-1.5 shadow-2xl"
      >
        <div className="flex w-full items-center gap-2 px-2 py-1.5">
          <Plus size={12} className="text-white/40" />
          <span className="text-[11px] font-medium text-white/40 uppercase">Add Node</span>
        </div>
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filteredItems.length > 0) {
              onAddNode?.(filteredItems[0].id)
              onClose()
            } else if (e.key === 'Escape') {
              onClose()
            }
          }}
          placeholder="Buscar nodo..."
          className="nodrag w-full mb-1 rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#0A84FF]/60"
        />
        <div className="w-full h-px bg-white/10 my-0.5" />
        {filteredItems.length === 0 ? (
          <div className="px-2 py-3 text-center text-[12px] text-white/30">Sin resultados</div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.id}
              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-[13px] text-white/80 hover:bg-white/5 transition-colors"
              onClick={() => {
                onAddNode?.(item.id)
                onClose()
              }}
            >
              <span>{item.label}</span>
              <span className={item.color}>{item.icon}</span>
            </button>
          ))
        )}
      </motion.div>
    )
  }

  // Modo NODE - Opciones del nodo
  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ left: x, top: y }}
      className="fixed z-[9999] w-48 rounded-xl border border-white/10 bg-[#1a1a1e]/95 p-1.5 shadow-2xl"
    >
      {/* Header */}
      <div className="flex w-full items-center gap-2 px-2 py-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-white/5">{getNodeIcon()}</div>
        <span className="text-[11px] font-medium text-white/40 uppercase">{nodeType || 'Node'}</span>
      </div>
      
      <div className="w-full h-px bg-white/10 my-0.5" />

      {/* Run Node */}
      {onRun && (
        <button 
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-[13px] text-white/80 hover:bg-white/5 transition-colors" 
          onClick={() => { onRun(); onClose() }}
        >
          Run Node
          <Play size={14} className="text-green-400 fill-green-400" />
        </button>
      )}

      {/* Duplicate */}
      {onDuplicate && (
        <button 
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-[13px] text-white/80 hover:bg-white/5 transition-colors" 
          onClick={() => { onDuplicate(); onClose() }}
        >
          Duplicate
          <Copy size={14} className="text-white/40" />
        </button>
      )}

      <div className="w-full h-px bg-white/10 my-0.5" />

      {/* Delete */}
      {onDelete && (
        <button
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-[13px] text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          onClick={() => { onDelete(); onClose() }}
        >
          Delete
          <Trash2 size={14} />
        </button>
      )}
    </motion.div>
  )
}

export default ContextMenu
