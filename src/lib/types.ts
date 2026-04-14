export interface ClaimState {
  kiAddress: string | null;
  ethAddress: string;
  balance: string | null;
  nonce: string | null;
  message: string | null;
  claimId: string | null;
}

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  status: string;
  votes: { yes: number; no: number; abstain: number };
  endDate: string;
}

export interface ClaimRecord {
  id: string;
  kiAddress: string;
  ethAddress: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface StatsData {
  totalStaked: string;
  activeProjects: number;
  rewardsDistributed: string;
  holders: number;
}
