export const API_BASE = 'https://api.foundation.ki/api';

export const MULTIPLIERS: Record<number, number> = {
  3: 1,
  6: 2,
  12: 3,
  24: 4,
  36: 5,
};

export const TIER_NAMES: Record<number, string> = {
  3: 'Explorer',
  6: 'Builder',
  12: 'Architect',
  24: 'Founder',
  36: 'Visionary',
};

export const TIER_EMOJIS: Record<number, string> = {
  3: '🧭',
  6: '🔨',
  12: '🏛️',
  24: '👑',
  36: '🌟',
};

export const DURATIONS = [3, 6, 12, 24, 36] as const;

export const BASE_APY = 0.124; // 12.4%

export const CHAIN_ID = 'kichain-2';

export const TOTAL_SUPPLY = 1_200_000_000;

export const TOKENOMICS = [
  { label: 'Community Airdrop', amount: 500_000_000, pct: 41.7, color: 'text-white' },
  { label: 'Team & Advisors', amount: 100_000_000, pct: 8.3, color: 'text-gray-400' },
  { label: 'Treasury & Ecosystem', amount: 600_000_000, pct: 50.0, color: 'text-gray-500' },
];
