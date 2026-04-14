import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useKeplrWallet } from './useKeplrWallet';
import type { ClaimState } from '../lib/types';

const STEP_TITLES: Record<number, string> = {
  1: 'Authentication',
  2: 'Eligibility Check',
  3: 'Destination',
  4: 'Confirmation',
  5: 'Submission Complete',
};

export function useClaimFlow() {
  const wallet = useKeplrWallet();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimState, setClaimState] = useState<ClaimState>({
    kiAddress: null,
    ethAddress: '',
    balance: null,
    nonce: null,
    message: null,
    claimId: null,
  });

  const stepTitle = STEP_TITLES[step] || '';

  const connectWallet = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await wallet.connect();
      setClaimState((s) => ({ ...s, kiAddress: wallet.address }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [wallet]);

  const checkEligibility = useCallback(async () => {
    if (!claimState.kiAddress) return;
    setIsProcessing(true);
    setError(null);
    try {
      const data = await api.checkEligibility(claimState.kiAddress);
      setClaimState((s) => ({
        ...s,
        balance: data.balance || data.amount,
        nonce: data.nonce,
        message: data.message,
      }));
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Not eligible or address not found');
    } finally {
      setIsProcessing(false);
    }
  }, [claimState.kiAddress]);

  const setEthAddress = useCallback((ethAddress: string) => {
    setClaimState((s) => ({ ...s, ethAddress }));
  }, []);

  const submitClaim = useCallback(async () => {
    if (!claimState.kiAddress || !claimState.ethAddress || !claimState.nonce) return;
    setIsProcessing(true);
    setError(null);
    try {
      const messageToSign = claimState.message || `Claim XKI tokens to ${claimState.ethAddress}`;
      const result = await wallet.signMessage(messageToSign);
      const data = await api.submitClaim({
        kiAddress: claimState.kiAddress,
        ethAddress: claimState.ethAddress,
        signature: result.signature,
        nonce: claimState.nonce,
      });
      setClaimState((s) => ({ ...s, claimId: data.claimId || data.id }));
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Failed to submit claim');
    } finally {
      setIsProcessing(false);
    }
  }, [claimState, wallet]);

  const nextStep = useCallback(() => setStep((s) => Math.min(s + 1, 5)), []);
  const prevStep = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  return {
    step,
    stepTitle,
    isProcessing,
    error,
    claimState,
    wallet,
    connectWallet,
    checkEligibility,
    setEthAddress,
    submitClaim,
    nextStep,
    prevStep,
    setStep,
    setError,
  };
}
