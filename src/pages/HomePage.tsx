import HeroSection from '../components/home/HeroSection';
import HowItWorks from '../components/home/HowItWorks';
import EcosystemGrid from '../components/home/EcosystemGrid';
import StakingTiersAndSimulator from '../components/home/StakingTiersAndSimulator';
import Philosophy from '../components/home/Philosophy';
import FounderSection from '../components/home/FounderSection';
import Tokenomics from '../components/home/Tokenomics';
import CtaFinal from '../components/home/CtaFinal';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorks />
      <EcosystemGrid />
      <StakingTiersAndSimulator />
      <Philosophy />
      <FounderSection />
      <Tokenomics />
      <CtaFinal />
    </>
  );
}
