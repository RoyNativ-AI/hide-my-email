import React, { useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { aliasApi } from '../services/api';
import { Alias } from '../types';
import AliasCard from '../components/AliasCard';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Plus, LogOut, Shield, Search } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAliases = async () => {
    try {
      const response = await aliasApi.getAliases();
      setAliases(response.aliases);
    } catch (error) {
      toast.error('Failed to load aliases');
    } finally {
      setLoading(false);
    }
  };

  const createAlias = async () => {
    console.log('🔵 Create alias button clicked!');
    setCreating(true);
    try {
      console.log('🔵 Calling API...');
      const response = await aliasApi.createAlias({});
      console.log('🔵 API response:', response);
      toast.success('New alias created!');
      setAliases([response.alias, ...aliases]);
    } catch (error) {
      console.error('🔴 Create alias error:', error);
      toast.error('Failed to create alias');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadAliases();
  }, []);

  const filteredAliases = aliases.filter(alias => {
    const matchesSearch = alias.fullAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alias.recipient.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0eee6' }}>
      <header className="border-b border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-7 w-7" strokeWidth={1.5} style={{ color: '#d97757' }} />
              <h1 className="text-xl font-medium text-black">Hide My Email</h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-black">
                <span className="font-light">Welcome,</span>
                <span className="font-medium">{user?.primaryEmailAddress?.emailAddress}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="mb-8">
            <h2 className="text-3xl font-light text-black mb-2">Your Email Aliases</h2>
            <p className="text-black/70 font-light">
              Create disposable email addresses that forward to your Gmail
            </p>
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-black/50" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search aliases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-11 w-full"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredAliases.length === 0 && aliases.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="mb-6">
                <Shield className="h-16 w-16 mx-auto" strokeWidth={1} style={{ color: '#d97757', opacity: 0.3 }} />
              </div>
              <h3 className="text-xl font-light text-black mb-3">No aliases yet</h3>
              <p className="text-black/60 font-light mb-8 max-w-md mx-auto">
                Create your first email alias to get started
              </p>
              <button
                onClick={createAlias}
                disabled={creating}
                className="btn btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" strokeWidth={2} />
                Create Your First Alias
              </button>
            </div>
          ) : filteredAliases.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <h3 className="text-xl font-light text-black mb-3">No aliases found</h3>
              <p className="text-black/60 font-light max-w-md mx-auto">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <>
              {/* Existing Alias Cards */}
              {filteredAliases.map((alias, index) => (
                <AliasCard
                  key={alias.id}
                  alias={alias}
                  onUpdate={loadAliases}
                  variant={(index % 4) as 0 | 1 | 2 | 3}
                />
              ))}

              {/* Create New Alias Card */}
              <button
                onClick={createAlias}
                disabled={creating}
                className="card group hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex flex-col items-center justify-center min-h-[200px]"
                style={{ borderColor: '#d97757' }}
              >
                <Plus className="h-12 w-12 mb-3 group-hover:scale-110 transition-transform" strokeWidth={1.5} style={{ color: '#d97757' }} />
                <span className="text-lg font-light" style={{ color: '#d97757' }}>
                  {creating ? 'Creating...' : 'Create New Alias'}
                </span>
              </button>
            </>
          )}
        </div>

        <div className="mt-16 text-center text-sm text-black/50 font-light">
          <p>
            Total aliases: {aliases.length} |
            Active: {aliases.filter(a => a.status === 'active').length} |
            Total emails forwarded: {aliases.reduce((sum, a) => sum + a.emailCount, 0)}
          </p>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;