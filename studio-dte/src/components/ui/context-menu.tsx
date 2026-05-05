import { motion } from 'framer-motion'
import { useEffect, useRef, FC } from 'react'
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
  onAddNode?: (type: 'prompt' | 'image' | 'model' | 'output' | 'enhancer' | 'multiPrompt' | 'element') => void
  nodeType?: string
  nodeLabel?: string
}

interface MenuItem {
  id: 'prompt' | 'image' | 'model' | 'output' | 'enhancer' | 'multiPrompt' | 'element'
  label: string
  icon: React.ReactNode
  color: string
}

const addNodeItems: MenuItem[] = [
  { id: 'prompt', label: 'Prompt', icon: <Type size={14} />, color: 'text-pink-400' },
  { id: 'image', label: 'Image Ref', icon: <ImageIcon size={14} />, color: 'text-green-400' },
  { id: 'model', label: 'AI Model', icon: <Box size={14} />, color: 'text-blue-400' },
  { id: 'output', label: 'Output', icon: <Download size={14} />, color: 'text-purple-400' },
  { id: 'enhancer', label: 'Enhancer', icon: <Sparkles size={14} />, color: 'text-yellow-400' },
  { id: 'multiPrompt', label: 'Multi Prompt', icon: <List size={14} />, color: 'text-pink-400' },
  { id: 'element', label: 'Element', icon: <AtSign size={14} />, color: 'text-orange-400' },
]

export const ContextMenu: FC<ContextMenuProps> = ({
  x, y, isOpen, onClose, mode, onDuplicate, onDelete, onRun, onAddNode, nodeType, nodeLabel,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

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
        <div className="w-full h-px bg-white/10 my-0.5" />
        {addNodeItems.map((item) => (
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
        ))}
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
