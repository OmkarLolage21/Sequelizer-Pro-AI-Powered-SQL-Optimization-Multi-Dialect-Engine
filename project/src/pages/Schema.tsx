import React, { useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';

interface Column {
  name: string;
  type: string;
}

interface Table {
  name: string;
  columns: Column[];
}

export default function Schema() {
  const [tables, setTables] = useState<Table[]>([
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'uuid' },
        { name: 'email', type: 'varchar' },
        { name: 'created_at', type: 'timestamp' },
      ],
    },
    {
      name: 'orders',
      columns: [
        { name: 'id', type: 'uuid' },
        { name: 'user_id', type: 'uuid' },
        { name: 'total', type: 'decimal' },
      ],
    },
    {
      name: 'products',
      columns: [
        { name: 'id', type: 'uuid' },
        { name: 'name', type: 'varchar' },
        { name: 'price', type: 'decimal' },
      ],
    },
  ]);

  const handleExportDDL = () => {
    const ddl = tables.map(table => {
      const columns = table.columns
        .map(col => `  ${col.name} ${col.type}`)
        .join(',\n');
      
      return `CREATE TABLE ${table.name} (\n${columns}\n);`;
    }).join('\n\n');

    const blob = new Blob([ddl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddTable = () => {
    const newTable: Table = {
      name: `table_${tables.length + 1}`,
      columns: [{ name: 'id', type: 'uuid' }],
    };
    setTables([...tables, newTable]);
  };

  const handleDeleteTable = (index: number) => {
    setTables(tables.filter((_, i) => i !== index));
  };

  const handleAddColumn = (tableIndex: number) => {
    const updatedTables = [...tables];
    updatedTables[tableIndex].columns.push({ name: 'new_column', type: 'varchar' });
    setTables(updatedTables);
  };

  const handleUpdateColumn = (
    tableIndex: number,
    columnIndex: number,
    field: 'name' | 'type',
    value: string
  ) => {
    const updatedTables = [...tables];
    updatedTables[tableIndex].columns[columnIndex][field] = value;
    setTables(updatedTables);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Database Schema</h1>
        <div className="flex gap-2">
          <button
            onClick={handleAddTable}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus size={18} />
            Add Table
          </button>
          <button
            onClick={handleExportDDL}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download size={18} />
            Export DDL
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table, tableIndex) => (
          <div key={tableIndex} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <input
                type="text"
                value={table.name}
                onChange={(e) => {
                  const updatedTables = [...tables];
                  updatedTables[tableIndex].name = e.target.value;
                  setTables(updatedTables);
                }}
                className="text-lg font-semibold bg-transparent text-gray-900 dark:text-white border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddColumn(tableIndex)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <Plus size={16} className="text-green-500" />
                </button>
                <button
                  onClick={() => handleDeleteTable(tableIndex)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {table.columns.map((column, columnIndex) => (
                <div
                  key={columnIndex}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <input
                    type="text"
                    value={column.name}
                    onChange={(e) => handleUpdateColumn(tableIndex, columnIndex, 'name', e.target.value)}
                    className="bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none"
                  />
                  <select
                    value={column.type}
                    onChange={(e) => handleUpdateColumn(tableIndex, columnIndex, 'type', e.target.value)}
                    className="text-sm text-gray-500 bg-transparent focus:outline-none"
                  >
                    <option value="uuid">uuid</option>
                    <option value="varchar">varchar</option>
                    <option value="integer">integer</option>
                    <option value="decimal">decimal</option>
                    <option value="timestamp">timestamp</option>
                    <option value="boolean">boolean</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}