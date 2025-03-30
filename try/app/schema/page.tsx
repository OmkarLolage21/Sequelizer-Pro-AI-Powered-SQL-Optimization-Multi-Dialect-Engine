"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/ui/navbar"
import { SchemaChat } from "@/components/schema/schema-chat"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, HelpCircle, Database, Table } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

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

export default function SchemaPage() {
  const [generatedSchema, setGeneratedSchema] = useState<string | null>(null)
  const [schemaId, setSchemaId] = useState<string | null>(null)
  const [schemaRationale, setSchemaRationale] = useState<string | null>(null)

  const parseDDLToSchema = (ddl: string) => {
    const tables: Table[] = []
    const relationships: Relationship[] = []
    
    const tableRegex = /CREATE TABLE (\w+)\s*\(([\s\S]*?)\);/g
    const columnRegex = /(\w+)\s+([\w\(\)\d,]+)(?:\s+(PRIMARY KEY|REFERENCES\s+(\w+)\((\w+)\)|NOT NULL))?/g
    const primaryKeyRegex = /PRIMARY KEY\s*\(([^)]+)\)/g
    const foreignKeyRegex = /FOREIGN KEY\s*\((\w+)\)\s*REFERENCES\s+(\w+)\((\w+)\)/g
    
    let tableMatch
    while ((tableMatch = tableRegex.exec(ddl)) !== null) {
      const tableName = tableMatch[1]
      const tableContent = tableMatch[2]
      
      const columns: Column[] = []
      let columnMatch
      
      const primaryKeys = new Set<string>()
      let pkMatch
      while ((pkMatch = primaryKeyRegex.exec(tableContent)) !== null) {
        const pkColumns = pkMatch[1].split(',').map(col => col.trim().replace(/["`]/g, ''))
        pkColumns.forEach(col => primaryKeys.add(col))
      }
      
      primaryKeyRegex.lastIndex = 0
      
      while ((columnMatch = columnRegex.exec(tableContent)) !== null) {
        const columnName = columnMatch[1]
        const columnType = columnMatch[2]
        const isPrimary = primaryKeys.has(columnName) || columnMatch[3] === 'PRIMARY KEY'
        const refTable = columnMatch[4]
        const refColumn = columnMatch[5]
        
        columns.push({
          name: columnName,
          type: columnType,
          isPrimary,
          isNullable: !isPrimary && !columnMatch[0].includes('NOT NULL')
        })
        
        if (refTable) {
          relationships.push({
            from: tableName,
            to: refTable,
            type: 'many-to-one',
            fromColumn: columnName,
            toColumn: refColumn
          })
        }
      }
      
      let fkMatch
      while ((fkMatch = foreignKeyRegex.exec(tableContent)) !== null) {
        const fromColumn = fkMatch[1]
        const toTable = fkMatch[2]
        const toColumn = fkMatch[3]
        
        relationships.push({
          from: tableName,
          to: toTable,
          type: 'many-to-one',
          fromColumn: fromColumn,
          toColumn: toColumn
        })
      }
      
      tables.push({
        name: tableName,
        columns
      })
    }
    
    return { tables, relationships }
  }

  const handleSchemaGenerated = (schema: string, id: string, rationale: string) => {
    setGeneratedSchema(schema)
    setSchemaId(id)
    setSchemaRationale(rationale)
    
    const schemaData = {
      name: "Generated Schema",
      description: "Database schema generated from your requirements",
      ddl: schema,
      ...parseDDLToSchema(schema)
    }
    sessionStorage.setItem(`schema-${id}`, JSON.stringify(schemaData))
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
              Schema Generator
            </h1>
            <p className="text-gray-300 mt-2">Create optimized database schemas from natural language</p>
          </div>

          {generatedSchema && schemaId && (
            <Link href={`/schema/visualizer?id=${schemaId}`}>
              <Button className="mt-4 md:mt-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Sparkles className="mr-2 h-4 w-4" />
                Visualize Schema
              </Button>
            </Link>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 hover:border-purple-500/50 transition-all group">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Database className="mr-2 h-5 w-5 text-purple-400" />
                    AI Schema Assistant
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Describe your database needs in natural language
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SchemaChat onSchemaGenerated={handleSchemaGenerated} />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="space-y-6">
            <Tabs defaultValue="schema" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700">
                <TabsTrigger value="schema" className="data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400">
                  Schema
                </TabsTrigger>
                <TabsTrigger value="rationale" className="data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400">
                  Rationale
                </TabsTrigger>
              </TabsList>

              <TabsContent value="schema" className="mt-4">
                {generatedSchema ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="bg-gray-900/80 backdrop-blur-sm border border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <Table className="mr-2 h-5 w-5 text-purple-400" />
                          Generated Schema
                        </CardTitle>
                        <CardDescription className="text-gray-400">Your schema has been created</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-800/50 p-4 rounded-md border border-gray-700">
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-[400px]">
                            {generatedSchema}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="bg-gray-900/80 backdrop-blur-sm border border-gray-700">
                    <CardContent className="p-8 text-center">
                      <Database className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">
                        Describe your database requirements to generate a schema
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="rationale" className="mt-4">
                {schemaRationale ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="bg-gray-900/80 backdrop-blur-sm border border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <HelpCircle className="mr-2 h-5 w-5 text-blue-400" />
                          Schema Rationale
                        </CardTitle>
                        <CardDescription className="text-gray-400">Why this schema design was chosen</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-800/50 p-4 rounded-md border border-gray-700">
                          <div className="text-sm text-gray-300 whitespace-pre-wrap">{schemaRationale}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="bg-gray-900/80 backdrop-blur-sm border border-gray-700">
                    <CardContent className="p-8 text-center">
                      <HelpCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">Generate a schema to see the rationale</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-purple-900/20 border border-purple-800/30 rounded-lg p-4 backdrop-blur-sm"
            >
              <h3 className="text-purple-400 font-medium mb-2 flex items-center">
                <Sparkles className="mr-2 h-4 w-4" />
                Pro Tips
              </h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span>Be specific about your business domain</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span>Mention expected data volumes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span>Describe relationships between entities</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span>Specify any performance requirements</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}