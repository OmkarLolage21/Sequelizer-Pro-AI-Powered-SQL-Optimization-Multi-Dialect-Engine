import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bot, Send, User, Sparkles } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Message {
  role: "user" | "assistant"
  content: string
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

  // ... (keep existing useEffect and scrollToBottom functions)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: "user" as const, content: input }
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
      
      // Extract the query from the response
      let generatedQuery = ""
      if (data.data?.generated_query) {
        const queryMatch = data.data.generated_query.match(/QUERY:\s*([\s\S]*?)(?=EXPLANATION:|OPTIMIZATIONS:|$)/i)
        generatedQuery = queryMatch ? queryMatch[1].trim() : data.data.generated_query
      }

      if (!generatedQuery) {
        throw new Error('No query was generated')
      }

      const responseContent = `Here's a ${dialect} SQL query based on your request:\n\n\`\`\`sql\n${generatedQuery}\n\`\`\`\n\nBest Practices:\n${data.data?.best_practices || "No specific best practices provided"}`

      const assistantMessage = { 
        role: "assistant" as const, 
        content: responseContent,
        query: generatedQuery 
      }
      
      setMessages((prev) => [...prev, assistantMessage])
      onQueryGenerated(generatedQuery)
    } catch (error) {
      console.error("Error generating query:", error)
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: error instanceof Error 
          ? `Sorry, I couldn't generate a query: ${error.message}`
          : "Sorry, I couldn't generate a query. Please try again later.",
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateExample = async () => {
    setInput("Show me monthly sales by category for the last 6 months");
    // Optionally trigger submit automatically
    // await handleSubmit(new Event('submit'));
  }

  const handleImportToEditor = (content: string, query?: string) => {
    if (query) {
      onQueryGenerated(query);
      toast({
        title: "Query imported",
        description: "The SQL query has been imported to the editor",
      });
    } else {
      // Fallback to extracting from content if query not provided
      const sqlMatch = content.match(/sql\n([\s\S]*?)\n/);
      if (sqlMatch && sqlMatch[1]) {
        onQueryGenerated(sqlMatch[1]);
        toast({
          title: "Query imported",
          description: "The SQL query has been imported to the editor",
        });
      }
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
                {message.role === "assistant" && message.content.includes("sql") ? (
                  <div>
                    <div className="whitespace-pre-wrap">{message.content.split("sql")[0]}</div>
                    <div className="my-2 bg-gray-900 p-3 rounded-md">
                      <pre className="text-sm text-gray-300 overflow-x-auto">
                        {message.query || message.content.match(/sql\n([\s\S]*?)\n/)?.[1]}
                      </pre>
                    </div>
                    <div className="whitespace-pre-wrap">{message.content.split("```")[2]}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleImportToEditor(message.content, message.query)}
                    >
                      Import to Editor
                    </Button>
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