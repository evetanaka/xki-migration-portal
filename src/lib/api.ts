import { API_BASE } from './constants';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getStats: () => request<any>('/stats'),
  checkEligibility: (address: string) => request<any>(`/claims/${address}`),
  submitClaim: (data: { kiAddress: string; ethAddress: string; signature: string; nonce: string }) =>
    request<any>('/claims', { method: 'POST', body: JSON.stringify(data) }),
  getClaimStatus: (id: string) => request<any>(`/claims/${id}/status`),
  // Admin
  getAdminClaims: () => request<any[]>('/admin/claims'),
  approveClaim: (id: string) => request<any>(`/admin/claims/${id}/approve`, { method: 'POST' }),
  rejectClaim: (id: string) => request<any>(`/admin/claims/${id}/reject`, { method: 'POST' }),
};
