"use client"
import type React from "react"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface SparklesProps extends React.HTMLAttributes<HTMLDivElement> {
  background?: string
  minSize?: number
  maxSize?: number
  particleDensity?: number
  particleColor?: string
  className?: string
  particleClassName?: string
}

export const SparklesCore = ({
  id,
  className,
  background,
  minSize = 0.4,
  maxSize = 1,
  particleDensity = 100,
  particleColor = "#FFF",
  particleClassName,
  ...props
}: SparklesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<any[]>([])
  const animationRef = useRef<number | null>(null)
  const resizeRef = useRef<any>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleResize = () => {
      if (canvas) {
        const { width, height } = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)
      }
    }

    handleResize()

    const createParticles = () => {
      const { width, height } = canvas.getBoundingClientRect()
      particles.current = Array.from({ length: particleDensity }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * (maxSize - minSize) + minSize,
        speedX: Math.random() * 0.5 - 0.25,
        speedY: Math.random() * 0.5 - 0.25,
        opacity: Math.random(),
        opacitySpeed: Math.random() * 0.02,
      }))
    }

    createParticles()

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.current.forEach((particle) => {
        particle.x += particle.speedX
        particle.y += particle.speedY
        particle.opacity += particle.opacitySpeed

        if (particle.opacity > 1 || particle.opacity < 0) {
          particle.opacitySpeed = -particle.opacitySpeed
        }

        const { width, height } = canvas.getBoundingClientRect()
        if (particle.x < 0 || particle.x > width) {
          particle.speedX = -particle.speedX
        }
        if (particle.y < 0 || particle.y > height) {
          particle.speedY = -particle.speedY
        }

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `${particleColor}${Math.floor(particle.opacity * 255)
          .toString(16)
          .padStart(2, "0")}`
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    window.addEventListener("resize", handleResize)
    resizeRef.current = handleResize

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener("resize", handleResize)
    }
  }, [minSize, maxSize, particleDensity, particleColor])

  return (
    <div className={cn("h-full w-full", className)} {...props}>
      <canvas
        ref={canvasRef}
        id={id}
        className={cn("h-full w-full", particleClassName)}
        style={{
          background: background || "transparent",
        }}
      />
    </div>
  )
}

