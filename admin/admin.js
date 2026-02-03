// XKI Migration Admin Dashboard - Keplr Auth

const API_BASE = 'https://api.foundation.ki/api';

// Admin whitelist - only this wallet can access
const ADMIN_WALLET = 'ki1ypnke0r4uk6u82w4gh73kc5tz0qsn0ahek0653';

// State
let authToken = null;
let adminAddress = null;
let currentClaim = null;

// DOM Elements
const elements = {
    authSection: document.getElementById('auth-section'),
    dashboard: document.getElementById('dashboard'),
    btnAuth: document.getElementById('btn-auth'),
    authError: document.getElementById('auth-error'),
    walletStatus: document.getElementById('wallet-status'),
    filterStatus: document.getElementById('filter-status'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnExport: document.getElementById('btn-export'),
    claimsBody: document.getElementById('claims-body'),
    emptyState: document.getElementById('empty-state'),
    lastUpdated: document.getElementById('last-updated'),
    modal: document.getElementById('claim-modal'),
    btnUpdate: document.getElementById('btn-update')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check for stored auth
    const stored = sessionStorage.getItem('xki_admin_auth');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            if (data.address === ADMIN_WALLET && data.token) {
                authToken = data.token;
                adminAddress = data.address;
                showDashboard();
            }
        } catch (e) {
            sessionStorage.removeItem('xki_admin_auth');
        }
    }
    
    setupEventListeners();
});

function setupEventListeners() {
    elements.btnAuth.addEventListener('click', authenticateWithKeplr);
    elements.btnRefresh.addEventListener('click', loadClaims);
    elements.btnExport.addEventListener('click', exportCSV);
    elements.filterStatus.addEventListener('change', loadClaims);
    elements.btnUpdate.addEventListener('click', updateClaim);
    
    // Import button
    const btnImport = document.getElementById('btn-import');
    if (btnImport) {
        btnImport.addEventListener('click', importSnapshot);
    }
    
    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            closeModal();
        }
    });

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modal.classList.contains('flex')) {
            closeModal();
        }
    });
}

function closeModal() {
    elements.modal.classList.remove('flex');
    elements.modal.classList.add('hidden');
}

function openModal() {
    elements.modal.classList.remove('hidden');
    elements.modal.classList.add('flex');
}

function showError(message) {
    elements.authError.textContent = message;
    elements.authError.classList.remove('hidden');
}

function hideError() {
    elements.authError.classList.add('hidden');
}

// Authenticate with Keplr
async function authenticateWithKeplr() {
    hideError();
    
    const btn = elements.btnAuth;
    btn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Connecting...';
    btn.disabled = true;
    
    if (!window.keplr) {
        const confirmInstall = confirm('Keplr wallet extension is required.\n\nClick OK to open the Chrome Web Store and install Keplr.');
        if (confirmInstall) {
            window.open('https://chrome.google.com/webstore/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap', '_blank');
        }
        resetAuthButton();
        return;
    }
    
    try {
        // Ki Chain RPC is down due to migration, so we add it with a local placeholder
        // The key derivation still works since it's based on the mnemonic + coin type 118
        const chainId = 'kichain-2';
        
        // Try to enable Ki Chain (may already be configured)
        try {
            await window.keplr.enable(chainId);
        } catch (enableErr) {
            console.log('Ki Chain not available, suggesting chain config...');
            // Suggest Ki Chain with a working RPC (or placeholder since we only need signing)
            try {
                await window.keplr.experimentalSuggestChain({
                    chainId: "kichain-2",
                    chainName: "Ki Chain (Migration)",
                    rpc: "https://rpc.cosmos.directory/kichain",
                    rest: "https://rest.cosmos.directory/kichain",
                    bip44: { coinType: 118 },
                    bech32Config: {
                        bech32PrefixAccAddr: "ki",
                        bech32PrefixAccPub: "kipub",
                        bech32PrefixValAddr: "kivaloper",
                        bech32PrefixValPub: "kivaloperpub",
                        bech32PrefixConsAddr: "kivalcons",
                        bech32PrefixConsPub: "kivalconspub"
                    },
                    currencies: [{ 
                        coinDenom: "XKI", 
                        coinMinimalDenom: "uxki", 
                        coinDecimals: 6
                    }],
                    feeCurrencies: [{ 
                        coinDenom: "XKI", 
                        coinMinimalDenom: "uxki", 
                        coinDecimals: 6,
                        gasPriceStep: {
                            low: 0.025,
                            average: 0.03,
                            high: 0.04
                        }
                    }],
                    stakeCurrency: { 
                        coinDenom: "XKI", 
                        coinMinimalDenom: "uxki", 
                        coinDecimals: 6
                    }
                });
                await window.keplr.enable(chainId);
            } catch (suggestErr) {
                console.error('Failed to suggest chain:', suggestErr);
                throw new Error('Could not configure Ki Chain in Keplr. Please ensure Keplr is unlocked and try again.');
            }
        }
        
        // Get the key/address
        const key = await window.keplr.getKey(chainId);
        const address = key.bech32Address;
        
        // Check if authorized
        if (address !== ADMIN_WALLET) {
            showError(`Access denied. This wallet is not authorized.`);
            resetAuthButton();
            return;
        }
        
        // Request signature for authentication
        btn.innerHTML = '<i data-lucide="pen-tool" class="w-4 h-4"></i> Sign to authenticate...';
        
        const timestamp = Date.now();
        const message = `XKI Migration Admin Auth\nTimestamp: ${timestamp}`;
        
        const signature = await window.keplr.signArbitrary(chainId, address, message);
        
        // Verify with backend and get auth token
        const res = await fetch(`${API_BASE}/admin/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address: address,
                message: message,
                signature: signature.signature,
                pubKey: signature.pub_key.value,
                timestamp: timestamp
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Authentication failed');
        }
        
        const data = await res.json();
        authToken = data.token;
        adminAddress = address;
        
        // Store in session
        sessionStorage.setItem('xki_admin_auth', JSON.stringify({
            address: address,
            token: authToken
        }));
        
        showDashboard();
        
    } catch (e) {
        console.error('Auth error:', e);
        showError(e.message || 'Authentication failed');
        resetAuthButton();
    }
}

function resetAuthButton() {
    elements.btnAuth.innerHTML = '<i data-lucide="wallet" class="w-4 h-4"></i> Connect Keplr';
    elements.btnAuth.disabled = false;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showDashboard() {
    elements.authSection.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
    
    // Update wallet status
    elements.walletStatus.textContent = truncate(adminAddress, 16);
    elements.walletStatus.classList.remove('text-gray-400', 'border-white/20');
    elements.walletStatus.classList.add('text-emerald-400', 'border-emerald-900', 'bg-emerald-900/10');
    
    loadStats();
    loadClaims();
    loadImportStats();
}

// API calls with auth token
async function apiCall(endpoint, options = {}) {
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        ...options.headers
    };
    
    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });
    
    if (res.status === 401) {
        // Token expired, clear and reload
        sessionStorage.removeItem('xki_admin_auth');
        location.reload();
        return;
    }
    
    return res;
}

// Load Stats
async function loadStats() {
    try {
        const res = await apiCall('/admin/stats');
        const data = await res.json();
        
        document.getElementById('stat-pending').textContent = data.pending || 0;
        document.getElementById('stat-completed').textContent = data.completed || 0;
        document.getElementById('stat-distributed').textContent = 
            formatNumber(data.distributed || 0);
        document.getElementById('stat-rate').textContent = 
            (data.rate || 0).toFixed(1) + '%';

        updateTimestamp();
    } catch (e) {
        console.error('Error loading stats:', e);
    }
}

function updateTimestamp() {
    if (elements.lastUpdated) {
        elements.lastUpdated.textContent = new Date().toLocaleTimeString();
    }
}

// Load Claims
async function loadClaims() {
    const status = elements.filterStatus.value;
    
    try {
        const url = status === 'all' 
            ? '/admin/claims'
            : `/admin/claims?status=${status}`;
            
        const res = await apiCall(url);
        const claims = await res.json();
        
        renderClaims(claims);
        updateTimestamp();
    } catch (e) {
        console.error('Error loading claims:', e);
    }
}

function renderClaims(claims) {
    if (!claims || claims.length === 0) {
        elements.claimsBody.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');
    elements.claimsBody.innerHTML = claims.map(claim => `
        <tr class="group">
            <td class="py-4 px-6 text-sm text-gray-400">#${claim.id}</td>
            <td class="py-4 px-6">
                <span class="font-mono text-xs text-gray-300" title="${claim.kiAddress}">${truncate(claim.kiAddress, 18)}</span>
            </td>
            <td class="py-4 px-6">
                <span class="font-mono text-xs text-gray-300" title="${claim.ethAddress}">${truncate(claim.ethAddress, 18)}</span>
            </td>
            <td class="py-4 px-6 text-sm text-white font-medium">${formatXKI(claim.amount)} XKI</td>
            <td class="py-4 px-6">
                <span class="text-[10px] uppercase tracking-widest font-bold ${getStatusClass(claim.status)}">${claim.status}</span>
            </td>
            <td class="py-4 px-6 text-xs text-gray-500">${formatDate(claim.createdAt)}</td>
            <td class="py-4 px-6">
                <button onclick="viewClaim(${claim.id})" class="px-3 py-1 border border-white/10 text-[10px] uppercase tracking-widest text-gray-400 hover:bg-white hover:text-black transition-all">
                    View
                </button>
            </td>
        </tr>
    `).join('');
}

function getStatusClass(status) {
    const classes = {
        pending: 'text-amber-400',
        approved: 'text-blue-400',
        completed: 'text-emerald-400',
        rejected: 'text-red-400'
    };
    return classes[status] || 'text-gray-400';
}

// View Claim
async function viewClaim(id) {
    try {
        const res = await apiCall(`/admin/claims/${id}`);
        const claim = await res.json();
        
        currentClaim = claim;
        
        document.getElementById('detail-id').textContent = claim.id;
        document.getElementById('detail-ki').textContent = claim.kiAddress;
        document.getElementById('detail-eth').textContent = claim.ethAddress;
        document.getElementById('detail-amount').textContent = formatXKI(claim.amount);
        document.getElementById('detail-sig').textContent = claim.signature || 'N/A';
        
        const statusEl = document.getElementById('detail-status');
        statusEl.textContent = claim.status.toUpperCase();
        statusEl.className = `text-lg font-bold uppercase tracking-widest ${getStatusClass(claim.status)}`;
        
        document.getElementById('detail-created').textContent = formatDate(claim.createdAt);
        
        document.getElementById('update-status').value = claim.status;
        document.getElementById('update-txhash').value = claim.txHash || '';
        document.getElementById('update-notes').value = claim.adminNotes || '';
        
        openModal();
        
        // Re-init lucide icons in modal
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (e) {
        alert('Error loading claim details');
    }
}

// Update Claim
async function updateClaim() {
    if (!currentClaim) return;
    
    const status = document.getElementById('update-status').value;
    const txHash = document.getElementById('update-txhash').value.trim();
    const adminNotes = document.getElementById('update-notes').value.trim();
    
    if (status === 'completed' && !txHash) {
        alert('TX Hash is required for completed claims');
        return;
    }
    
    try {
        const res = await apiCall(`/admin/claims/${currentClaim.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, txHash, adminNotes })
        });
        
        if (res.ok) {
            alert('Claim updated successfully');
            closeModal();
            loadClaims();
            loadStats();
        } else {
            const err = await res.json();
            alert('Error: ' + (err.error || 'Unknown error'));
        }
    } catch (e) {
        alert('Error updating claim');
    }
}

// Import Snapshot
async function importSnapshot() {
    const csvUrl = document.getElementById('csv-url').value.trim();
    const btn = document.getElementById('btn-import');
    const resultEl = document.getElementById('import-result');
    
    if (!csvUrl) {
        alert('Please enter a CSV URL');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="w-3 h-3 animate-spin"></i> Importing...';
    resultEl.classList.add('hidden');
    
    try {
        const res = await apiCall('/admin/import-snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csvUrl, minBalance: 0 })
        });
        
        const data = await res.json();
        
        if (data.success) {
            resultEl.className = 'mt-4 text-sm text-emerald-400';
            resultEl.textContent = `✓ ${data.message}`;
        } else {
            resultEl.className = 'mt-4 text-sm text-red-400';
            resultEl.textContent = `✗ ${data.error || 'Import failed'}`;
        }
        resultEl.classList.remove('hidden');
        
        // Reload stats
        loadImportStats();
        
    } catch (e) {
        resultEl.className = 'mt-4 text-sm text-red-400';
        resultEl.textContent = `✗ Error: ${e.message}`;
        resultEl.classList.remove('hidden');
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="upload" class="w-3 h-3"></i> Import Snapshot';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Load import stats
async function loadImportStats() {
    try {
        const res = await apiCall('/admin/import-stats');
        const data = await res.json();
        
        const el = document.getElementById('eligible-count');
        if (el) {
            el.textContent = formatNumber(data.eligibleAddresses || 0);
        }
    } catch (e) {
        console.error('Error loading import stats:', e);
    }
}

// Export CSV
async function exportCSV() {
    try {
        const res = await apiCall('/admin/claims');
        const claims = await res.json();
        
        const csv = [
            ['ID', 'Ki Address', 'ETH Address', 'Amount (XKI)', 'Status', 'TX Hash', 'Created'].join(','),
            ...claims.map(c => [
                c.id,
                c.kiAddress,
                c.ethAddress,
                (c.amount / 1000000).toFixed(6),
                c.status,
                c.txHash || '',
                c.createdAt
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xki-claims-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    } catch (e) {
        alert('Error exporting CSV');
    }
}

// Helpers
function truncate(str, len) {
    if (!str) return '';
    if (str.length <= len) return str;
    return str.slice(0, len/2) + '...' + str.slice(-len/2);
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function formatXKI(uxki) {
    if (!uxki) return '—';
    const xki = uxki / 1000000;
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(xki);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Make viewClaim globally accessible
window.viewClaim = viewClaim;

// ============================================
// GOVERNANCE MANAGEMENT
// ============================================

let proposals = [];
let currentProposalDetail = null;

// Load proposals when dashboard loads
async function loadProposals() {
    const tbody = document.getElementById('proposals-body');
    const emptyState = document.getElementById('proposals-empty');
    if (!tbody) return;

    try {
        const res = await apiCall('/governance/admin/proposals');
        proposals = await res.json();
        proposals = proposals.proposals || [];
        renderProposalsTable();
    } catch (e) {
        console.error('Error loading proposals:', e);
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
    }
}

// Render proposals table
function renderProposalsTable() {
    const tbody = document.getElementById('proposals-body');
    const emptyState = document.getElementById('proposals-empty');
    if (!tbody) return;

    if (proposals.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = proposals.map(p => {
        const statusColors = {
            'draft': 'text-gray-400 bg-gray-900/50',
            'active': 'text-green-400 bg-green-900/30',
            'ended': 'text-yellow-400 bg-yellow-900/30',
            'passed': 'text-blue-400 bg-blue-900/30',
            'rejected': 'text-red-400 bg-red-900/30'
        };

        const totalVotes = BigInt(p.votesFor) + BigInt(p.votesAgainst) + BigInt(p.votesAbstain);
        const forPercent = totalVotes > 0n ? Number((BigInt(p.votesFor) * 100n) / totalVotes) : 0;
        const againstPercent = totalVotes > 0n ? Number((BigInt(p.votesAgainst) * 100n) / totalVotes) : 0;

        return `
            <tr class="hover:bg-white/5 transition-colors cursor-pointer" onclick="viewProposal(${p.id})">
                <td class="py-4 px-6 text-sm font-mono text-gray-400">${p.proposalNumber}</td>
                <td class="py-4 px-6 text-sm text-white">${escapeHtml(p.title)}</td>
                <td class="py-4 px-6">
                    <span class="text-[10px] uppercase tracking-wider px-2 py-1 ${statusColors[p.status] || 'text-gray-400 bg-gray-900/50'}">${p.status}</span>
                </td>
                <td class="py-4 px-6">
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-green-400">${forPercent}%</span>
                        <div class="w-16 h-1 bg-gray-800 flex overflow-hidden">
                            <div class="bg-green-500" style="width: ${forPercent}%"></div>
                            <div class="bg-red-500" style="width: ${againstPercent}%"></div>
                        </div>
                        <span class="text-xs text-red-400">${againstPercent}%</span>
                    </div>
                    <div class="text-[10px] text-gray-500 mt-1">${p.voterCount} voters</div>
                </td>
                <td class="py-4 px-6 text-sm text-gray-400">${formatDate(p.endDate)}</td>
                <td class="py-4 px-6">
                    <button onclick="event.stopPropagation(); editProposal(${p.id})" class="px-3 py-1 text-[10px] uppercase tracking-wider border border-white/20 text-gray-400 hover:text-white hover:border-white/40 transition-all mr-2">
                        Edit
                    </button>
                    <button onclick="event.stopPropagation(); viewProposal(${p.id})" class="px-3 py-1 text-[10px] uppercase tracking-wider border border-white/20 text-gray-400 hover:text-white hover:border-white/40 transition-all">
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Open new proposal modal
function openNewProposalModal() {
    document.getElementById('proposal-modal-title').textContent = 'New Proposal';
    document.getElementById('proposal-id').value = '';
    document.getElementById('proposal-title').value = '';
    document.getElementById('proposal-description').value = '';
    document.getElementById('proposal-status').value = 'draft';
    document.getElementById('btn-delete-proposal').classList.add('hidden');
    
    // Set default dates (start: now, end: 7 days from now)
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    document.getElementById('proposal-start').value = now.toISOString().slice(0, 16);
    document.getElementById('proposal-end').value = end.toISOString().slice(0, 16);
    
    document.getElementById('proposal-modal').classList.remove('hidden');
    document.getElementById('proposal-modal').classList.add('flex');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Edit proposal
function editProposal(id) {
    const proposal = proposals.find(p => p.id === id);
    if (!proposal) return;

    document.getElementById('proposal-modal-title').textContent = 'Edit Proposal';
    document.getElementById('proposal-id').value = proposal.id;
    document.getElementById('proposal-title').value = proposal.title;
    document.getElementById('proposal-description').value = proposal.description;
    document.getElementById('proposal-status').value = proposal.status;
    document.getElementById('proposal-start').value = proposal.startDate.slice(0, 16);
    document.getElementById('proposal-end').value = proposal.endDate.slice(0, 16);
    
    // Show delete button only for drafts
    if (proposal.status === 'draft') {
        document.getElementById('btn-delete-proposal').classList.remove('hidden');
    } else {
        document.getElementById('btn-delete-proposal').classList.add('hidden');
    }
    
    document.getElementById('proposal-modal').classList.remove('hidden');
    document.getElementById('proposal-modal').classList.add('flex');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Close proposal modal
function closeProposalModal() {
    document.getElementById('proposal-modal').classList.add('hidden');
    document.getElementById('proposal-modal').classList.remove('flex');
}

// Save proposal
async function saveProposal() {
    const id = document.getElementById('proposal-id').value;
    const title = document.getElementById('proposal-title').value.trim();
    const description = document.getElementById('proposal-description').value.trim();
    const startDate = document.getElementById('proposal-start').value;
    const endDate = document.getElementById('proposal-end').value;
    const status = document.getElementById('proposal-status').value;

    if (!title || !description || !startDate || !endDate) {
        alert('Please fill in all required fields');
        return;
    }

    const data = {
        title,
        description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status
    };

    try {
        const btn = document.getElementById('btn-save-proposal');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        let res;
        if (id) {
            res = await apiCall(`/governance/admin/proposals/${id}`, 'PUT', data);
        } else {
            res = await apiCall('/governance/admin/proposals', 'POST', data);
        }

        const result = await res.json();
        
        if (result.success) {
            closeProposalModal();
            loadProposals();
        } else {
            alert('Error: ' + (result.error || 'Unknown error'));
        }

        btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Save Proposal';
        btn.disabled = false;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        alert('Error saving proposal: ' + e.message);
        const btn = document.getElementById('btn-save-proposal');
        btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Save Proposal';
        btn.disabled = false;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// Delete proposal
async function deleteProposal() {
    const id = document.getElementById('proposal-id').value;
    if (!id) return;

    if (!confirm('Are you sure you want to delete this proposal?')) return;

    try {
        const res = await apiCall(`/governance/admin/proposals/${id}`, 'DELETE');
        const result = await res.json();

        if (result.success) {
            closeProposalModal();
            loadProposals();
        } else {
            alert('Error: ' + (result.error || 'Only draft proposals can be deleted'));
        }
    } catch (e) {
        alert('Error deleting proposal: ' + e.message);
    }
}

// View proposal details with votes
async function viewProposal(id) {
    try {
        const res = await apiCall(`/governance/proposals/${id}/votes`);
        const data = await res.json();
        
        currentProposalDetail = data.proposal;
        const votes = data.votes || [];

        // Update modal content
        document.getElementById('detail-proposal-number').textContent = data.proposal.proposalNumber;
        document.getElementById('detail-proposal-title').textContent = data.proposal.title;

        // Calculate percentages
        const totalPower = BigInt(data.proposal.votesFor) + BigInt(data.proposal.votesAgainst) + BigInt(data.proposal.votesAbstain);
        const forPct = totalPower > 0n ? Number((BigInt(data.proposal.votesFor) * 100n) / totalPower) : 0;
        const againstPct = totalPower > 0n ? Number((BigInt(data.proposal.votesAgainst) * 100n) / totalPower) : 0;
        const abstainPct = totalPower > 0n ? Number((BigInt(data.proposal.votesAbstain) * 100n) / totalPower) : 0;

        document.getElementById('detail-votes-for').textContent = formatXKI(data.proposal.votesFor);
        document.getElementById('detail-votes-for-percent').textContent = forPct + '%';
        document.getElementById('detail-votes-against').textContent = formatXKI(data.proposal.votesAgainst);
        document.getElementById('detail-votes-against-percent').textContent = againstPct + '%';
        document.getElementById('detail-votes-abstain').textContent = formatXKI(data.proposal.votesAbstain);
        document.getElementById('detail-votes-abstain-percent').textContent = abstainPct + '%';
        document.getElementById('detail-voter-count').textContent = data.proposal.voterCount;
        document.getElementById('detail-total-power').textContent = formatXKI(totalPower.toString()) + ' XKI';

        // Render votes list
        const votesList = document.getElementById('votes-list');
        if (votes.length === 0) {
            votesList.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No votes yet</p>';
        } else {
            votesList.innerHTML = votes.slice(0, 20).map(v => {
                const voteColors = {
                    'for': 'text-green-400',
                    'against': 'text-red-400',
                    'abstain': 'text-gray-400'
                };
                return `
                    <div class="flex justify-between items-center py-2 border-b border-white/5">
                        <span class="font-mono text-xs text-gray-400">${truncate(v.kiAddress, 20)}</span>
                        <span class="${voteColors[v.voteChoice]} text-xs uppercase tracking-wider">${v.voteChoice}</span>
                        <span class="text-xs text-gray-500">${formatXKI(v.votingPower)} XKI</span>
                    </div>
                `;
            }).join('');
        }

        // Show/hide finalize button based on status
        const finalizeBtn = document.getElementById('btn-finalize-proposal');
        if (data.proposal.status === 'ended' || data.proposal.status === 'active') {
            finalizeBtn.classList.remove('hidden');
        } else {
            finalizeBtn.classList.add('hidden');
        }

        document.getElementById('proposal-detail-modal').classList.remove('hidden');
        document.getElementById('proposal-detail-modal').classList.add('flex');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        console.error('Error loading proposal:', e);
        alert('Error loading proposal details');
    }
}

// Close proposal detail modal
function closeProposalDetailModal() {
    document.getElementById('proposal-detail-modal').classList.add('hidden');
    document.getElementById('proposal-detail-modal').classList.remove('flex');
    currentProposalDetail = null;
}

// Finalize proposal
async function finalizeProposal() {
    if (!currentProposalDetail) return;

    if (!confirm('Are you sure you want to finalize this proposal? This will determine if it passed or was rejected.')) return;

    try {
        const res = await apiCall(`/governance/admin/proposals/${currentProposalDetail.id}/finalize`, 'POST');
        const result = await res.json();

        if (result.success) {
            alert('Proposal finalized as: ' + result.proposal.status.toUpperCase());
            closeProposalDetailModal();
            loadProposals();
        } else {
            alert('Error: ' + (result.error || 'Unknown error'));
        }
    } catch (e) {
        alert('Error finalizing proposal: ' + e.message);
    }
}

// Helper: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup governance event listeners
function setupGovernanceListeners() {
    // New proposal button
    const btnNew = document.getElementById('btn-new-proposal');
    if (btnNew) btnNew.addEventListener('click', openNewProposalModal);

    // Close proposal modal
    document.querySelectorAll('.close-proposal').forEach(btn => {
        btn.addEventListener('click', closeProposalModal);
    });

    // Close proposal detail modal
    document.querySelectorAll('.close-proposal-detail').forEach(btn => {
        btn.addEventListener('click', closeProposalDetailModal);
    });

    // Save proposal
    const btnSave = document.getElementById('btn-save-proposal');
    if (btnSave) btnSave.addEventListener('click', saveProposal);

    // Delete proposal
    const btnDelete = document.getElementById('btn-delete-proposal');
    if (btnDelete) btnDelete.addEventListener('click', deleteProposal);

    // Edit from detail modal
    const btnEdit = document.getElementById('btn-edit-proposal');
    if (btnEdit) btnEdit.addEventListener('click', () => {
        if (currentProposalDetail) {
            closeProposalDetailModal();
            editProposal(currentProposalDetail.id);
        }
    });

    // Finalize
    const btnFinalize = document.getElementById('btn-finalize-proposal');
    if (btnFinalize) btnFinalize.addEventListener('click', finalizeProposal);
}

// Make functions globally accessible
window.viewProposal = viewProposal;
window.editProposal = editProposal;

// Modify showDashboard to also load proposals
const originalShowDashboard = showDashboard;
showDashboard = function() {
    originalShowDashboard();
    setTimeout(() => {
        loadProposals();
        setupGovernanceListeners();
    }, 100);
};
