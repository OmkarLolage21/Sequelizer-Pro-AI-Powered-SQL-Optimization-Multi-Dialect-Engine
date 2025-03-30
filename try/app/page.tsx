"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/ui/navbar"
import { SqlChat } from "@/components/sql/sql-chat"
import { MonacoEditor } from "@/components/sql/monaco-editor"
import { DialectToggle } from "@/components/sql/dialect-toggle"
import { CsvUploader } from "@/components/sql/csv-uploader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Save, Database, FileText, Upload } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

const mockQueries = {
  1: {
    name: "Monthly Sales Report",
    description: "Query to generate monthly sales report by product category",
    dialect: "Trino",
    query: `SELECT
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
  1 DESC, 3 DESC`,
  },
  2: {
    name: "Customer Segmentation",
    description: "Query to segment customers by purchase behavior",
    dialect: "Spark",
    query: `SELECT
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
  total_spent DESC`,
  },
}

interface OriginalData {
  columns: string[];
  results: any[][];
}

function convertDataFormat(data: OriginalData): any[] {
  const { columns, results } = data;
  return results.map(result => {
    const formattedResult: any = {};
    columns.forEach((column, index) => {
      formattedResult[column] = result[index];
    });
    return formattedResult;
  });
}

export default function SqlPage() {
  const searchParams = useSearchParams()
  const queryId = searchParams.get("id")

  const [dialect, setDialect] = useState<"Trino" | "Spark">("Trino")
  const [editorContent, setEditorContent] = useState<string>("")
  const [queryResults, setQueryResults] = useState<any[] | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [csvUploaded, setCsvUploaded] = useState(false)

  useEffect(() => {
    const loadQuery = async () => {
      try {
        if (queryId && mockQueries[Number(queryId)]) {
          const query = mockQueries[Number(queryId)]
          setEditorContent(query.query)
          setDialect(query.dialect as "Trino" | "Spark")
        }
      } catch (error) {
        console.error("Error loading query:", error)
      }
    }

    if (queryId) {
      loadQuery()
    }
  }, [queryId])

  const handleDialectChange = (newDialect: "Trino" | "Spark") => {
    setDialect(newDialect)
  }

  const handleQueryGenerated = (query: string) => {
    setEditorContent(query)
  }

  const handleCsvUploaded = () => {
    setCsvUploaded(true)
    toast({
      title: "CSV uploaded successfully",
      description: "Your data is now available for querying",
    })
  }

  const executeQuery = async () => {
    if (!editorContent.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter a SQL query to execute",
        variant: "destructive",
      })
      return
    }

    setIsExecuting(true)
    setQueryResults(null)

    try {
      const response = await fetch('http://localhost:5001/execute/'+ dialect.toLocaleLowerCase(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: editorContent }),
      });
      const mockData = await response.json();

      if(dialect.toLowerCase() === 'trino'){
        const originalData: OriginalData = {
          columns: mockData.columns,
          results: mockData.results,
        };
        const formattedResults = convertDataFormat(originalData);
        setQueryResults(formattedResults)
      }else{
        setQueryResults(mockData.results)
      }

      toast({
        title: "Query executed successfully",
        description: `Returned ${mockData.length} rows`,
      })
    } catch (error) {
      console.error("Error executing query:", error)
      toast({
        title: "Query execution failed",
        description: "There was an error executing your query",
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const saveQuery = async () => {
    try {
      toast({
        title: "Query saved",
        description: "Your query has been saved successfully",
      })
    } catch (error) {
      console.error("Error saving query:", error)
      toast({
        title: "Error saving query",
        description: "There was an error saving your query",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)] animate-pulse"></div>
      </div>

      <Navbar />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
              SQL Generator
            </h1>
            <p className="text-gray-300 mt-2">Translate natural language to SQL queries</p>
          </div>

          <div className="mt-4 md:mt-0">
            <DialectToggle dialect={dialect} onChange={handleDialectChange} />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 hover:border-purple-500/50 transition-all">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Database className="mr-2 h-5 w-5 text-purple-400" />
                  AI SQL Assistant
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Describe the query you need in natural language
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SqlChat dialect={dialect} onQueryGenerated={handleQueryGenerated} />
              </CardContent>
            </Card>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 hover:border-purple-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center">
                      <FileText className="mr-2 h-5 w-5 text-purple-400" />
                      SQL Editor
                    </CardTitle>
                    <CardDescription className="text-gray-400">Edit and execute your SQL query</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={saveQuery}
                      className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      onClick={executeQuery}
                      disabled={isExecuting}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {isExecuting ? "Executing..." : "Run"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <MonacoEditor value={editorContent} onChange={setEditorContent} dialect={dialect} />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 hover:border-blue-500/50 transition-all">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Upload className="mr-2 h-5 w-5 text-blue-400" />
                    Upload Sample Data
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Provide sample data to improve query generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CsvUploader onUploadComplete={handleCsvUploaded} />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {queryResults && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Card className="bg-gray-900/80 backdrop-blur-sm border border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Query Results</CardTitle>
                <CardDescription className="text-gray-400">{queryResults.length} rows returned</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="table" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700">
                    <TabsTrigger 
                      value="table" 
                      className="data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400"
                    >
                      Table View
                    </TabsTrigger>
                    <TabsTrigger 
                      value="chart" 
                      className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400"
                    >
                      Chart View
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="table">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-800/50">
                            {queryResults.length > 0 &&
                              Object.keys(queryResults[0]).map((key) => (
                                <th 
                                  key={key} 
                                  className="p-3 text-left text-gray-300 border border-gray-700"
                                >
                                  {key}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResults.map((row, rowIndex) => (
                            <tr 
                              key={rowIndex} 
                              className="border-b border-gray-700 hover:bg-gray-800/50"
                            >
                              {Object.values(row).map((value, colIndex) => (
                                <td 
                                  key={colIndex} 
                                  className="p-3 text-gray-300 border border-gray-700"
                                >
                                  {value}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="chart">
                    <div className="h-[400px] w-full flex items-center justify-center bg-gray-800/50 rounded-md border border-gray-700">
                      <p className="text-gray-400">Chart visualization will be rendered here</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}