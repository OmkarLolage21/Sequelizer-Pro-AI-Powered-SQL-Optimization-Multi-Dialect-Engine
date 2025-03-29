"use client"

import { useEffect, useRef } from "react"
import * as monaco from "monaco-editor"
import { toast } from "@/components/ui/use-toast"

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  dialect: "Trino" | "Spark"
}

export function MonacoEditor({ value, onChange, dialect }: MonacoEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  useEffect(() => {
    if (editorRef.current) {
      // Configure Monaco editor
      monaco.languages.register({ id: "sql" })

      // Add SQL syntax highlighting
      monaco.languages.setMonarchTokensProvider("sql", {
        defaultToken: "",
        tokenPostfix: ".sql",
        ignoreCase: true,
        brackets: [
          { open: "[", close: "]", token: "delimiter.square" },
          { open: "(", close: ")", token: "delimiter.parenthesis" },
        ],
        keywords: [
          "SELECT",
          "FROM",
          "WHERE",
          "AS",
          "RIGHT",
          "LEFT",
          "ON",
          "INNER",
          "JOIN",
          "OUTER",
          "FULL",
          "GROUP",
          "BY",
          "ORDER",
          "HAVING",
          "LIMIT",
          "WITH",
          "UNION",
          "ALL",
          "INSERT",
          "UPDATE",
          "DELETE",
          "CREATE",
          "ALTER",
          "DROP",
          "TABLE",
          "VIEW",
          "FUNCTION",
          "TRIGGER",
          "SCHEMA",
          "CASE",
          "WHEN",
          "THEN",
          "ELSE",
          "END",
          "IF",
          "NULL",
          "NOT",
          "IN",
          "EXISTS",
          "BETWEEN",
          "LIKE",
          "IS",
          "UNIQUE",
          "PRIMARY",
          "KEY",
          "FOREIGN",
          "REFERENCES",
          "DEFAULT",
          '  "BETWEEN',
          "LIKE",
          "IS",
          "UNIQUE",
          "PRIMARY",
          "KEY",
          "FOREIGN",
          "REFERENCES",
          "DEFAULT",
          "CONSTRAINT",
          "CHECK",
          "INDEX",
          "PROCEDURE",
          "FUNCTION",
          "TRIGGER",
        ],
        operators: [
          "=",
          ">",
          "<",
          "<=",
          ">=",
          "<>",
          "!=",
          "+",
          "-",
          "*",
          "/",
          "%",
          "&&",
          "||",
          "!",
          "~",
          "^",
          "&",
          "|",
        ],
        builtinFunctions: [
          "AVG",
          "COUNT",
          "MIN",
          "MAX",
          "SUM",
          "CURRENT_DATE",
          "CURRENT_TIME",
          "CURRENT_TIMESTAMP",
          "EXTRACT",
          "CAST",
          "COALESCE",
          "NULLIF",
          "DATE_TRUNC",
          "DATE_DIFF",
          "DATEDIFF",
          "SUBSTRING",
        ],
        builtinVariables: ["@VARIABLE", "@@ERROR", "@@IDENTITY", "@@ROWCOUNT", "@@TRANCOUNT", "@@VERSION"],
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
                  "@builtinVariables": "predefined",
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

      // Add SQL code completion
      monaco.languages.registerCompletionItemProvider("sql", {
        provideCompletionItems: (model, position) => {
          const suggestions = [
            ...[
              "SELECT",
              "FROM",
              "WHERE",
              "GROUP BY",
              "ORDER BY",
              "HAVING",
              "LIMIT",
              "JOIN",
              "LEFT JOIN",
              "RIGHT JOIN",
              "INNER JOIN",
              "OUTER JOIN",
              "ON",
              "AS",
              "WITH",
              "UNION",
              "ALL",
              "DISTINCT",
            ].map((keyword) => ({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              detail: "Keyword",
            })),
            ...["COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "NULLIF", "CAST", "EXTRACT"].map((func) => ({
              label: func,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: func,
              detail: "Function",
            })),
          ]

          // Add dialect-specific suggestions
          if (dialect === "Trino") {
            suggestions.push(
              ...[
                {
                  label: "date_trunc",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "date_trunc('${1:unit}', ${2:timestamp})",
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  detail: "Trino Function",
                },
                {
                  label: "date_diff",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "date_diff('${1:unit}', ${2:timestamp1}, ${3:timestamp2})",
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  detail: "Trino Function",
                },
                {
                  label: "unnest",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "unnest(${1:array})",
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  detail: "Trino Function",
                },
              ],
            )
          } else if (dialect === "Spark") {
            suggestions.push(
              ...[
                {
                  label: "date_trunc",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "date_trunc('${1:unit}', ${2:timestamp})",
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  detail: "Spark Function",
                },
                {
                  label: "datediff",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "datediff(${1:endDate}, ${2:startDate})",
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  detail: "Spark Function",
                },
                {
                  label: "explode",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "explode(${1:array})",
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  detail: "Spark Function",
                },
              ],
            )
          }

          return {
            suggestions,
          }
        },
      })

      // Create editor
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
      })

      // Add change event listener
      monacoEditorRef.current.onDidChangeModelContent(() => {
        if (monacoEditorRef.current) {
          onChange(monacoEditorRef.current.getValue())
        }
      })

      // Add keyboard shortcut for executing query (Ctrl+Enter)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        toast({
          title: "Executing query",
          description: "Shortcut detected: Ctrl+Enter",
        })
      })

      // Add keyboard shortcut for saving query (Ctrl+S)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        toast({
          title: "Saving query",
          description: "Shortcut detected: Ctrl+S",
        })
      })

      return () => {
        monacoEditorRef.current?.dispose()
      }
    }
  }, [])

  // Update editor value when prop changes
  useEffect(() => {
    if (monacoEditorRef.current && value !== monacoEditorRef.current.getValue()) {
      monacoEditorRef.current.setValue(value)
    }
  }, [value])

  // Update editor theme when dialect changes
  useEffect(() => {
    if (monacoEditorRef.current) {
      // You could customize the editor based on dialect if needed
      // For example, change the theme or add dialect-specific decorations
    }
  }, [dialect])

  return <div ref={editorRef} className="h-[500px] w-full border border-gray-700 rounded-md overflow-hidden" />
}

