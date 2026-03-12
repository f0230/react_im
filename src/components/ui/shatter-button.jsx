import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function ShatterButton({
  children,
  className = "",
  shardCount = 20,
  shatterColor = "#e3ff31",
  onClick,
  href,
}) {
  const [isShattered, setIsShattered] = useState(false)
  const [shards, setShards] = useState([])

  const handleClick = useCallback(() => {
    if (isShattered) return

    const newShards = []
    for (let i = 0; i < shardCount; i++) {
      const angle = (Math.PI * 2 * i) / shardCount + Math.random() * 0.5
      const velocity = 100 + Math.random() * 200
      newShards.push({
        id: i,
        x: 0,
        y: 0,
        rotation: Math.random() * 720 - 360,
        velocityX: Math.cos(angle) * velocity,
        velocityY: Math.sin(angle) * velocity,
        size: 4 + Math.random() * 12,
        clipPath: `polygon(
          ${Math.random() * 50}% 0%,
          100% ${Math.random() * 50}%,
          ${50 + Math.random() * 50}% 100%,
          0% ${50 + Math.random() * 50}%
        )`,
      })
    }

    setShards(newShards)
    setIsShattered(true)
    onClick?.()

    setTimeout(() => {
      setIsShattered(false)
      setShards([])
      if (href) window.location.href = href
    }, 700)
  }, [isShattered, shardCount, onClick, href])

  return (
    <div className="relative inline-block">
      <motion.button
        className={`relative px-10 py-4 font-bold rounded-full overflow-hidden ${className}`}
        onClick={handleClick}
        animate={{
          scale: isShattered ? 0 : 1,
          opacity: isShattered ? 0 : 1,
        }}
        transition={{ duration: 0.15 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          background: shatterColor,
          color: "#000",
        }}
      >
        <span className="relative z-10">{children}</span>
      </motion.button>

      {/* Shards */}
      <AnimatePresence>
        {shards.map((shard) => (
          <motion.div
            key={shard.id}
            className="absolute pointer-events-none"
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
            animate={{
              x: shard.velocityX,
              y: shard.velocityY,
              rotate: shard.rotation,
              opacity: 0,
              scale: 0.5,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              left: "50%",
              top: "50%",
              width: shard.size,
              height: shard.size,
              background: shatterColor,
              boxShadow: `0 0 8px ${shatterColor}, 0 0 16px ${shatterColor}`,
              clipPath: shard.clipPath,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Explosion ring */}
      <AnimatePresence>
        {isShattered && (
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
            initial={{ width: 0, height: 0, opacity: 0.8 }}
            animate={{ width: 280, height: 280, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            style={{
              border: `2px solid ${shatterColor}`,
              boxShadow: `0 0 20px ${shatterColor}`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
