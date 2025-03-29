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
      
      // First find all primary keys defined in the table
      const primaryKeys = new Set<string>()
      let pkMatch
      while ((pkMatch = primaryKeyRegex.exec(tableContent)) !== null) {
        const pkColumns = pkMatch[1].split(',').map(col => col.trim().replace(/["`]/g, ''))
        pkColumns.forEach(col => primaryKeys.add(col))
      }
      
      // Reset regex state for column parsing
      primaryKeyRegex.lastIndex = 0
      
      // Then parse columns
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
      
      // Now check for explicit FOREIGN KEY constraints
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
    
    // Store the schema data in session storage
    const schemaData = {
      name: "Generated Schema",
      description: "Database schema generated from your requirements",
      ddl: schema,
      ...parseDDLToSchema(schema)
    }
    sessionStorage.setItem(`schema-${id}`, JSON.stringify(schemaData))
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Schema Generator</h1>
            <p className="text-gray-400 mt-2">Create optimized database schemas from natural language descriptions</p>
          </div>

          {generatedSchema && schemaId && (
            <Link href={`/schema/visualizer?id=${schemaId}`}>
              <Button className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700">
                <Sparkles className="mr-2 h-4 w-4" />
                Visualize Schema
              </Button>
            </Link>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Database className="mr-2 h-5 w-5 text-blue-500" />
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
          </div>

          <div>
            <Tabs defaultValue="schema" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="schema" className="data-[state=active]:bg-gray-700">
                  Schema
                </TabsTrigger>
                <TabsTrigger value="rationale" className="data-[state=active]:bg-gray-700">
                  Why This Schema?
                </TabsTrigger>
              </TabsList>

              <TabsContent value="schema" className="mt-4">
                {generatedSchema ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="bg-gray-900 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <Table className="mr-2 h-5 w-5 text-blue-500" />
                          Generated Schema
                        </CardTitle>
                        <CardDescription className="text-gray-400">Your schema has been created</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-800 p-4 rounded-md">
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-[400px]">
                            {generatedSchema}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-8 text-center">
                      <Database className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-400">
                        Describe your database requirements in the chat to generate a schema
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
                    <Card className="bg-gray-900 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <HelpCircle className="mr-2 h-5 w-5 text-green-500" />
                          Schema Rationale
                        </CardTitle>
                        <CardDescription className="text-gray-400">Why this schema design was chosen</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-800 p-4 rounded-md">
                          <div className="text-sm text-gray-300 whitespace-pre-wrap">{schemaRationale}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-8 text-center">
                      <HelpCircle className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-400">Generate a schema to see the rationale behind its design</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-6 bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
              <h3 className="text-blue-400 font-medium mb-2 flex items-center">
                <Sparkles className="mr-2 h-4 w-4" />
                Pro Tips
              </h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Be specific about your business domain</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Mention expected data volumes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Describe relationships between entities</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Specify any performance requirements</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}