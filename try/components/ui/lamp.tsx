"use client"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function LampContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setMousePosition({ x, y })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex min-h-[40vh] flex-col items-center justify-center overflow-hidden w-full rounded-md z-0",
        className,
      )}
    >
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0 ">
        <motion.div
          animate={{
            boxShadow: `0 0 500px 200px rgba(120, 119, 198, 0.3)`,
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
          style={{
            position: "absolute",
            width: "30%",
            left: `${mousePosition.x / 10 + 35}%`,
            top: "-50%",
            backgroundColor: "transparent",
            borderRadius: "50%",
            filter: "blur(100px)",
          }}
        />
        <div className="absolute inset-0 z-20 h-full w-full bg-gray-950 [mask-image:radial-gradient(transparent,white)] dark:bg-black" />
      </div>

      <div className="relative z-50 flex flex-col items-center">{children}</div>
    </div>
  )
}

