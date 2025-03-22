import React, { useState } from 'react';
import { Upload, ChevronDown, Database, Sparkles, Play } from 'lucide-react';
import Papa from 'papaparse';

interface Query {
  sql: string;
  timestamp: Date;
}

interface ParsedData {
  fields: string[];
  data: Record<string, any>[];
}

export default function Dashboard() {
  const [prompt, setPrompt] = useState('');
  const [sqlDialect, setSqlDialect] = useState('trino');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [recentQueries, setRecentQueries] = useState<Query[]>([]);
  const [stats, setStats] = useState({
    totalQueries: 0,
    avgResponseTime: 0,
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const fields = results.meta.fields || [];
          setParsedData({
            fields,
            data: results.data as Record<string, any>[],
          });

          // Generate CREATE TABLE statement
          const tableName = file.name.replace('.csv', '').toLowerCase();
          const createTableSQL = `CREATE TABLE ${tableName} (\n` +
            fields.map(field => `  ${field} TEXT`).join(',\n') +
            '\n);';

          // Add to recent queries
          setRecentQueries(prev => [{
            sql: createTableSQL,
            timestamp: new Date()
          }, ...prev]);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
        }
      });
    }
  };

  const generateSampleSchema = () => {
    const sampleSchema = `CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total_amount DECIMAL(10,2),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

    setRecentQueries(prev => [{
      sql: sampleSchema,
      timestamp: new Date()
    }, ...prev]);

    return sampleSchema;
  };

  const handleGenerateSchema = async () => {
    try {
      const startTime = Date.now();
      
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const schema = generateSampleSchema();
      console.log('Generated schema from prompt:', prompt);
      console.log(schema);
      
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;
      
      setStats(prev => ({
        totalQueries: prev.totalQueries + 1,
        avgResponseTime: (prev.avgResponseTime * prev.totalQueries + responseTime) / (prev.totalQueries + 1)
      }));
    } catch (error) {
      console.error('Error generating schema:', error);
    }
  };

  const handleGenerateSQL = async () => {
    try {
      const startTime = Date.now();
      
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generate SQL based on the prompt
      const generatedSQL = prompt.toLowerCase().includes('count') 
        ? 'SELECT COUNT(*) as total_count FROM users GROUP BY status;'
        : 'SELECT u.name, COUNT(o.id) as order_count, SUM(o.total_amount) as total_spent\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nGROUP BY u.id, u.name\nHAVING COUNT(o.id) > 0\nORDER BY total_spent DESC;';

      const newQuery = {
        sql: generatedSQL,
        timestamp: new Date()
      };
      
      setRecentQueries(prev => [newQuery, ...prev]);
      
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;
      
      setStats(prev => ({
        totalQueries: prev.totalQueries + 1,
        avgResponseTime: (prev.avgResponseTime * prev.totalQueries + responseTime) / (prev.totalQueries + 1)
      }));
    } catch (error) {
      console.error('Error generating SQL:', error);
    }
  };

  const handleExecuteQuery = async () => {
    try {
      const startTime = Date.now();
      
      // Simulate query execution
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;
      
      setStats(prev => ({
        totalQueries: prev.totalQueries + 1,
        avgResponseTime: (prev.avgResponseTime * prev.totalQueries + responseTime) / (prev.totalQueries + 1)
      }));

      if (parsedData) {
        console.log('Executing query on parsed data:', parsedData);
      }
    } catch (error) {
      console.error('Error executing query:', error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your schema or write a question in English... (e.g., 'Create a schema for a blog with users and posts' or 'Show me total orders by customer')"
            className="w-full h-32 p-3 rounded-lg border bg-gray-50 dark:bg-gray-700 
              border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white 
              focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <div className="flex items-center gap-4 mt-4">
            <label className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Upload size={18} />
                Upload CSV
              </button>
            </label>
            
            <div className="relative">
              <select
                value={sqlDialect}
                onChange={(e) => setSqlDialect(e.target.value)}
                className="appearance-none px-4 py-2 pr-8 rounded-lg bg-gray-100 dark:bg-gray-700 
                  text-gray-900 dark:text-white border border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="trino">Trino SQL</option>
                <option value="spark">Spark SQL</option>
              </select>
              <ChevronDown size={16} className="absolute right-2 top-3 text-gray-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <button
              onClick={handleGenerateSchema}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Database size={18} />
              Generate Schema
            </button>
            <button
              onClick={handleGenerateSQL}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Sparkles size={18} />
              Generate SQL
            </button>
            <button
              onClick={handleExecuteQuery}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <Play size={18} />
              Execute Query
            </button>
          </div>
        </div>

        {parsedData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Uploaded Data Preview</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    {parsedData.fields.map((field, index) => (
                      <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {parsedData.data.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {parsedData.fields.map((field, colIndex) => (
                        <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {row[field]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Queries</h2>
            <div className="space-y-3">
              {recentQueries.map((query, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {query.sql}
                  </pre>
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(query.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Queries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalQueries.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Response Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.avgResponseTime.toFixed(2)}s
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}