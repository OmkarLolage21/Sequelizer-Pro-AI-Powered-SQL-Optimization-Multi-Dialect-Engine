"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

  useEffect(() => {
    scrollToBottom();
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
        body: JSON.stringify({ user_query: input }),
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