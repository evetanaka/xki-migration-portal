import { Plus, ArrowRight } from 'lucide-react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

export default function EcosystemGrid() {
  const titleRef = useIntersectionObserver<HTMLDivElement>();
  const gridRef = useIntersectionObserver<HTMLDivElement>();

  return (
    <section id="ecosystem" className="relative py-24 md:py-36 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div ref={titleRef} className="text-center mb-16 parallax-section">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 mb-4">Built on XKI</p>
          <h2 className="text-3xl md:text-5xl font-serif text-white">The Ecosystem</h2>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {/* Dar Society — Coming Soon */}
          <div className="glass-panel p-6 hover-lift group opacity-60">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center font-serif font-bold text-white text-sm">D</div>
                <div>
                  <h4 className="text-sm text-white font-semibold">Dar Society</h4>
                  <span className="text-[10px] text-gray-500 font-mono">$DAR</span>
                </div>
              </div>
              <span className="text-[9px] uppercase tracking-wider px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Coming Soon</span>
            </div>
            <p className="text-xs text-gray-500 font-light leading-relaxed mb-4">Cultural sanctuaries in Marrakech. Luxury hospitality meets Web3 loyalty — The Circle membership, $DAR tokens.</p>
            <div className="flex justify-between text-[10px] text-gray-600 uppercase tracking-wider border-t border-white/5 pt-3">
              <span>—</span>
              <span>—</span>
            </div>
          </div>

          {/* Your Project */}
          <div className="glass-panel p-6 hover-lift group border-dashed">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <h4 className="text-sm text-gray-400 font-semibold">Your Project</h4>
                  <span className="text-[10px] text-gray-600 font-mono">$???</span>
                </div>
              </div>
              <span className="text-[9px] uppercase tracking-wider px-2 py-1 bg-white/5 text-gray-500 border border-white/10">Coming Soon</span>
            </div>
            <p className="text-xs text-gray-600 font-light leading-relaxed mb-4">Build on XKI infrastructure. Your fees flow to stakers, their loyalty flows to you.</p>
            <div className="border-t border-white/5 pt-3">
              <a href="#" className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-white transition-colors flex items-center gap-2">
                <ArrowRight className="w-3 h-3" />
                Build on XKI
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
