"use client"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export function BackgroundGradient({
  children,
  className,
  containerClassName,
  animate = true,
}: {
  children?: React.ReactNode
  className?: string
  containerClassName?: string
  animate?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    if (!animate) {
      setOpacity(1)
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setPosition({ x, y })
    }

    setOpacity(1)
    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [animate])

  return (
    <div
      className={cn("relative p-[4px] group", containerClassName)}
      ref={containerRef}
      style={{
        opacity,
        transition: "opacity 1s ease",
      }}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-[20px] opacity-60 group-hover:opacity-100 blur-xl transition duration-500",
          animate ? "group-hover:blur-2xl" : "",
        )}
        style={{
          background: animate
            ? `radial-gradient(circle at ${position.x}px ${position.y}px, rgba(120, 119, 198, 0.8), rgba(56, 2, 174, 0.8))`
            : "linear-gradient(to right, rgba(120, 119, 198, 0.8), rgba(56, 2, 174, 0.8))",
        }}
      />
      <div className={cn("relative bg-zinc-950 rounded-[18px] p-4 h-full w-full", className)}>{children}</div>
    </div>
  )
}

