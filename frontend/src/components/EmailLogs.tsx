import React, { useState, useEffect, useMemo } from 'react';
import { EmailLog } from '../types';
import { Mail, ArrowDownLeft, ArrowUpRight, CheckCircle, XCircle, Clock, X, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';

interface EmailLogsProps {
  aliasId: string;
  isOpen: boolean;
  onClose: () => void;
}

const EmailLogs: React.FC<EmailLogsProps> = ({ aliasId, isOpen, onClose }) => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && aliasId) {
      loadLogs();
      setExpandedIds(new Set());
      setSearchTerm('');
    }
  }, [isOpen, aliasId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/logs/alias/${aliasId}`);
      setLogs(response.data.logs);
    } catch (error) {
      toast.error('Failed to load email logs');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;

    const term = searchTerm.toLowerCase();
    return logs.filter(log =>
      log.subject?.toLowerCase().includes(term) ||
      log.from?.toLowerCase().includes(term) ||
      log.to?.toLowerCase().includes(term) ||
      log.bodyPreview?.toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" strokeWidth={1.5} />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" strokeWidth={1.5} />;
      default:
        return <Clock className="h-4 w-4 text-black/50" strokeWidth={1.5} />;
    }
  };

  const getDirectionIcon = (direction: string) => {
    if (direction === 'inbound') {
      return <ArrowDownLeft className="h-4 w-4 text-blue-500" strokeWidth={1.5} />;
    }
    return <ArrowUpRight className="h-4 w-4 text-orange-500" strokeWidth={1.5} />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-black max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/20">
          <h3 className="text-lg font-medium text-black flex items-center">
            <Mail className="h-5 w-5 mr-2" strokeWidth={1.5} />
            Email Activity Log
          </h3>
          <button
            onClick={onClose}
            className="text-black/40 hover:text-black transition-colors"
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-black/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-black/40" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search emails by subject, sender, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors"
            />
          </div>
        </div>

        {/* Logs List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-black/20 border-t-black"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center p-12">
              <Mail className="h-12 w-12 mx-auto text-black/20 mb-4" strokeWidth={1} />
              {searchTerm ? (
                <>
                  <p className="text-black/50 font-light">No emails match your search</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-black/70 text-sm mt-2 underline"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <p className="text-black/50 font-light">No email activity yet</p>
                  <p className="text-black/40 text-sm mt-2">Emails will appear here after they are forwarded</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-black/10">
              {filteredLogs.map((log) => {
                const isExpanded = expandedIds.has(log.id);

                return (
                  <div key={log.id} className="hover:bg-black/5 transition-colors">
                    {/* Collapsed Header - Clickable */}
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="w-full p-4 text-left flex items-start space-x-3"
                    >
                      {/* Expand Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-black/40" strokeWidth={1.5} />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-black/40" strokeWidth={1.5} />
                        )}
                      </div>

                      {/* Direction & Status Icons */}
                      <div className="flex-shrink-0 flex items-center space-x-1.5">
                        {getDirectionIcon(log.direction)}
                        {getStatusIcon(log.status)}
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-black/10 text-black/70">
                              {log.direction === 'inbound' ? 'Received' : 'Sent'}
                            </span>
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                          </div>
                          <span className="text-xs text-black/50 font-light">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-black truncate">
                          {log.subject || '(No subject)'}
                        </p>

                        <p className="text-xs text-black/60 mt-0.5">
                          {log.from} → {log.to}
                        </p>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pl-16">
                        <div className="bg-black/5 rounded-lg p-4 space-y-3">
                          <div>
                            <span className="text-xs font-medium text-black/50 uppercase">From</span>
                            <p className="text-sm text-black">{log.from}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-black/50 uppercase">To</span>
                            <p className="text-sm text-black">{log.to}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-black/50 uppercase">Subject</span>
                            <p className="text-sm text-black">{log.subject || '(No subject)'}</p>
                          </div>
                          {log.bodyPreview && (
                            <div>
                              <span className="text-xs font-medium text-black/50 uppercase">Preview</span>
                              <p className="text-sm text-black/80 whitespace-pre-wrap">{log.bodyPreview}</p>
                            </div>
                          )}
                          {log.error && (
                            <div>
                              <span className="text-xs font-medium text-red-500 uppercase">Error</span>
                              <p className="text-sm text-red-600">{log.error}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/20" style={{ backgroundColor: '#f0eee6' }}>
          <div className="flex justify-between items-center text-sm text-black/60 font-light">
            <span>
              {searchTerm
                ? `Showing ${filteredLogs.length} of ${logs.length} emails`
                : `Showing ${logs.length} emails`
              }
            </span>
            <button
              onClick={loadLogs}
              className="text-black hover:text-black/70 font-medium transition-colors"
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailLogs;
