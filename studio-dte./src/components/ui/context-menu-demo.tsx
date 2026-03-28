import { useState } from 'react'
import { ContextMenu } from './context-menu'

export default function ContextMenuDemo() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [mode, setMode] = useState<'node' | 'canvas'>('canvas')

  const handleContextMenu = (e: React.MouseEvent, type: 'node' | 'canvas') => {
    e.preventDefault()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setMode(type)
    setMenuOpen(true)
  }

  return (
    <div className="w-full h-96 bg-[#0a0a0c] rounded-2xl flex flex-col items-center justify-center gap-8 relative overflow-hidden">
      <div className="flex gap-4">
        <div 
          className="w-32 h-32 bg-white/5 rounded-xl flex items-center justify-center cursor-context-menu border border-white/10 hover:border-white/20 transition-colors"
          onContextMenu={(e) => handleContextMenu(e, 'node')}
        >
          <p className="text-white/40 text-xs text-center">Right click<br/>on node</p>
        </div>
        
        <div 
          className="w-32 h-32 bg-white/5 rounded-xl flex items-center justify-center cursor-context-menu border border-white/10 hover:border-white/20 transition-colors"
          onContextMenu={(e) => handleContextMenu(e, 'canvas')}
        >
          <p className="text-white/40 text-xs text-center">Right click<br/>on canvas</p>
        </div>
      </div>
      
      <ContextMenu
        x={menuPos.x}
        y={menuPos.y}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        mode={mode}
        nodeType="model"
        nodeLabel="ai-model-1"
        onDuplicate={() => console.log('Duplicate')}
        onDelete={() => console.log('Delete')}
        onAddNode={(type) => console.log('Add node:', type)}
      />
    </div>
  )
}
