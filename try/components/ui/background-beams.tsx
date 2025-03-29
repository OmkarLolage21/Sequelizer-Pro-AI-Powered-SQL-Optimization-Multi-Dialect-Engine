"use client"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export function BackgroundBeams({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const beamsRef = useRef<HTMLCanvasElement>(null)
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    const canvas = beamsRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const beams = Array.from({ length: 10 }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      width: Math.random() * 4 + 2,
      speed: Math.random() * 0.05 + 0.05,
      hue: Math.random() * 60 + 200,
    }))

    let animationFrameId: number
    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height)
      beams.forEach((beam) => {
        ctx.beginPath()
        const gradient = ctx.createLinearGradient(beam.x, 0, beam.x + beam.width, 0)
        gradient.addColorStop(0, `hsla(${beam.hue}, 100%, 70%, 0.1)`)
        gradient.addColorStop(0.5, `hsla(${beam.hue}, 100%, 70%, 0.3)`)
        gradient.addColorStop(1, `hsla(${beam.hue}, 100%, 70%, 0.1)`)
        ctx.fillStyle = gradient
        ctx.rect(beam.x, 0, beam.width, rect.height)
        ctx.fill()

        beam.x += beam.speed
        if (beam.x > rect.width) {
          beam.x = -beam.width
        }
      })
      animationFrameId = requestAnimationFrame(animate)
    }

    animate()
    setOpacity(1)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]",
        className,
      )}
      {...props}
    >
      <canvas ref={beamsRef} className="h-full w-full" style={{ opacity, transition: "opacity 1s ease" }} />
    </div>
  )
}

