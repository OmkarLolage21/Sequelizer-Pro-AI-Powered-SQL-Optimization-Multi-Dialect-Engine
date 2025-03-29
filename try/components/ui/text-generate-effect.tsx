"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export const TextGenerateEffect = ({ words }: { words: string }) => {
  const [wordArray, setWordArray] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const wordsArray = words.split(" ")
    setWordArray(wordsArray)

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        if (prevIndex < wordsArray.length - 1) {
          return prevIndex + 1
        }
        clearInterval(interval)
        return prevIndex
      })
    }, 80)

    return () => clearInterval(interval)
  }, [words])

  return (
    <div className="flex flex-wrap">
      {wordArray.map((word, idx) => (
        <motion.span
          key={idx}
          className="mr-2 mb-2"
          initial={{ opacity: 0 }}
          animate={idx <= currentIndex ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  )
}

