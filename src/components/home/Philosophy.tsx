import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

export default function Philosophy() {
  const ref = useIntersectionObserver<HTMLDivElement>();

  return (
    <section id="philosophy" className="relative py-24 md:py-36 border-t border-white/5">
      <div className="max-w-3xl mx-auto px-6 md:px-8">
        <div ref={ref} className="parallax-section">
          <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 mb-12">Manifesto</p>

          <h2 className="text-4xl md:text-6xl font-serif text-white mb-16 leading-[1.15]">
            Not shareholders.<br />
            <span className="text-gray-500">Stakeholders.</span>
          </h2>

          <div className="space-y-8 text-gray-400 font-light leading-[1.9] text-base md:text-lg">
            <p>
              The internet's value is created by its users. But the wealth it generates flows upward — to platforms, to shareholders, to people who never wrote a line of code or booked a single night. The architecture is extractive by design.
            </p>
            <p>
              We asked a different question: what if every participant could own a piece of the infrastructure? Not equity in a company — something more fundamental. A stake in the layer itself, beneath every product, every transaction, every interaction.
            </p>
            <p>
              $XKI is that layer. One token, connected to every project in the ecosystem. When Gordon.fi generates trading fees, when Dar Society books a villa, when Atom processes a lease — those revenues don't disappear into a corporate treasury. They flow back to the people who believed early enough to stake.
            </p>
            <p className="text-white">
              The more the ecosystem grows, the more every staker benefits. You don't need to pick the right project. You don't need to time the market. You just need to believe in the infrastructure — and commit.
            </p>
          </div>

          <div className="h-[1px] bg-white/10 my-16 line-reveal" />

          <p className="text-xs text-gray-600 uppercase tracking-[0.3em]">
            This is stakeholder capitalism. This is XKI.
          </p>
        </div>
      </div>
    </section>
  );
}
