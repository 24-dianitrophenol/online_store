import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Database, Loader2 } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { databaseFixService } from '../../services/databaseFix';

interface DatabaseStatusProps {
  onStatusChange?: (status: 'connected' | 'disconnected' | 'error') => void;
}

const DatabaseStatus: React.FC<DatabaseStatusProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkDatabaseStatus = async () => {
    setStatus('checking');
    setError(null);

    if (!isSupabaseConfigured()) {
      setStatus('disconnected');
      setError('Supabase environment variables not configured');
      onStatusChange?.(status);
      return;
    }

    try {
      const result = await databaseFixService.checkDatabaseSchema();
      
      if (result.success) {
        setStatus('connected');
        setError(null);
        onStatusChange?.('connected');
      } else {
        setStatus('error');
        setError(result.error || 'Database schema check failed');
        onStatusChange?.('error');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
      onStatusChange?.('error');
    }

    setLastCheck(new Date());
  };

  const fixDatabase = async () => {
    setIsFixing(true);
    
    try {
      const results = await databaseFixService.setupDatabase();
      
      if (results.schemaCheck.success || results.imageColumnFix?.success) {
        setStatus('connected');
        setError(null);
        onStatusChange?.('connected');
      } else {
        setStatus('error');
        setError('Failed to fix database issues');
        onStatusChange?.('error');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to fix database');
      onStatusChange?.('error');
    } finally {
      setIsFixing(false);
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkDatabaseStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-600 dark:text-green-400';
      case 'disconnected': return 'text-yellow-600 dark:text-yellow-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return <CheckCircle size={20} />;
      case 'disconnected': return <AlertCircle size={20} />;
      case 'error': return <AlertCircle size={20} />;
      default: return <Loader2 size={20} className="animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Database Connected';
      case 'disconnected': return 'Database Disconnected';
      case 'error': return 'Database Error';
      default: return 'Checking Database...';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database size={20} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Database Status</h3>
        </div>
        <button
          onClick={checkDatabaseStatus}
          disabled={status === 'checking'}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Refresh status"
        >
          <RefreshCw size={16} className={status === 'checking' ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-3">
        <div className={`flex items-center gap-2 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="font-medium">{getStatusText()}</span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Last checked: {lastCheck.toLocaleTimeString()}</span>
          {status === 'error' && (
            <button
              onClick={fixDatabase}
              disabled={isFixing}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isFixing ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Fixing...
                </>
              ) : (
                'Fix Database'
              )}
            </button>
          )}
        </div>

        {!isSupabaseConfigured() && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Click "Connect to Supabase" in the top right to set up your database connection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseStatus;