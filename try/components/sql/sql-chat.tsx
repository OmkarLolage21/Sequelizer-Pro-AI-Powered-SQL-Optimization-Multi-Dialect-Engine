import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bot, Send, User, Sparkles } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Message {
  role: "user" | "assistant"
  content: React.ReactNode
  query?: string
}

interface SqlChatProps {
  dialect: "Trino" | "Spark"
  onQueryGenerated: (query: string) => void
}

export function SqlChat({ dialect, onQueryGenerated }: SqlChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I'm your AI SQL assistant. I'll help you generate ${dialect} SQL queries from natural language. Just describe what you're looking for, and I'll create the appropriate query.`,
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

  const formatBestPractices = (bestPractices: string) => {
    if (!bestPractices) return <p className="text-sm text-gray-400">No specific best practices provided</p>
    
    // Split by double asterisks to identify sections
    const sections = bestPractices.split(/\*\*(.*?)\*\*/).filter(Boolean)
    
    return (
      <div className="mt-4 space-y-3">
        <h4 className="font-semibold text-gray-200">Best Practices:</h4>
        {sections.map((section, index) => {
          if (index % 2 === 0) return null // Skip content between headers
          
          const header = section.trim()
          const content = sections[index + 1]?.trim() || ''
          const items = content.split(/\d+\.\s+/).filter(Boolean)
          
          return (
            <div key={index} className="bg-gray-900/50 p-3 rounded-md">
              <h5 className="font-medium text-blue-300 mb-1">{header}</h5>
              {items.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {items.map((item, i) => (
                    <li key={i} className="text-sm text-gray-300">
                      {item.trim().replace(/\.$/, '')}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-300">{content}</p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const apiUrl = dialect === "Trino" 
        ? "http://localhost:5003/api/trino/query" 
        : "http://localhost:5002/api/spark/query"

      // First check if backend is reachable
      const healthCheck = await fetch(apiUrl.replace('/query', '/health'))
      if (!healthCheck.ok) {
        throw new Error('Backend service is not available')
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_query: input }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to generate query')
      }

      const data = await response.json()
      
      // Extract the clean SQL query from the response
      let generatedQuery = data.data?.generated_query || ""
      let bestPractices = data.data?.best_practices || ""
      
      // Parse the SQL query from markdown code blocks if present
      const queryMatch = generatedQuery.match(/```sql\n([\s\S]*?)\n```/)
      const cleanQuery = queryMatch ? queryMatch[1].trim() : generatedQuery

      if (!cleanQuery) {
        throw new Error('No query was generated')
      }

      // Format the chat response
      const responseContent = (
        <div>
          <p>Here's a {dialect} SQL query based on your request:</p>
          <div className="my-2 bg-gray-900 p-3 rounded-md">
            <pre className="text-sm text-gray-300 overflow-x-auto">
              {cleanQuery}
            </pre>
          </div>
          {formatBestPractices(bestPractices)}
        </div>
      )

      const assistantMessage: Message = { 
        role: "assistant", 
        content: responseContent,
        query: cleanQuery
      }
      
      setMessages((prev) => [...prev, assistantMessage])
      onQueryGenerated(cleanQuery)
    } catch (error) {
      console.error("Error generating query:", error)
      const errorMessage: Message = {
        role: "assistant",
        content: error instanceof Error 
          ? `Sorry, I couldn't generate a query: ${error.message}`
          : "Sorry, I couldn't generate a query. Please try again later.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateExample = async () => {
    setInput("Show me monthly sales by category for the last 6 months")
  }

  const handleImportToEditor = (query?: string) => {
    if (query) {
      onQueryGenerated(query)
      toast({
        title: "Query imported",
        description: "The SQL query has been imported to the editor",
      })
    }
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
                {typeof message.content === 'string' ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  message.content
                )}
                {message.role === "assistant" && message.query && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => handleImportToEditor(message.query)}
                  >
                    Import to Editor
                  </Button>
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
            placeholder={`Describe the ${dialect} SQL query you need...`}
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