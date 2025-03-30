"use client"

import { useEffect, useRef, useState } from "react"
import * as monaco from "monaco-editor"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

// Types
export type SQLDialect = "Trino" | "Spark" | "MySQL" | "PostgreSQL" | "Generic"

export interface DatabaseSchema {
  tables: TableSchema[]
  functions?: FunctionSchema[]
}

export interface TableSchema {
  name: string
  columns: ColumnSchema[]
  description?: string
}

export interface ColumnSchema {
  name: string
  type: string
  description?: string
}

export interface FunctionSchema {
  name: string
  description?: string
  signature?: string
  dialect?: SQLDialect[]
}

export interface CompletionOptions {
  enableBasicKeywords?: boolean
  enableFunctions?: boolean
  enableSnippets?: boolean
  enableTableSuggestions?: boolean
  enableColumnSuggestions?: boolean
  enableSchemaLoadingIndicator?: boolean
}

export interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  dialect?: SQLDialect
  getSchema?: () => Promise<DatabaseSchema>
  completionOptions?: CompletionOptions
  height?: string | number
  className?: string
  loadingComponent?: React.ReactNode
}

// Default SQL keywords
const DEFAULT_SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", 
  "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "OUTER JOIN", "ON", 
  "AS", "WITH", "UNION", "ALL", "DISTINCT", "INSERT INTO", "UPDATE", 
  "DELETE FROM", "CREATE TABLE", "ALTER TABLE", "DROP TABLE", "TRUNCATE TABLE",
  "CREATE VIEW", "ALTER VIEW", "DROP VIEW", "CREATE INDEX", "DROP INDEX",
  "EXPLAIN", "DESCRIBE", "SHOW TABLES", "SHOW COLUMNS", "USE", "SET",
  "BEGIN", "COMMIT", "ROLLBACK", "GRANT", "REVOKE", "AND", "OR", "NOT",
  "IN", "BETWEEN", "LIKE", "IS NULL", "IS NOT NULL", "EXISTS"
]

// Common SQL functions
const COMMON_SQL_FUNCTIONS = [
  "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "NULLIF", "CAST", 
  "EXTRACT", "CONCAT", "SUBSTRING", "TRIM", "UPPER", "LOWER", "LENGTH",
  "CHAR_LENGTH", "POSITION", "REPLACE", "ROUND", "TRUNC", "CEIL", "FLOOR",
  "ABS", "MOD", "POWER", "SQRT", "EXP", "LN", "LOG", "SIN", "COS", "TAN",
  "ASIN", "ACOS", "ATAN", "ATAN2", "PI", "RANDOM", "NOW", "CURRENT_DATE",
  "CURRENT_TIME", "CURRENT_TIMESTAMP", "DATE_ADD", "DATE_SUB", "DATE_DIFF",
  "DATE_TRUNC", "DATE_FORMAT", "TO_DATE", "TO_TIMESTAMP", "YEAR", "MONTH",
  "DAY", "HOUR", "MINUTE", "SECOND", "QUARTER", "WEEK", "DAYOFWEEK", "DAYOFYEAR"
]

// Dialect-specific functions
const DIALECT_FUNCTIONS: Record<SQLDialect, FunctionSchema[]> = {
  Trino: [
    { name: "date_trunc", signature: "date_trunc(unit, timestamp)" },
    { name: "date_diff", signature: "date_diff(unit, timestamp1, timestamp2)" },
    { name: "unnest", signature: "unnest(array)" },
    { name: "array_agg", signature: "array_agg(expression)" },
    { name: "map_agg", signature: "map_agg(key, value)" }
  ],
  Spark: [
    { name: "date_trunc", signature: "date_trunc(unit, timestamp)" },
    { name: "datediff", signature: "datediff(endDate, startDate)" },
    { name: "explode", signature: "explode(array)" },
    { name: "collect_list", signature: "collect_list(expr)" },
    { name: "collect_set", signature: "collect_set(expr)" }
  ],
  MySQL: [
    { name: "DATE_FORMAT", signature: "DATE_FORMAT(date, format)" },
    { name: "GROUP_CONCAT", signature: "GROUP_CONCAT(expr)" },
    { name: "IFNULL", signature: "IFNULL(expr1, expr2)" }
  ],
  PostgreSQL: [
    { name: "to_char", signature: "to_char(timestamp, text)" },
    { name: "array_agg", signature: "array_agg(expression)" },
    { name: "jsonb_agg", signature: "jsonb_agg(expression)" }
  ],
  Generic: []
}

// Useful SQL snippets
const SQL_SNIPPETS = [
  {
    label: "SELECT * FROM",
    snippet: "SELECT * FROM ${1:table}",
    documentation: "Basic SELECT query"
  },
  {
    label: "JOIN tables",
    snippet: [
      "SELECT ${1:columns}",
      "FROM ${2:table1}",
      "JOIN ${3:table2} ON ${2:table1}.${4:key} = ${3:table2}.${5:key}"
    ].join("\n"),
    documentation: "Table JOIN pattern"
  },
  {
    label: "CREATE TABLE",
    snippet: [
      "CREATE TABLE ${1:table_name} (",
      "  ${2:column_name} ${3:data_type} ${4:constraints}",
      ")"
    ].join("\n"),
    documentation: "CREATE TABLE statement"
  },
  {
    label: "INSERT INTO",
    snippet: [
      "INSERT INTO ${1:table} (${2:columns})",
      "VALUES (${3:values})"
    ].join("\n"),
    documentation: "INSERT statement"
  },
  {
    label: "Common Table Expression",
    snippet: [
      "WITH ${1:cte_name} AS (",
      "  SELECT ${2:columns}",
      "  FROM ${3:table}",
      "  WHERE ${4:condition}",
      ")",
      "SELECT * FROM ${1:cte_name}"
    ].join("\n"),
    documentation: "CTE (WITH clause)"
  }
]

export function MonacoEditor({
  value,
  onChange,
  dialect = "Generic",
  getSchema,
  completionOptions = {
    enableBasicKeywords: true,
    enableFunctions: true,
    enableSnippets: true,
    enableTableSuggestions: true,
    enableColumnSuggestions: true,
    enableSchemaLoadingIndicator: true
  },
  height = "500px",
  className = "",
  loadingComponent
}: MonacoEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const schemaCache = useRef<DatabaseSchema | null>(null)
  const [isLoadingSchema, setIsLoadingSchema] = useState(false)

  // Load schema if provider is available
  const loadSchema = async () => {
    if (!getSchema) return null
    
    try {
      setIsLoadingSchema(true)
      if (!schemaCache.current) {
        schemaCache.current = await getSchema()
      }
      return schemaCache.current
    } catch (error) {
      console.error("Error loading schema:", error)
      return null
    } finally {
      setIsLoadingSchema(false)
    }
  }

  // Detect SQL context from text
  const detectSqlContext = (sqlText: string) => {
    const lines = sqlText.split('\n')
    const currentLine = lines[lines.length - 1] || ''
    
    return {
      isAfterSelect: /select\s+$/i.test(currentLine),
      isAfterFrom: /from\s+$/i.test(currentLine),
      isAfterJoin: /join\s+$/i.test(currentLine),
      isAfterWhere: /where\s+$/i.test(currentLine),
      isAfterGroupBy: /group by\s+$/i.test(currentLine),
      isAfterOrderBy: /order by\s+$/i.test(currentLine),
      isAfterHaving: /having\s+$/i.test(currentLine),
      isAfterFromOrJoin: /(from|join)\s+$/i.test(currentLine),
      isAfterDot: /\.\s*$/i.test(currentLine),
      tableNameBeforeDot: currentLine.match(/(\w+)\.\s*$/i)?.[1] || null,
      currentLine
    }
  }

  // Create completion items for SQL keywords
  const createKeywordSuggestions = (range: monaco.IRange, context: ReturnType<typeof detectSqlContext>) => {
    if (!completionOptions.enableBasicKeywords) return []

    const suggestions = DEFAULT_SQL_KEYWORDS.map(keyword => ({
      label: keyword,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: keyword,
      range,
      detail: "Keyword",
    }))

    // Add context-specific keywords
    if (context.isAfterWhere) {
      suggestions.push(
        ...[
          { label: "AND", insertText: "AND " },
          { label: "OR", insertText: "OR " },
          { label: "NOT", insertText: "NOT " },
          { label: "IN", insertText: "IN (" },
          { label: "BETWEEN", insertText: "BETWEEN " },
          { label: "LIKE", insertText: "LIKE " },
          { label: "IS NULL", insertText: "IS NULL" },
          { label: "IS NOT NULL", insertText: "IS NOT NULL" },
          { label: "EXISTS", insertText: "EXISTS (" },
        ].map(item => ({
          label: item.label,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: item.insertText,
          range,
          detail: "Operator",
        }))
      )
    }

    return suggestions
  }

  // Create completion items for functions
  const createFunctionSuggestions = (range: monaco.IRange) => {
    if (!completionOptions.enableFunctions) return []

    const suggestions: monaco.languages.CompletionItem[] = []

    // Add common functions
    COMMON_SQL_FUNCTIONS.forEach(func => {
      suggestions.push({
        label: func,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: `${func}($0)`,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        detail: "Function",
      })
    })

    // Add dialect-specific functions
    DIALECT_FUNCTIONS[dialect].forEach(func => {
      suggestions.push({
        label: func.name,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: func.signature ? `${func.name}($0)` : `${func.name}()`,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        detail: `${dialect} Function`,
        documentation: func.description || func.signature,
      })
    })

    // Add schema functions if available
    if (schemaCache.current?.functions) {
      schemaCache.current.functions.forEach(func => {
        if (!func.dialect || func.dialect.includes(dialect)) {
          suggestions.push({
            label: func.name,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: func.signature ? `${func.name}($0)` : `${func.name}()`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: "Custom Function",
            documentation: func.description || func.signature,
          })
        }
      })
    }

    return suggestions
  }

  // Create completion items for snippets
  const createSnippetSuggestions = (range: monaco.IRange) => {
    if (!completionOptions.enableSnippets) return []

    return SQL_SNIPPETS.map(snippet => ({
      label: snippet.label,
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: Array.isArray(snippet.snippet) ? snippet.snippet.join('\n') : snippet.snippet,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
      detail: "Snippet",
      documentation: snippet.documentation,
    }))
  }

  // Create completion items for tables
  const createTableSuggestions = (range: monaco.IRange) => {
    if (!completionOptions.enableTableSuggestions || !schemaCache.current) return []

    return schemaCache.current.tables.map(table => ({
      label: table.name,
      kind: monaco.languages.CompletionItemKind.Class,
      insertText: table.name,
      range,
      detail: "Table",
      documentation: table.description || `Columns: ${table.columns.map(c => c.name).join(', ')}`,
    }))
  }

  // Create completion items for columns
  const createColumnSuggestions = (
    range: monaco.IRange,
    context: ReturnType<typeof detectSqlContext>
  ) => {
    if (!completionOptions.enableColumnSuggestions || !schemaCache.current) return []

    const suggestions: monaco.languages.CompletionItem[] = []

    // If after dot, suggest columns for that specific table
    if (context.isAfterDot && context.tableNameBeforeDot) {
      const table = schemaCache.current.tables.find(t => t.name === context.tableNameBeforeDot)
      if (table) {
        table.columns.forEach(column => {
          suggestions.push({
            label: column.name,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: column.name,
            range,
            detail: "Column",
            documentation: column.description || `Type: ${column.type}`,
          })
        })
      }
    }
    // Otherwise suggest all columns with table prefix
    else {
      schemaCache.current.tables.forEach(table => {
        table.columns.forEach(column => {
          suggestions.push({
            label: `${table.name}.${column.name}`,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: `${table.name}.${column.name}`,
            range,
            detail: "Column",
            documentation: column.description || `Table: ${table.name}, Type: ${column.type}`,
          })
        })
      })
    }

    return suggestions
  }

  // Create the completion item provider
  const createCompletionProvider = () => {
    return {
      triggerCharacters: [" ", ".", "(", ",", "'"],
      provideCompletionItems: async (model: monaco.editor.ITextModel, position: monaco.Position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        })

        const context = detectSqlContext(textUntilPosition)

        // Load schema if needed
        if ((completionOptions.enableTableSuggestions || completionOptions.enableColumnSuggestions) && !schemaCache.current) {
          await loadSchema()
        }

        const suggestions: monaco.languages.CompletionItem[] = []

        // Add different types of suggestions based on context and options
        suggestions.push(...createKeywordSuggestions(range, context))
        suggestions.push(...createFunctionSuggestions(range))
        suggestions.push(...createSnippetSuggestions(range))
        
        if (context.isAfterFromOrJoin) {
          suggestions.push(...createTableSuggestions(range))
        }

        if (context.isAfterSelect || context.isAfterWhere || context.isAfterDot) {
          suggestions.push(...createColumnSuggestions(range, context))
        }

        return { suggestions }
      }
    }
  }

  // Initialize Monaco editor
  useEffect(() => {
    if (editorRef.current) {
      // Register SQL language
      monaco.languages.register({ id: "sql" })

      // Set up SQL syntax highlighting
      monaco.languages.setMonarchTokensProvider("sql", {
        defaultToken: "",
        tokenPostfix: ".sql",
        ignoreCase: true,
        brackets: [
          { open: "[", close: "]", token: "delimiter.square" },
          { open: "(", close: ")", token: "delimiter.parenthesis" },
        ],
        keywords: DEFAULT_SQL_KEYWORDS,
        operators: [
          "=", ">", "<", "<=", ">=", "<>", "!=", "+", "-", "*", "/", "%",
          "&&", "||", "!", "~", "^", "&", "|"
        ],
        builtinFunctions: [...COMMON_SQL_FUNCTIONS, ...DIALECT_FUNCTIONS[dialect].map(f => f.name)],
        tokenizer: {
          root: [
            { include: "@comments" },
            { include: "@whitespace" },
            { include: "@numbers" },
            { include: "@strings" },
            { include: "@complexIdentifiers" },
            { include: "@scopes" },
            [/[;,.]/, "delimiter"],
            [/[()]/, "@brackets"],
            [
              /[\w@#$]+/,
              {
                cases: {
                  "@keywords": "keyword",
                  "@operators": "operator",
                  "@builtinFunctions": "predefined",
                  "@default": "identifier",
                },
              },
            ],
            [/[<>=!%&+\-*/|~^]/, "operator"],
          ],
          whitespace: [[/\s+/, "white"]],
          comments: [
            [/--+.*/, "comment"],
            [/\/\*/, { token: "comment.quote", next: "@comment" }],
          ],
          comment: [
            [/[^*/]+/, "comment"],
            [/\*\//, { token: "comment.quote", next: "@pop" }],
            [/./, "comment"],
          ],
          numbers: [
            [/0[xX][0-9a-fA-F]*/, "number"],
            [/[$][+-]*\d*(\.\d*)?/, "number"],
            [/((\d+(\.\d*)?)|(\.\d+))([eE][-+]?\d+)?/, "number"],
          ],
          strings: [
            [/'/, { token: "string", next: "@string" }],
            [/"/, { token: "string.double", next: "@stringDouble" }],
          ],
          string: [
            [/[^']+/, "string"],
            [/''/, "string"],
            [/'/, { token: "string", next: "@pop" }],
          ],
          stringDouble: [
            [/[^"]+/, "string.double"],
            [/""/, "string.double"],
            [/"/, { token: "string.double", next: "@pop" }],
          ],
          complexIdentifiers: [
            [/\[/, { token: "identifier.quote", next: "@bracketedIdentifier" }],
            [/"/, { token: "identifier.quote", next: "@quotedIdentifier" }],
          ],
          bracketedIdentifier: [
            [/[^\]]+/, "identifier"],
            [/]]/, "identifier"],
            [/]/, { token: "identifier.quote", next: "@pop" }],
          ],
          quotedIdentifier: [
            [/[^"]+/, "identifier"],
            [/""/, "identifier"],
            [/"/, { token: "identifier.quote", next: "@pop" }],
          ],
          scopes: [],
        },
      })

      // Create editor instance
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value,
        language: "sql",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        tabSize: 2,
        wordWrap: "on",
        lineNumbers: "on",
        glyphMargin: true,
        folding: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        suggest: {
          preview: true,
          showMethods: true,
          showFunctions: true,
          showConstructors: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showStructs: true,
          showInterfaces: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showOperators: true,
          showReferences: true,
          showConstants: true,
          showValues: true,
        },
      })

      // Register completion provider
      const provider = monaco.languages.registerCompletionItemProvider(
        "sql",
        createCompletionProvider()
      )

      // Handle editor content changes
      monacoEditorRef.current.onDidChangeModelContent(() => {
        if (monacoEditorRef.current) {
          onChange(monacoEditorRef.current.getValue())
        }
      })

      // Add keyboard shortcuts
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        toast({
          title: "Executing query",
          description: "Shortcut detected: Ctrl+Enter",
        })
      })

      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        toast({
          title: "Saving query",
          description: "Shortcut detected: Ctrl+S",
        })
      })

      // Cleanup
      return () => {
        provider.dispose()
        monacoEditorRef.current?.dispose()
      }
    }
  }, [dialect, getSchema])

  // Update editor value when prop changes
  useEffect(() => {
    if (monacoEditorRef.current && value !== monacoEditorRef.current.getValue()) {
      monacoEditorRef.current.setValue(value)
    }
  }, [value])

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div ref={editorRef} className="h-full w-full border border-gray-700 rounded-md overflow-hidden" />
      
      {isLoadingSchema && completionOptions.enableSchemaLoadingIndicator && (
        <div className="absolute bottom-2 right-2 bg-gray-800/80 text-white px-3 py-1 rounded-md text-sm flex items-center">
          {loadingComponent || (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading schema...
            </>
          )}
        </div>
      )}
    </div>
  )
}