import React, { useState } from 'react';
import { Clock, ThumbsUp, ThumbsDown, Search } from 'lucide-react';

interface QueryHistory {
  id: string;
  sql: string;
  timestamp: Date;
  executionTime: number;
  rowCount: number;
  rating: 'like' | 'dislike' | null;
}

export default function History() {
  const [searchTerm, setSearchTerm] = useState('');
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([
    {
      id: '1',
      sql: 'SELECT * FROM users WHERE created_at > NOW() - INTERVAL \'1 days\'',
      timestamp: new Date(Date.now() - 3600000),
      executionTime: 0.8,
      rowCount: 150,
      rating: null,
    },
    {
      id: '2',
      sql: 'SELECT COUNT(*) FROM orders GROUP BY status',
      timestamp: new Date(Date.now() - 7200000),
      executionTime: 1.2,
      rowCount: 5,
      rating: 'like',
    },
    {
      id: '3',
      sql: 'SELECT p.name, SUM(o.quantity) FROM products p JOIN order_items o ON p.id = o.product_id GROUP BY p.name',
      timestamp: new Date(Date.now() - 10800000),
      executionTime: 2.1,
      rowCount: 100,
      rating: null,
    },
  ]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleRating = (id: string, rating: 'like' | 'dislike') => {
    setQueryHistory(prev =>
      prev.map(query =>
        query.id === id
          ? { ...query, rating: query.rating === rating ? null : rating }
          : query
      )
    );
  };

  const filteredHistory = queryHistory.filter(query =>
    query.sql.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Query History</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search queries..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredHistory.map((query) => (
          <div key={query.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock size={16} />
                <span>{new Date(query.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRating(query.id, 'like')}
                  className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                    query.rating === 'like' ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <ThumbsUp
                    size={16}
                    className={query.rating === 'like' ? 'text-green-500' : 'text-gray-400'}
                  />
                </button>
                <button
                  onClick={() => handleRating(query.id, 'dislike')}
                  className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                    query.rating === 'dislike' ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <ThumbsDown
                    size={16}
                    className={query.rating === 'dislike' ? 'text-red-500' : 'text-gray-400'}
                  />
                </button>
              </div>
            </div>
            
            <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-700 dark:text-gray-300 mb-4 overflow-x-auto">
              {query.sql}
            </pre>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Query executed in {query.executionTime}s</p>
              <p>Returned {query.rowCount} rows</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}