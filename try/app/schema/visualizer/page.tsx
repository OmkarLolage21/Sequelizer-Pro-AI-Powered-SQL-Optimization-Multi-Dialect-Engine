"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/ui/navbar"
import { SchemaVisualizer } from "@/components/schema/schema-visualizer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Copy, Code, Edit, Maximize, Minimize, ZoomIn, ZoomOut, RotateCw } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Column {
  name: string
  type: string
  isPrimary?: boolean
  isNullable?: boolean
}

interface Table {
  name: string
  columns: Column[]
}

interface Relationship {
  from: string
  to: string
  type: string
  fromColumn: string
  toColumn: string
}

interface Schema {
  name: string
  description: string
  tables: Table[]
  relationships: Relationship[]
  ddl: string
}

export default function SchemaVisualizerPage() {
  const searchParams = useSearchParams()
  const schemaId = searchParams.get("id")
  const [schema, setSchema] = useState<Schema | null>(null)
  const [loading, setLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  useEffect(() => {
    if (!schemaId) return

    const storedSchema = sessionStorage.getItem(`schema-${schemaId}`)
    if (storedSchema) {
      try {
        setSchema(JSON.parse(storedSchema))
      } catch (error) {
        console.error("Error parsing stored schema:", error)
        toast({
          title: "Error",
          description: "Failed to load schema data",
          variant: "destructive",
        })
      }
    }
  }, [schemaId])

  const copyDDL = () => {
    if (schema?.ddl) {
      navigator.clipboard.writeText(schema.ddl)
      toast({
        title: "Copied to clipboard",
        description: "DDL statements copied to clipboard",
      })
    }
  }

  const downloadDDL = () => {
    if (schema?.ddl) {
      const blob = new Blob([schema.ddl], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${schema.name.toLowerCase().replace(/\s+/g, "_")}_schema.sql`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode)
    toast({
      title: isEditMode ? "Edit mode disabled" : "Edit mode enabled",
      description: isEditMode ? "Schema is now in view-only mode" : "You can now drag tables and edit relationships",
    })
  }

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.5))
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {!isFullscreen && <Navbar />}

      <div className={`${isFullscreen ? "p-0" : "container mx-auto px-4 py-8"}`}>
        {!schema ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Schema Not Found</h2>
            <p className="text-gray-400 mb-8">The requested schema could not be found</p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <a href="/schema">Create New Schema</a>
            </Button>
          </div>
        ) : (
          <>
            {!isFullscreen && (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-white">{schema.name}</h1>
                  <p className="text-gray-400 mt-2">{schema.description}</p>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                  <Button variant="outline" onClick={toggleEditMode}>
                    <Edit className="mr-2 h-4 w-4" />
                    {isEditMode ? "View Mode" : "Edit Mode"}
                  </Button>
                  <Button variant="outline" onClick={copyDDL}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy DDL
                  </Button>
                  <Button variant="outline" onClick={downloadDDL}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={toggleFullscreen}>
                    <Maximize className="mr-2 h-4 w-4" />
                    Fullscreen
                  </Button>
                </div>
              </div>
            )}

            {isFullscreen ? (
              <div className="relative h-screen w-full">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleResetZoom}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={toggleFullscreen}>
                    <Minimize className="h-4 w-4" />
                  </Button>
                </div>
                <SchemaVisualizer schema={schema} isEditMode={isEditMode} zoomLevel={zoomLevel} />
              </div>
            ) : (
              <Tabs defaultValue="visual" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-800">
                  <TabsTrigger value="visual" className="data-[state=active]:bg-gray-700">
                    Visual Schema
                  </TabsTrigger>
                  <TabsTrigger value="ddl" className="data-[state=active]:bg-gray-700">
                    DDL Statements
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="visual" className="mt-4">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6">
                      <div className="relative h-[600px] w-full">
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleZoomIn}>
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleZoomOut}>
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleResetZoom}>
                            <RotateCw className="h-4 w-4" />
                          </Button>
                        </div>
                        <SchemaVisualizer schema={schema} isEditMode={isEditMode} zoomLevel={zoomLevel} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="ddl" className="mt-4">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Code className="mr-2 h-5 w-5 text-blue-500" />
                        DDL Statements
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        SQL statements to create your database schema
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-800 p-4 rounded-md relative">
                        <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={copyDDL}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-[500px]">
                          {schema.ddl}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </div>
  )
}