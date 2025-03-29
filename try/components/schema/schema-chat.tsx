"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bot, Send, User, Sparkles } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface SchemaChatProps {
  onSchemaGenerated: (schema: string, id: string, rationale: string) => void
}

export function SchemaChat({ onSchemaGenerated }: SchemaChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI schema assistant. Describe your database needs, and I'll help you design an optimal schema.",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: "user" as const, content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:5000/generate_schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_query: input }), // Changed to match your Flask endpoint
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate schema')
      }

      const data = await response.json()
      
      // Handle potential errors from backend
      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.sql_code?.sql_statements || !data.explanation?.explanation) {
        throw new Error('Invalid response format from server')
      }

      const schemaContent = data.sql_code.sql_statements
      const rationaleContent = data.explanation.explanation
      
      // Fixed template string with proper escaping
      const responseContent = 
        `Based on your requirements, I've designed the following schema:\n\n` +
        `\`\`\`sql\n${schemaContent}\n\`\`\`\n\n` +
        `${rationaleContent}`

      const assistantMessage = { 
        role: "assistant" as const, 
        content: responseContent 
      }
      setMessages((prev) => [...prev, assistantMessage])

      // Pass the generated schema to parent component
      onSchemaGenerated(
        schemaContent, 
        data.id || Date.now().toString(), // Fallback ID if not provided
        rationaleContent
      )
    } catch (error) {
      console.error("Error generating schema:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate schema",
        variant: "destructive",
      })

      const errorMessage = {
        role: "assistant" as const,
        content: "I'm sorry, I encountered an error while generating your schema. Please try again.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateExample = () => {
    setInput("I need a schema for an online retail platform with products, customers, and orders.")
  }

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`flex-shrink-0 ${message.role === "user" ? "ml-3" : "mr-3"}`}>
                <Avatar>
                  {message.role === "user" ? (
                    <>
                      <AvatarImage src="/placeholder.svg?height=40&width=40" alt="User" />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </>
                  ) : (
                    <>
                      <AvatarImage src="/placeholder.svg?height=40&width=40" alt="AI" />
                      <AvatarFallback>
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"
                }`}
              >
                {message.role === "assistant" && message.content.includes("```sql") ? (
                  <div>
                    <div className="whitespace-pre-wrap">{message.content.split("```sql")[0]}</div>
                    <div className="my-2 bg-gray-900 p-3 rounded-md">
                      <pre className="text-sm text-gray-300 overflow-x-auto">
                        {message.content.match(/```sql\n([\s\S]*?)\n```/)?.[1]}
                      </pre>
                    </div>
                    <div className="whitespace-pre-wrap">{message.content.split("```")[2]}</div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex flex-row">
              <div className="flex-shrink-0 mr-3">
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="AI" />
                  <AvatarFallback>
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="p-3 rounded-lg bg-gray-800 text-gray-200">
                <div className="flex space-x-2">
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 mb-4">
          <Button variant="outline" className="w-full" onClick={handleGenerateExample}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Example Query
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your database needs..."
            className="flex-1 bg-gray-800 border-gray-700 text-white"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}