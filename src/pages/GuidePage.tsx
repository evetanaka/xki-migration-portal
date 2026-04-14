import { useState } from 'react';

export default function GuidePage() {
  const [lang, setLang] = useState<'en' | 'fr'>('en');

  return (
    <div className="bg-[#050505] min-h-screen">
      <section className="pt-28 pb-16 px-6 md:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 mb-2">Ki Foundation</p>
            <h1 className="text-3xl font-serif text-white gradient-text mb-4">Governance Guide</h1>
            <p className="text-xs text-gray-500 font-light">How to participate in Ki Foundation governance and vote on proposals.</p>
          </div>

          {/* Language Tabs */}
          <div className="flex gap-2 mb-12">
            <button onClick={() => setLang('en')} className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold border transition-all ${lang === 'en' ? 'border-white text-white' : 'border-white/10 text-gray-500 hover:text-white'}`}>
              English
            </button>
            <button onClick={() => setLang('fr')} className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold border transition-all ${lang === 'fr' ? 'border-white text-white' : 'border-white/10 text-gray-500 hover:text-white'}`}>
              Français
            </button>
          </div>

          {lang === 'en' ? (
            <div className="space-y-12">
              <div>
                <h2 className="text-xl font-serif text-white mb-4">What is Governance?</h2>
                <p className="text-sm text-gray-400 font-light leading-relaxed mb-4">
                  Ki Foundation governance allows $XKI stakers to vote on key decisions affecting the ecosystem. Your voting power is proportional to your effective staking weight.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-serif text-white mb-4">How to Vote</h2>
                <div className="space-y-4">
                  <div className="glass-panel p-4 flex items-start gap-4">
                    <span className="text-lg font-serif text-white/20">1</span>
                    <div>
                      <p className="text-sm text-white mb-1">Stake your $XKI tokens</p>
                      <p className="text-xs text-gray-500 font-light">You need at least Architect tier (12 months) to participate in governance votes.</p>
                    </div>
                  </div>
                  <div className="glass-panel p-4 flex items-start gap-4">
                    <span className="text-lg font-serif text-white/20">2</span>
                    <div>
                      <p className="text-sm text-white mb-1">Review active proposals</p>
                      <p className="text-xs text-gray-500 font-light">Read the description carefully and understand the implications of each proposal.</p>
                    </div>
                  </div>
                  <div className="glass-panel p-4 flex items-start gap-4">
                    <span className="text-lg font-serif text-white/20">3</span>
                    <div>
                      <p className="text-sm text-white mb-1">Cast your vote</p>
                      <p className="text-xs text-gray-500 font-light">Choose Yes, No, or Abstain. Your vote weight equals your effective staking weight.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-serif text-white mb-4">Voting Power</h2>
                <p className="text-sm text-gray-400 font-light leading-relaxed">
                  Your voting power equals your effective staking weight (staked amount × tier multiplier). Higher tiers have proportionally more influence on governance decisions.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-serif text-white mb-4">Tips</h2>
                <ul className="space-y-2 text-sm text-gray-400 font-light">
                  <li className="flex items-start gap-2"><span className="text-white/30">•</span> <strong>Read the description carefully</strong></li>
                  <li className="flex items-start gap-2"><span className="text-white/30">•</span> Discuss proposals in the community before voting</li>
                  <li className="flex items-start gap-2"><span className="text-white/30">•</span> You can only vote once per proposal</li>
                  <li className="flex items-start gap-2"><span className="text-white/30">•</span> Voting does not affect your staking rewards</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              <div>
                <h2 className="text-xl font-serif text-white mb-4">Qu'est-ce que la Gouvernance ?</h2>
                <p className="text-sm text-gray-400 font-light leading-relaxed mb-4">
                  La gouvernance Ki Foundation permet aux stakers de $XKI de voter sur les décisions clés affectant l'écosystème. Votre pouvoir de vote est proportionnel à votre poids de staking effectif.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-serif text-white mb-4">Comment Voter</h2>
                <div className="space-y-4">
                  <div className="glass-panel p-4 flex items-start gap-4">
                    <span className="text-lg font-serif text-white/20">1</span>
                    <div>
                      <p className="text-sm text-white mb-1">Stakez vos tokens $XKI</p>
                      <p className="text-xs text-gray-500 font-light">Vous avez besoin au minimum du tier Architect (12 mois) pour participer aux votes de gouvernance.</p>
                    </div>
                  </div>
                  <div className="glass-panel p-4 flex items-start gap-4">
                    <span className="text-lg font-serif text-white/20">2</span>
                    <div>
                      <p className="text-sm text-white mb-1">Consultez les propositions actives</p>
                      <p className="text-xs text-gray-500 font-light">Lisez attentivement la description et comprenez les implications de chaque proposition.</p>
                    </div>
                  </div>
                  <div className="glass-panel p-4 flex items-start gap-4">
                    <span className="text-lg font-serif text-white/20">3</span>
                    <div>
                      <p className="text-sm text-white mb-1">Votez</p>
                      <p className="text-xs text-gray-500 font-light">Choisissez Oui, Non, ou Abstention. Le poids de votre vote est égal à votre poids de staking effectif.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-serif text-white mb-4">Pouvoir de Vote</h2>
                <p className="text-sm text-gray-400 font-light leading-relaxed">
                  Votre pouvoir de vote est égal à votre poids de staking effectif (montant staké × multiplicateur de tier). Les tiers supérieurs ont proportionnellement plus d'influence sur les décisions de gouvernance.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-serif text-white mb-4">Conseils</h2>
                <ul className="space-y-2 text-sm text-gray-400 font-light">
                  <li className="flex items-start gap-2"><span className="text-white/30">•</span> <strong>Lisez attentivement la description</strong></li>
                  <li className="flex items-start gap-2"><span className="text-white/30">•</span> Discutez des propositions dans la communauté avant de voter</li>
                  <li className="flex items-start gap-2"><span className="text-white/30">•</span> Vous ne pouvez voter qu'une seule fois par proposition</li>
                  <li className="flex items-start gap-2"><span className="text-white/30">•</span> Voter n'affecte pas vos récompenses de staking</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
