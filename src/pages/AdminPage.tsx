import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Clock, Download, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

interface Claim {
  id: string;
  kiAddress: string;
  ethAddress: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function AdminPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminClaims();
      setClaims(data);
    } catch (err) {
      console.error('Failed to load claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClaims(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.approveClaim(id);
      loadClaims();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectClaim(id);
      loadClaims();
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const filtered = claims.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.kiAddress.includes(search) && !c.ethAddress.includes(search) && !c.id.includes(search)) return false;
    return true;
  });

  const stats = {
    total: claims.length,
    pending: claims.filter((c) => c.status === 'pending').length,
    approved: claims.filter((c) => c.status === 'approved').length,
    rejected: claims.filter((c) => c.status === 'rejected').length,
  };

  return (
    <div className="bg-[#050505] min-h-screen">
      <section className="pt-28 pb-8 px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 mb-2">Admin</p>
              <h1 className="text-3xl font-serif text-white gradient-text">Claims Dashboard</h1>
            </div>
            <button onClick={loadClaims} className="px-4 py-2 border border-white/10 text-gray-500 hover:text-white hover:border-white/30 transition-colors flex items-center gap-2 text-[10px] uppercase tracking-widest">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total', value: stats.total, color: 'text-white' },
              { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
              { label: 'Approved', value: stats.approved, color: 'text-green-400' },
              { label: 'Rejected', value: stats.rejected, color: 'text-red-400' },
            ].map((s) => (
              <div key={s.label} className="glass-panel p-5 text-center">
                <p className="text-[9px] uppercase tracking-[0.3em] text-gray-600 mb-2">{s.label}</p>
                <p className={`text-2xl font-serif ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-[10px] uppercase tracking-widest border transition-all ${filter === f ? 'border-white text-white' : 'border-white/10 text-gray-500 hover:text-white'}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by address or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-b border-white/10 px-2 py-1 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-white/30 transition-colors flex-1"
              />
            </div>
          </div>

          {/* Claims Table */}
          <div className="glass-panel overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500 text-xs">Loading claims...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-xs">No claims found</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="text-left text-[10px] uppercase tracking-widest text-gray-500 py-3 px-4 font-normal">ID</th>
                    <th className="text-left text-[10px] uppercase tracking-widest text-gray-500 py-3 px-4 font-normal">Ki Address</th>
                    <th className="text-left text-[10px] uppercase tracking-widest text-gray-500 py-3 px-4 font-normal">ETH Address</th>
                    <th className="text-right text-[10px] uppercase tracking-widest text-gray-500 py-3 px-4 font-normal">Amount</th>
                    <th className="text-center text-[10px] uppercase tracking-widest text-gray-500 py-3 px-4 font-normal">Status</th>
                    <th className="text-right text-[10px] uppercase tracking-widest text-gray-500 py-3 px-4 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((claim) => (
                    <tr key={claim.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-xs font-mono text-gray-400">{claim.id.slice(0, 8)}...</td>
                      <td className="py-3 px-4 text-xs font-mono text-white">{claim.kiAddress.slice(0, 12)}...{claim.kiAddress.slice(-6)}</td>
                      <td className="py-3 px-4 text-xs font-mono text-gray-400">{claim.ethAddress.slice(0, 8)}...{claim.ethAddress.slice(-4)}</td>
                      <td className="py-3 px-4 text-xs font-mono text-white text-right">{claim.amount}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 border ${
                          claim.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                          claim.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>{claim.status}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {claim.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleApprove(claim.id)} className="text-green-400 hover:text-green-300 transition-colors">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleReject(claim.id)} className="text-red-400 hover:text-red-300 transition-colors">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
