// XKI Migration Admin Dashboard - Keplr Auth

const API_BASE = '/api';

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
            <td class="py-4 px-6 text-sm text-white font-medium">${formatNumber(claim.amount)}</td>
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
        document.getElementById('detail-amount').textContent = formatNumber(claim.amount);
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

// Export CSV
async function exportCSV() {
    try {
        const res = await apiCall('/admin/claims');
        const claims = await res.json();
        
        const csv = [
            ['ID', 'Ki Address', 'ETH Address', 'Amount', 'Status', 'TX Hash', 'Created'].join(','),
            ...claims.map(c => [
                c.id,
                c.kiAddress,
                c.ethAddress,
                c.amount,
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

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Make viewClaim globally accessible
window.viewClaim = viewClaim;
