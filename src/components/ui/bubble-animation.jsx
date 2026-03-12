import { useEffect, useRef } from "react"

const BubbleAnimation = ({
  width = 800,
  height = 600,
  totalBubbles = 25,
  colors = ["#018ddc", "#f12a00", "#ec6546", "#b0c90d"],
  className = "",
}) => {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const bubblesRef = useRef([])
  const PI2 = Math.PI * 2

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = width
    canvas.height = height

    // Initialize bubbles
    bubblesRef.current = []
    for (let i = 0; i < totalBubbles; i++) {
      bubblesRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        move: Math.random() * 5 - 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: Math.floor(Math.random() * 250),
      })
    }

    const animate = () => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const time = new Date().getTime() * 0.0005

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.filter = "blur(30px)"

      // Gradient background
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const gx = cx + Math.cos(time + 100) * 300
      const gy = cy + Math.sin(time + 100) * 300
      const grd = ctx.createRadialGradient(gx, gy, 0, canvas.width, canvas.height, canvas.width)
      grd.addColorStop(0, "rgb(255, 252, 0)")
      grd.addColorStop(0.1, "rgb(1, 141, 220)")
      grd.addColorStop(0.8, "rgb(241, 42, 0)")
      grd.addColorStop(1, "rgb(176, 201, 13)")
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Bubbles
      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      bubblesRef.current.forEach((b) => {
        b.x -= Math.sin(time + b.move) * b.move
        b.y += Math.cos(time - b.move) * b.move
        ctx.beginPath()
        ctx.fillStyle = b.color
        ctx.arc(b.x, b.y, b.radius, 0, PI2, false)
        ctx.fill()
        ctx.closePath()
      })
      ctx.restore()

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [width, height, totalBubbles])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ display: "block" }}
    />
  )
}

export { BubbleAnimation }
