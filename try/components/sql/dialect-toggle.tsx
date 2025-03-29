"use client"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface DialectToggleProps {
  dialect: "Trino" | "Spark"
  onChange: (dialect: "Trino" | "Spark") => void
}

export function DialectToggle({ dialect, onChange }: DialectToggleProps) {
  const handleToggle = (newDialect: "Trino" | "Spark") => {
    onChange(newDialect)
  }

  return (
    <div className="flex items-center bg-gray-800 p-1 rounded-full">
      <div className="relative flex items-center">
        {/* Background Pill */}
        <div className="absolute inset-0 w-full h-full">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            initial={false}
            animate={{
              x: dialect === "Trino" ? 0 : "100%",
              width: "50%",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Buttons */}
        <button
          className={cn(
            "relative px-4 py-2 rounded-full text-sm font-medium transition-colors z-10",
            dialect === "Trino" ? "text-white" : "text-gray-400",
          )}
          onClick={() => handleToggle("Trino")}
        >
          Trino
        </button>
        <button
          className={cn(
            "relative px-4 py-2 rounded-full text-sm font-medium transition-colors z-10",
            dialect === "Spark" ? "text-white" : "text-gray-400",
          )}
          onClick={() => handleToggle("Spark")}
        >
          Spark
        </button>
      </div>
    </div>
  )
}

