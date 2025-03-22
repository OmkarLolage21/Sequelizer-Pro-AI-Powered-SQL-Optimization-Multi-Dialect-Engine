import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const defaultQuery = `SELECT 
  customer_id,
  COUNT(*) as order_count,
  SUM(total_amount) as total_spent
FROM orders
GROUP BY customer_id
HAVING COUNT(*) > 5;`;

interface QueryResult {
  customer_id: string;
  order_count: number;
  total_spent: number;
}

export default function SQLEditor() {
  const { theme } = useTheme();
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [executionStats, setExecutionStats] = useState({
    executionTime: 0,
    rowCount: 0,
  });

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setQuery(value);
      setError(null);
    }
  };

  const handleOptimizeQuery = async () => {
    try {
      let optimizedQuery = query
        // Replace SELECT * with specific columns
        .replace(/SELECT \*/gi, 'SELECT customer_id, COUNT(*) as order_count, SUM(total_amount) as total_spent')
        // Add LIMIT if not exists
        .trim();

      if (!optimizedQuery.toLowerCase().includes('limit')) {
        optimizedQuery += '\nLIMIT 1000;';
      }

      setQuery(optimizedQuery);
    } catch (error) {
      console.error('Error optimizing query:', error);
    }
  };

  const handleRunQuery = async () => {
    try {
      setError(null);
      const startTime = Date.now();

      // Simulated database results
      const mockResults: QueryResult[] = [
        { customer_id: 'CUST001', order_count: 8, total_spent: 1245.00 },
        { customer_id: 'CUST002', order_count: 12, total_spent: 2180.00 },
      ];

      const endTime = Date.now();

      setResults(mockResults);
      setExecutionStats({
        executionTime: (endTime - startTime) / 1000,
        rowCount: mockResults.length,
      });
    } catch (err: any) {
      setError(err.message);
      setResults([]);
      setExecutionStats({
        executionTime: 0,
        rowCount: 0,
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SQL Editor</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleOptimizeQuery}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Zap size={16} />
                Optimize
              </button>
              <button
                onClick={handleRunQuery}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Play size={16} />
                Run Query
              </button>
            </div>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="sql"
              value={query}
              onChange={handleEditorChange}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Results Panel */}
        <div className="w-1/2 border-l dark:border-gray-800 flex flex-col">
          <div className="p-4 border-b dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Results</h2>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <span>Execution time: {executionStats.executionTime}s</span>
              <span>|</span>
              <span>Rows: {executionStats.rowCount}</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {error ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : results.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Spent
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {results.map((row, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-300">
                        {row.customer_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-300">
                        {row.order_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-300">
                        ${row.total_spent.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-gray-500 dark:text-gray-400">
                No results to display
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
