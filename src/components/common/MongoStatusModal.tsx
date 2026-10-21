import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, X, ShieldAlert, Key } from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../contexts/ToastContext.js';

interface MongoStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (connected: boolean) => void;
}

export const MongoStatusModal: React.FC<MongoStatusModalProps> = ({
  isOpen,
  onClose,
  onStatusChange,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [customUri, setCustomUri] = useState('');
  const [dbName, setDbName] = useState('EduRAG_AI_DB');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getHealth();
      setHealthData(res);
      if (onStatusChange) {
        onStatusChange(Boolean(res.database?.connected));
      }
    } catch (err: any) {
      console.error('Failed to fetch MongoDB health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUri.trim()) {
      showToast('Please provide a valid MongoDB Atlas connection string.', 'warning');
      return;
    }

    try {
      setTesting(true);
      const res = await api.connectMongo(customUri.trim(), dbName.trim());
      if (res.success) {
        showToast('Successfully connected to MongoDB Atlas!', 'success');
        await fetchStatus();
      } else {
        showToast(res.message || 'Failed to connect to MongoDB Atlas.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Connection error.', 'error');
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  const isConnected = healthData?.database?.connected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              isConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            }`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                MongoDB Atlas Configuration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Primary persistent database engine for EduRAG AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Connection Status */}
        <div className="my-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Connection Health
            </span>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {isConnected ? 'Connected to MongoDB Atlas' : 'Awaiting MongoDB Atlas Connection'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Database: <span className="font-mono text-slate-700 dark:text-slate-300">{healthData?.database?.dbName || dbName}</span> | Host: {healthData?.database?.host || 'Remote Cluster'}
              </p>
            </div>
          </div>

          {!isConnected && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                EduRAG AI requires MongoDB Atlas. Provide your connection string below to connect your Atlas cluster directly.
              </span>
            </div>
          )}
        </div>

        {/* Live Connect Form */}
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              MongoDB Atlas URI (MONGODB_URI)
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={customUri}
                onChange={(e) => setCustomUri(e.target.value)}
                placeholder="mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Supports standard <code className="font-mono">mongodb+srv://</code> Atlas strings. Can also be defined in <code className="font-mono">.env</code>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Database Name (MONGODB_DB_NAME)
            </label>
            <input
              type="text"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              placeholder="EduRAG_AI_DB"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={testing || !customUri.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition disabled:opacity-50"
            >
              {testing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {testing ? 'Testing Connection...' : 'Connect to MongoDB Atlas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
