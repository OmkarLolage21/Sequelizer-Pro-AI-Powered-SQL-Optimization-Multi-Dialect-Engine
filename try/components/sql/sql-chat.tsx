"use client"

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

  useEffect(() => {
    // Update initial message when dialect changes
    setMessages([
      {
        role: "assistant",
        content: `Hello! I'm your AI SQL assistant. I'll help you generate ${dialect} SQL queries from natural language. Just describe what you're looking for, and I'll create the appropriate query.`,
      },
    ])
  }, [dialect])

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

    // Simulate AI response
    setTimeout(() => {
      // Mock response based on user input and selected dialect
      let responseContent = ""
      let generatedQuery = ""

      if (input.toLowerCase().includes("sales") || input.toLowerCase().includes("revenue")) {
        if (dialect === "Trino") {
          generatedQuery = `SELECT
  date_trunc('month', o.created_at) AS month,
  c.name AS category,
  SUM(oi.quantity * oi.price) AS total_sales,
  COUNT(DISTINCT o.id) AS order_count,
  COUNT(DISTINCT o.customer_id) AS customer_count
FROM
  orders o
JOIN
  order_items oi ON o.id = oi.order_id
JOIN
  products p ON oi.product_id = p.id
JOIN
  categories c ON p.category_id = c.id
WHERE
  o.created_at >= date_trunc('month', current_date - interval '6' month)
GROUP BY
  1, 2
ORDER BY
  1 DESC, 3 DESC`
        } else {
          generatedQuery = `SELECT
  date_trunc('month', o.created_at) AS month,
  c.name AS category,
  SUM(oi.quantity * oi.price) AS total_sales,
  COUNT(DISTINCT o.id) AS order_count,
  COUNT(DISTINCT o.customer_id) AS customer_count
FROM
  orders o
JOIN
  order_items oi ON o.id = oi.order_id
JOIN
  products p ON oi.product_id = p.id
JOIN
  categories c ON p.category_id = c.id
WHERE
  o.created_at >= add_months(trunc(current_date, 'MM'), -6)
GROUP BY
  1, 2
ORDER BY
  1 DESC, 3 DESC`
        }

        responseContent = `Here's a ${dialect} SQL query to analyze sales by category over the last 6 months:\n\n\`\`\`sql\n${generatedQuery}\n\`\`\`\n\nThis query:\n- Groups sales by month and product category\n- Calculates total sales amount, order count, and unique customer count\n- Filters for the last 6 months\n- Orders results by month (descending) and sales (descending)\n\nYou can click "Import to Editor" to use this query.`
      } else if (input.toLowerCase().includes("customer") || input.toLowerCase().includes("segment")) {
        if (dialect === "Trino") {
          generatedQuery = `SELECT
  c.id AS customer_id,
  c.email,
  c.name,
  COUNT(o.id) AS total_orders,
  SUM(o.total) AS total_spent,
  AVG(o.total) AS avg_order_value,
  MAX(o.created_at) AS last_order_date,
  date_diff('day', MAX(o.created_at), current_date) AS days_since_last_order,
  CASE
    WHEN COUNT(o.id) >= 5 AND SUM(o.total) >= 1000 THEN 'VIP'
    WHEN COUNT(o.id) >= 3 OR SUM(o.total) >= 500 THEN 'Regular'
    WHEN date_diff('day', MAX(o.created_at), current_date) <= 30 THEN 'New'
    WHEN date_diff('day', MAX(o.created_at), current_date) > 90 THEN 'At Risk'
    ELSE 'Occasional'
  END AS segment
FROM
  customers c
LEFT JOIN
  orders o ON c.id = o.customer_id
GROUP BY
  c.id, c.email, c.name
ORDER BY
  total_spent DESC`
        } else {
          generatedQuery = `SELECT
  c.id AS customer_id,
  c.email,
  c.name,
  COUNT(o.id) AS total_orders,
  SUM(o.total) AS total_spent,
  AVG(o.total) AS avg_order_value,
  MAX(o.created_at) AS last_order_date,
  datediff(current_date(), MAX(o.created_at)) AS days_since_last_order,
  CASE
    WHEN COUNT(o.id) >= 5 AND SUM(o.total) >= 1000 THEN 'VIP'
    WHEN COUNT(o.id) >= 3 OR SUM(o.total) >= 500 THEN 'Regular'
    WHEN datediff(current_date(), MAX(o.created_at)) <= 30 THEN 'New'
    WHEN datediff(current_date(), MAX(o.created_at)) > 90 THEN 'At Risk'
    ELSE 'Occasional'
  END AS segment
FROM
  customers c
LEFT JOIN
  orders o ON c.id = o.customer_id
GROUP BY
  c.id, c.email, c.name
ORDER BY
  total_spent DESC`
        }

        responseContent = `Here's a ${dialect} SQL query to segment customers based on their purchase behavior:\n\n\`\`\`sql\n${generatedQuery}\n\`\`\`\n\nThis query:\n- Calculates key metrics for each customer (orders, spend, etc.)\n- Creates segments based on purchase frequency, total spend, and recency\n- Uses a LEFT JOIN to include customers with no orders\n- Orders results by total spent (highest first)\n\nYou can click "Import to Editor" to use this query.`
      } else {
        if (dialect === "Trino") {
          generatedQuery = `SELECT
  p.id,
  p.name,
  p.price,
  c.name AS category,
  COUNT(oi.id) AS times_ordered,
  SUM(oi.quantity) AS total_quantity_sold
FROM
  products p
JOIN
  categories c ON p.category_id = c.id
LEFT JOIN
  order_items oi ON p.id = oi.product_id
GROUP BY
  1, 2, 3, 4
ORDER BY
  total_quantity_sold DESC
LIMIT 10`
        } else {
          generatedQuery = `SELECT
  p.id,
  p.name,
  p.price,
  c.name AS category,
  COUNT(oi.id) AS times_ordered,
  SUM(oi.quantity) AS total_quantity_sold
FROM
  products p
JOIN
  categories c ON p.category_id = c.id
LEFT JOIN
  order_items oi ON p.id = oi.product_id
GROUP BY
  1, 2, 3, 4
ORDER BY
  total_quantity_sold DESC
LIMIT 10`
        }

        responseContent = `Here's a ${dialect} SQL query based on your request:\n\n\`\`\`sql\n${generatedQuery}\n\`\`\`\n\nThis query:\n- Retrieves products with their categories\n- Calculates how many times each product was ordered\n- Calculates the total quantity sold for each product\n- Orders results by total quantity sold (highest first)\n- Limits to top 10 results\n\nYou can click "Import to Editor" to use this query.`
      }

      const assistantMessage = { role: "assistant" as const, content: responseContent }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)

      // Extract SQL query from response and pass to parent
      const sqlMatch = responseContent.match(/```sql\n([\s\S]*?)\n```/)
      if (sqlMatch && sqlMatch[1]) {
        onQueryGenerated(sqlMatch[1])
      }
    }, 2000)
  }

  const handleGenerateExample = () => {
    setInput("Show me monthly sales by category for the last 6 months")
  }

  const handleImportToEditor = (content: string) => {
    const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/)
    if (sqlMatch && sqlMatch[1]) {
      onQueryGenerated(sqlMatch[1])
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
                {message.role === "assistant" && message.content.includes("```sql") ? (
                  <div>
                    <div className="whitespace-pre-wrap">{message.content.split("```sql")[0]}</div>
                    <div className="my-2 bg-gray-900 p-3 rounded-md">
                      <pre className="text-sm text-gray-300 overflow-x-auto">
                        {message.content.match(/```sql\n([\s\S]*?)\n```/)?.[1]}
                      </pre>
                    </div>
                    <div className="whitespace-pre-wrap">{message.content.split("```")[2]}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleImportToEditor(message.content)}
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

