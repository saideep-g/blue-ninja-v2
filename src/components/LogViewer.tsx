import React, { useState } from 'react';
import { logger } from '../services/logging';

export function LogViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  const logs = filterLevel
    ? logger.getLogs(filterLevel as any)
    : logger.getRecent(50);

  if (!import.meta.env.DEV) {
    return null; // Only show in development
  }

  const handleExport = () => {
    const logsJson = logger.exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-4 py-2 rounded shadow-lg hover:bg-gray-700 transition"
        title="Toggle logs (dev only)"
      >
        {isOpen ? '✕ Close Logs' : '📋 Logs'}
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded shadow-lg w-96 max-h-96 overflow-y-auto flex flex-col">
          <div className="sticky top-0 bg-gray-100 dark:bg-gray-800 p-3 flex gap-2 flex-wrap border-b">
            {['debug', 'info', 'warn', 'error'].map((level) => (
              <button
                key={level}
                onClick={() =>
                  setFilterLevel(filterLevel === level ? null : level)
                }
                className={`px-2 py-1 rounded text-sm transition ${
                  filterLevel === level
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
                }`}
              >
                {level}
              </button>
            ))}
            <button
              onClick={() => logger.clear()}
              className="px-2 py-1 rounded text-sm bg-red-500 text-white hover:bg-red-600 transition ml-auto"
              title="Clear all logs"
            >
              Clear
            </button>
            <button
              onClick={handleExport}
              className="px-2 py-1 rounded text-sm bg-green-500 text-white hover:bg-green-600 transition"
              title="Export logs as JSON"
            >
              Export
            </button>
          </div>

          <div className="p-3 font-mono text-xs space-y-1 flex-1 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500 p-2">No logs</div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`p-1 rounded ${
                    log.level === 'error'
                      ? 'bg-red-100 dark:bg-red-900'
                      : log.level === 'warn'
                        ? 'bg-yellow-100 dark:bg-yellow-900'
                        : log.level === 'info'
                          ? 'bg-blue-100 dark:bg-blue-900'
                          : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <span className="text-gray-500 dark:text-gray-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {' '}
                  <span className="font-bold">[{log.level}]</span>
                  {' '}
                  {log.message}
                  {log.data && (
                    <div className="text-gray-600 dark:text-gray-400 mt-1 break-words">
                      {typeof log.data === 'string'
                        ? log.data
                        : JSON.stringify(log.data).substring(0, 100)}
                      ...
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
