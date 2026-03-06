import React, { useState } from 'react';
import { Alias } from '../types';
import { Copy, MoreVertical, Trash2, ToggleLeft, ToggleRight, Mail, Activity } from 'lucide-react';
import { aliasApi } from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import EmailLogs from './EmailLogs';

interface AliasCardProps {
  alias: Alias;
  onUpdate: () => void;
  variant?: 0 | 1 | 2 | 3;
}

const AliasCard: React.FC<AliasCardProps> = ({ alias, onUpdate, variant = 0 }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const getCardClass = () => {
    switch (variant) {
      case 1:
        return 'card-variant-1';
      case 2:
        return 'card-variant-2';
      case 3:
        return 'card-variant-3';
      default:
        return 'card';
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const toggleStatus = async () => {
    setLoading(true);
    try {
      const newStatus = alias.status === 'active' ? 'inactive' : 'active';
      await aliasApi.updateAliasStatus(alias.id, newStatus);
      toast.success(`Alias ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update alias status');
    } finally {
      setLoading(false);
    }
  };

  const deleteAlias = async () => {
    if (!confirm('Are you sure you want to delete this alias? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await aliasApi.deleteAlias(alias.id);
      toast.success('Alias deleted successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete alias');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-white';
      case 'inactive':
        return 'bg-black/20 text-black';
      case 'disabled':
        return 'bg-black/10 text-black/50';
      default:
        return 'bg-black/10 text-black';
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === 'active') {
      return { backgroundColor: '#d97757' };
    }
    return {};
  };

  return (
    <div className={`${getCardClass()} hover:scale-[1.02] transition-all duration-200`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-3">
            <Mail className="h-4 w-4 text-black/40 flex-shrink-0" strokeWidth={1.5} />
            <p className="text-sm font-mono text-black truncate font-medium">
              {alias.fullAddress}
            </p>
            <button
              onClick={() => copyToClipboard(alias.fullAddress)}
              className="p-1 text-black/40 hover:text-black transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center space-x-2 mb-4">
            <span
              className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(alias.status)}`}
              style={getStatusStyle(alias.status)}
            >
              {alias.status}
            </span>
            <span className="text-xs text-black/50 font-light">
              {alias.emailCount} emails
            </span>
          </div>

          {alias.lastUsed && (
            <p className="text-xs text-black/50 mb-1.5 font-light">
              Last used {formatDistanceToNow(new Date(alias.lastUsed), { addSuffix: true })}
            </p>
          )}

          <p className="text-xs text-black/40 font-light">
            Created {formatDistanceToNow(new Date(alias.createdAt), { addSuffix: true })}
          </p>
        </div>

        <div className="relative ml-4">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-black/40 hover:text-black transition-colors rounded-lg hover:bg-black/5"
            disabled={loading}
          >
            <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-sm rounded-xl border border-black z-10">
              <div className="py-1.5">
                <button
                  onClick={() => {
                    setShowLogs(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-black hover:bg-black/5 flex items-center space-x-2 font-light transition-colors"
                >
                  <Activity className="h-4 w-4" strokeWidth={1.5} />
                  <span>View Activity</span>
                </button>
                <button
                  onClick={toggleStatus}
                  className="w-full px-4 py-2.5 text-left text-sm text-black hover:bg-black/5 flex items-center space-x-2 font-light transition-colors"
                  disabled={loading}
                >
                  {alias.status === 'active' ? (
                    <>
                      <ToggleLeft className="h-4 w-4" strokeWidth={1.5} />
                      <span>Disable</span>
                    </>
                  ) : (
                    <>
                      <ToggleRight className="h-4 w-4" strokeWidth={1.5} />
                      <span>Enable</span>
                    </>
                  )}
                </button>
                <button
                  onClick={deleteAlias}
                  className="w-full px-4 py-2.5 text-left text-sm text-black hover:bg-black/5 flex items-center space-x-2 font-light transition-colors"
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <EmailLogs
        aliasId={alias.id}
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
      />
    </div>
  );
};

export default AliasCard;