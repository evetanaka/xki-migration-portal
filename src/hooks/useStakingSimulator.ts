import { useState, useMemo } from 'react';
import { MULTIPLIERS, TIER_NAMES, BASE_APY, DURATIONS } from '../lib/constants';

export function useStakingSimulator(initialAmount = 10000, initialDuration = 12) {
  const [amount, setAmount] = useState(initialAmount);
  const [duration, setDuration] = useState<number>(initialDuration);

  const result = useMemo(() => {
    const multiplier = MULTIPLIERS[duration] || 1;
    const power = amount * multiplier;
    const monthlyBase = (amount * BASE_APY) / 12;
    const monthly = monthlyBase * multiplier;
    const tierName = TIER_NAMES[duration] || '';

    return { multiplier, power, monthly, tierName };
  }, [amount, duration]);

  return {
    amount,
    setAmount,
    duration,
    setDuration,
    durations: DURATIONS,
    ...result,
  };
}
