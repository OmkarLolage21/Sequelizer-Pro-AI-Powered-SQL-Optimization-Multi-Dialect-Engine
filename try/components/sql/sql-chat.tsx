"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Database, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Send, User, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface Message {
  role: "user" | "assistant";
  content: React.ReactNode;
  query?: string;
  id?: string;
}
interface TableSchema {
  columns: string[];
  results: any[][];
}

interface DatabaseSchema {
  database: string;
  schemas: {
    [tableName: string]: TableSchema;
  };
}
interface SqlChatProps {
  dialect: "Trino" | "Spark";
  onQueryGenerated: (query: string) => void;
}

export function SqlChat({ dialect, onQueryGenerated }: SqlChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I'm your AI SQL assistant. I'll help you generate ${dialect} SQL queries from natural language. Just describe what you're looking for, and I'll create the appropriate query.`,
      id: "initial-message",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [currentFeedbackMessage, setCurrentFeedbackMessage] =
    useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [databaseSchema, setDatabaseSchema] = useState<DatabaseSchema | null>(null);
  const [isFetchingSchema, setIsFetchingSchema] = useState(false);
  const fetchDatabases = async () => {
    try {
      const response = await fetch(`http://localhost:5001/databases`);
      if (!response.ok) {
        throw new Error("Failed to fetch databases");
      }
      const data = await response.json();
      setDatabases(data.databases || []);
    } catch (error) {
      console.error("Error fetching databases:", error);
      toast({
        title: "Error fetching databases",
        description: "Could not fetch available databases",
        variant: "destructive",
      });
    }
  };

  const handleDatabaseChange = async (db: string) => {
    setSelectedDatabase(db);
    try {
      const response = await fetch(`http://localhost:5003/api/trino/set_global_schema`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dbname: db , schema_definition: ""}),
      });

      if (!response.ok) {
        throw new Error("Failed to set database context");
      }

      toast({
        title: "Database context set",
        description: `Using database: ${db}`,
      });
    } catch (error) {
      console.error("Error setting database context:", error);
      toast({
        title: "Error setting database context",
        description: "Could not set database context",
        variant: "destructive",
      });
    }
  };

  const clearDatabaseContext = async () => {
    try {
      const response = await fetch(`http://localhost:5001/clear-database-context`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to clear database context");
      }

      setSelectedDatabase("");
      toast({
        title: "Database context cleared",
        description: "No database selected",
      });
    } catch (error) {
      console.error("Error clearing database context:", error);
      toast({
        title: "Error clearing database context",
        description: "Could not clear database context",
        variant: "destructive",
      });
    }
  };

  const fetchDatabaseSchema = async () => {
    if (!selectedDatabase) return;
    
    setIsFetchingSchema(true);
    try {
      const response = await fetch(`http://localhost:5001/databases/${selectedDatabase}/schemas`);
      if (!response.ok) {
        throw new Error("Failed to fetch database schema");
      }
      const data = await response.json();
      setDatabaseSchema(data);
      setSchemaOpen(true);
    } catch (error) {
      console.error("Error fetching database schema:", error);
      toast({
        title: "Error fetching schema",
        description: "Could not fetch database schema",
        variant: "destructive",
      });
    } finally {
      setIsFetchingSchema(false);
    }
  };
  useEffect(() => {
    // scrollToBottom();
    fetchDatabases();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatBestPractices = (bestPractices: string) => {
    if (!bestPractices)
      return (
        <p className="text-sm text-gray-400">
          No specific best practices provided
        </p>
      );

    const sections = bestPractices.split(/\*\*(.*?)\*\*/).filter(Boolean);

    return (
      <div className="mt-4 space-y-3">
        <h4 className="font-semibold text-gray-200">Best Practices:</h4>
        {sections.map((section, index) => {
          if (index % 2 === 0) return null;

          const header = section.trim();
          const content = sections[index + 1]?.trim() || "";
          const items = content.split(/\d+\.\s+/).filter(Boolean);

          return (
            <div key={index} className="bg-gray-900/50 p-3 rounded-md">
              <h5 className="font-medium text-blue-300 mb-1">{header}</h5>
              {items.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {items.map((item, i) => (
                    <li key={i} className="text-sm text-gray-300">
                      {item.trim().replace(/\.$/, "")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-300">{content}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleSubmitFeedback = async () => {
    if (!currentFeedbackMessage || !feedbackText.trim()) return;
  
    try {
      const userQuery = messages.find(
        (m) =>
          m.role === "user" &&
          m.id === currentFeedbackMessage.id?.replace("response-", "user-")
      )?.content;
  
      // Ensure we're sending the data in the correct format expected by the backend
      const feedbackData = {
        user_query: typeof userQuery === 'string' ? userQuery : String(userQuery),
        response: currentFeedbackMessage.query || "",
        feedback: feedbackText.trim(),
        // Remove the dialect field as it's not expected by the backend
      };
  
      const feedbackEndpoint = 
        dialect === "Trino"
          ? "http://localhost:5003/api/trino/feedback"
          : "http://localhost:5002/api/spark/feedback";
  
      const response = await fetch(feedbackEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackData),
      });
  
      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }
  
      toast({
        title: "Feedback submitted",
        description: "Thank you for helping us improve!",
      });
  
      setFeedbackOpen(false);
      setFeedbackText("");
      setCurrentFeedbackMessage(null);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error submitting feedback",
        description:
          "There was an error submitting your feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLike = async (message: Message) => {
    try {
      const userQuery = messages.find(
        (m) =>
          m.role === "user" &&
          m.id === message.id?.replace("response-", "user-")
      )?.content;
  
      const feedbackEndpoint = 
        dialect === "Trino"
          ? "http://localhost:5003/api/trino/feedback"
          : "http://localhost:5002/api/spark/feedback";
  
      const response = await fetch(feedbackEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_query: typeof userQuery === 'string' ? userQuery : String(userQuery),
          response: message.query || "",
          feedback: "User liked the response",
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to submit like");
      }
  
      toast({
        title: "Thank you!",
        description: "We're glad you found this helpful",
      });
    } catch (error) {
      console.error("Error submitting like:", error);
    }
  };

  const handleDislike = (message: Message) => {
    setCurrentFeedbackMessage(message);
    setFeedbackOpen(true);
  };

  // New function to fetch previous feedback
  const fetchFeedback = async () => {
    try {
      const getFeedbackEndpoint = 
        dialect === "Trino"
          ? "http://localhost:5003/api/trino/get_feedback"
          : "http://localhost:5002/api/spark/get_feedback";

      const response = await fetch(getFeedbackEndpoint);
      if (!response.ok) {
        console.error("Failed to fetch feedback");
        return null;
      }
      
      const data = await response.json();
      return data.data?.feedback || null;
    } catch (error) {
      console.error("Error fetching feedback:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessageId = `user-${Date.now()}`;
    const userMessage: Message = {
      role: "user",
      content: input,
      id: userMessageId,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const apiUrl =
        dialect === "Trino"
          ? "http://localhost:5003/api/trino/query"
          : "http://localhost:5002/api/spark/query";

      const healthCheck = await fetch(apiUrl.replace("/query", "/health"));
      if (!healthCheck.ok) {
        throw new Error("Backend service is not available");
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          user_query: input,
          database: selectedDatabase || undefined 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to generate query");
      }

      const data = await response.json();

      let generatedQuery = data.data?.generated_query || "";
      let bestPractices = data.data?.best_practices || "";

      const queryMatch = generatedQuery.match(/```sql\n([\s\S]*?)\n```/);
      const cleanQuery = queryMatch ? queryMatch[1].trim() : generatedQuery;

      if (!cleanQuery) {
        throw new Error("No query was generated");
      }

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
      );

      const assistantMessage: Message = {
        role: "assistant",
        content: responseContent,
        query: cleanQuery,
        id: `response-${userMessageId}`,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onQueryGenerated(cleanQuery);
    } catch (error) {
      console.error("Error generating query:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          error instanceof Error
            ? `Sorry, I couldn't generate a query: ${error.message}`
            : "Sorry, I couldn't generate a query. Please try again later.",
        id: `error-${Date.now()}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateExample = async () => {
    setInput("Show me monthly sales by category for the last 6 months");
  };

  const handleImportToEditor = (query?: string) => {
    if (query) {
      onQueryGenerated(query);
      toast({
        title: "Query imported",
        description: "The SQL query has been imported to the editor",
      });
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold text-white">AI SQL Assistant</h3>
          {selectedDatabase && (
            <Badge variant="secondary" className="flex items-center">
              {selectedDatabase}
              <button
                onClick={clearDatabaseContext}
                className="ml-1 rounded-full hover:bg-gray-600 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
        <div className="flex space-x-2">
          <Select
            value={selectedDatabase}
            onValueChange={handleDatabaseChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select database" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              {databases.map((db) => (
                <SelectItem key={db} value={db} className="hover:bg-gray-700">
                  {db}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={fetchDatabaseSchema}
            disabled={!selectedDatabase || isFetchingSchema}
          >
            Show Tables
          </Button>
        </div>
      </div>
  
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`flex max-w-[80%] ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex-shrink-0 ${
                  message.role === "user" ? "ml-3" : "mr-3"
                }`}
              >
                <Avatar>
                  {message.role === "user" ? (
                    <>
                      <AvatarImage
                        src="/placeholder.svg?height=40&width=40"
                        alt="User"
                      />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </>
                  ) : (
                    <>
                      <AvatarImage
                        src="/placeholder.svg?height=40&width=40"
                        alt="AI"
                      />
                      <AvatarFallback>
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-200"
                }`}
              >
                {typeof message.content === "string" ? (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  message.content
                )}
                {message.role === "assistant" && message.query && (
                  <div className="flex justify-between mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImportToEditor(message.query)}
                    >
                      Import to Editor
                    </Button>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(message)}
                        className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDislike(message)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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
                  <AvatarImage
                    src="/placeholder.svg?height=40&width=40"
                    alt="AI"
                  />
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
  
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Provide Feedback</DialogTitle>
            <DialogDescription className="text-gray-400">
              What was wrong with this response? Your feedback will help improve
              the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What was incorrect or could be improved?"
              className="bg-gray-800 border-gray-700 text-white"
              rows={5}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setFeedbackOpen(false);
                setFeedbackText("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedbackText.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Submit Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  
      <Dialog open={schemaOpen} onOpenChange={setSchemaOpen}>
        <DialogContent className="sm:max-w-[800px] bg-gray-900 border-gray-700 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Database Schema: {databaseSchema?.database}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Tables and their structure in the selected database
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {databaseSchema && Object.entries(databaseSchema.schemas).map(([tableName, schema]) => (
              <div key={tableName} className="bg-gray-800/50 p-4 rounded-md">
                <h4 className="font-semibold text-white mb-3">{tableName}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-700">
                        {schema.columns.map((column) => (
                          <th key={column} className="p-2 text-left text-gray-300 border border-gray-600">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {schema.results.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-gray-700 hover:bg-gray-700/50">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="p-2 text-gray-300 border border-gray-700">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
  
      {messages.length === 1 && (
        <div className="px-4 mb-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGenerateExample}
          >
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
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}