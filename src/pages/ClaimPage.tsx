import { useState } from 'react';
import { Wallet, Search, MapPin, FileCheck, CheckCircle, ChevronRight, ArrowLeft, AlertCircle, ExternalLink } from 'lucide-react';
import { useClaimFlow } from '../hooks/useClaimFlow';

const STEP_ICONS = [Wallet, Search, MapPin, FileCheck, CheckCircle];

export default function ClaimPage() {
  const flow = useClaimFlow();
  const { step, stepTitle, isProcessing, error, claimState, wallet } = flow;

  return (
    <div className="bg-[#050505] min-h-screen">
      <section className="pt-28 pb-8 px-6 md:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 mb-2">Ki Foundation</p>
            <h1 className="text-3xl font-serif text-white gradient-text">Claim $XKI</h1>
            <p className="text-xs text-gray-500 font-light mt-2">Migrate your Ki Chain tokens to Ethereum ERC-20.</p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-12">
            {[1, 2, 3, 4, 5].map((s) => {
              const Icon = STEP_ICONS[s - 1];
              const isActive = s === step;
              const isDone = s < step;
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isDone ? 'bg-white/10 border-white/30' : isActive ? 'border-white/40 bg-white/5' : 'border-white/10'}`}>
                    {isDone ? <CheckCircle className="w-4 h-4 text-white" /> : <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-600'}`} />}
                  </div>
                  {s < 5 && <div className={`flex-1 h-[1px] ${s < step ? 'bg-white/30' : 'bg-white/5'}`} />}
                </div>
              );
            })}
          </div>

          <div className="glass-panel p-8 md:p-10">
            <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-6 font-serif">{stepTitle}</h2>

            {error && (
              <div className="bg-red-500/5 border border-red-500/20 p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Step 1: Connect Keplr */}
            {step === 1 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wallet className="w-6 h-6 text-gray-500" />
                </div>
                <h3 className="text-lg font-serif text-white mb-3">Connect Your Ki Wallet</h3>
                <p className="text-xs text-gray-500 font-light mb-8 max-w-sm mx-auto">
                  Connect with Keplr to verify your Ki Chain address and check your eligibility for the $XKI airdrop.
                </p>
                <button
                  onClick={async () => {
                    await flow.connectWallet();
                    if (wallet.address) flow.nextStep();
                  }}
                  disabled={isProcessing}
                  className="group px-8 py-4 bg-white text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-200 transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50"
                >
                  {isProcessing ? 'Connecting...' : 'Connect Keplr'}
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                </button>
                {!window.keplr && (
                  <p className="text-[10px] text-gray-600 mt-4">
                    Don't have Keplr? <a href="https://www.keplr.app/" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">Install it here</a>
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Eligibility Check */}
            {step === 2 && (
              <div className="py-4">
                <div className="glass-panel p-4 mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold text-white">Ki</div>
                  <div>
                    <p className="text-xs text-white font-mono">{wallet.address}</p>
                    <p className="text-[10px] text-gray-500">Connected</p>
                  </div>
                </div>
                <button
                  onClick={flow.checkEligibility}
                  disabled={isProcessing}
                  className="w-full py-4 bg-white text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-200 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>Checking eligibility...</>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Check Eligibility
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step 3: ETH Address */}
            {step === 3 && (
              <div className="py-4">
                <div className="mb-6">
                  <p className="text-xs text-green-400 mb-4">✓ Eligible — {claimState.balance} XKI available</p>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 block mb-3">Ethereum Destination Address</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={claimState.ethAddress}
                    onChange={(e) => flow.setEthAddress(e.target.value)}
                    className="w-full bg-transparent border border-white/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-700 focus:outline-none focus:border-white/40 transition-colors"
                  />
                  <p className="text-[10px] text-gray-600 mt-2">Your $XKI ERC-20 tokens will be sent to this address.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={flow.prevStep} className="px-6 py-3 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>
                  <button
                    onClick={flow.nextStep}
                    disabled={!claimState.ethAddress || !claimState.ethAddress.startsWith('0x') || claimState.ethAddress.length !== 42}
                    className="flex-1 py-3 bg-white text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-200 transition-colors disabled:bg-gray-900 disabled:text-gray-600 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm & Sign */}
            {step === 4 && (
              <div className="py-4">
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500">From (Ki Chain)</span>
                    <span className="text-xs font-mono text-white">{wallet.address?.slice(0, 12)}...{wallet.address?.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500">To (Ethereum)</span>
                    <span className="text-xs font-mono text-white">{claimState.ethAddress.slice(0, 8)}...{claimState.ethAddress.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/5">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500">Amount</span>
                    <span className="text-lg font-mono text-white">{claimState.balance} XKI</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={flow.prevStep} className="px-6 py-3 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>
                  <button
                    onClick={flow.submitClaim}
                    disabled={isProcessing}
                    className="flex-1 py-3 bg-white text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? 'Signing & Submitting...' : 'Sign & Submit Claim'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {step === 5 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-serif text-white mb-3">Claim Submitted!</h3>
                <p className="text-xs text-gray-500 font-light mb-6 max-w-sm mx-auto">
                  Your claim has been recorded. You'll receive your $XKI tokens on Ethereum once it's processed.
                </p>
                {claimState.claimId && (
                  <div className="glass-panel p-4 inline-block mb-6">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Claim ID</p>
                    <p className="text-sm font-mono text-white">{claimState.claimId}</p>
                  </div>
                )}
                <div className="flex flex-col items-center gap-3">
                  <a href={`https://etherscan.io/address/${claimState.ethAddress}`} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2">
                    <ExternalLink className="w-3 h-3" /> View on Etherscan
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
