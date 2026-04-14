import { Flame, Layers, Coins, FileText } from 'lucide-react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

export default function Tokenomics() {
  const titleRef = useIntersectionObserver<HTMLDivElement>();

  return (
    <section id="tokenomics" className="relative py-24 md:py-36 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div ref={titleRef} className="text-center mb-16 parallax-section">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 mb-4">$XKI Token</p>
          <h2 className="text-3xl md:text-5xl font-serif text-white">Tokenomics</h2>
        </div>

        {/* Coming Soon Overlay */}
        <div className="relative">
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#050505]/70 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400 font-serif">Coming Soon</p>
              <p className="text-[10px] text-gray-600 mt-2">Full tokenomics details will be published shortly.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start opacity-30 pointer-events-none">
            {/* Pie Chart */}
            <div className="flex flex-col items-center">
              <div className="relative w-64 h-64 md:w-80 md:h-80 mb-8">
                <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="24" strokeDasharray="201.06 301.59" strokeDashoffset="0" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="24" strokeDasharray="125.66 376.99" strokeDashoffset="-201.06" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="24" strokeDasharray="75.40 427.26" strokeDashoffset="-326.73" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="24" strokeDasharray="50.27 452.39" strokeDashoffset="-402.12" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="24" strokeDasharray="50.27 452.39" strokeDashoffset="-452.39" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-serif text-white">1.2B</span>
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 mt-1">Fixed Supply</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {[
                  { color: 'bg-white/60', label: 'Airdrop / Claims', pct: '40%' },
                  { color: 'bg-white/35', label: 'Treasury', pct: '25%' },
                  { color: 'bg-white/20', label: 'Staking Rewards', pct: '15%' },
                  { color: 'bg-white/12', label: 'Team', pct: '10%' },
                  { color: 'bg-white/6', label: 'Ecosystem', pct: '10%' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    <span className={`w-3 h-3 ${item.color} rounded-sm`} />
                    <span className="text-gray-400">{item.label} <span className="text-gray-600">{item.pct}</span></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Data */}
            <div className="space-y-6">
              <div className="glass-panel p-6">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Supply</p>
                <p className="text-xl font-serif text-white mb-2">1,200,000,000 $XKI</p>
                <p className="text-xs text-gray-500 font-light">Fixed supply. ERC-20 on Ethereum mainnet. Non-upgradeable contract.</p>
              </div>

              <div className="glass-panel p-6">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Team Vesting</p>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-grow h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-white/20 rounded-full" style={{ width: '0%' }} />
                  </div>
                  <span className="text-xs text-gray-500 font-mono whitespace-nowrap">0 / 36 mo</span>
                </div>
                <p className="text-xs text-gray-500 font-light">2-year cliff + 1-year linear vesting. Tokens locked but stakeable.</p>
              </div>

              <div className="glass-panel p-6">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Mechanisms</p>
                <div className="space-y-3">
                  {[
                    { icon: Flame, title: 'Deflationary Burns', desc: 'Hard unstake burns 10% permanently. Or wait the cooldown for 100% return.' },
                    { icon: Layers, title: 'Multi-Position Staking', desc: 'Multiple concurrent stakes per wallet, different durations' },
                    { icon: Coins, title: 'Multi-Token Rewards', desc: 'Synthetix-pattern distributor — real-time, pull-based' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <item.icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-white">{item.title}</p>
                        <p className="text-[11px] text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <a href="#" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors border-b border-white/10 pb-1">
                <FileText className="w-3 h-3" />
                Full Tokenomics Paper
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
