// XKI Migration Admin Dashboard

const API_BASE = '/api';
let apiKey = null;
let currentClaim = null;

// DOM Elements
const elements = {
    authSection: document.getElementById('auth-section'),
    dashboard: document.getElementById('dashboard'),
    apiKeyInput: document.getElementById('api-key'),
    btnAuth: document.getElementById('btn-auth'),
    btnLogout: document.getElementById('btn-logout'),
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
    // Check for stored API key
    const storedKey = localStorage.getItem('xki_admin_key');
    if (storedKey) {
        apiKey = storedKey;
        showDashboard();
    }
    
    setupEventListeners();
});

function setupEventListeners() {
    elements.btnAuth.addEventListener('click', authenticate);
    elements.btnLogout.addEventListener('click', logout);
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
    
    // Enter key on API key input
    elements.apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') authenticate();
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

// Authenticate
async function authenticate() {
    apiKey = elements.apiKeyInput.value.trim();
    
    if (!apiKey) {
        showNotification('Please enter an API key', 'error');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/admin/claims?status=pending`, {
            headers: { 'X-API-Key': apiKey }
        });
        
        if (res.ok) {
            localStorage.setItem('xki_admin_key', apiKey);
            showDashboard();
        } else {
            showNotification('Invalid API key', 'error');
        }
    } catch (e) {
        showNotification('Error authenticating', 'error');
    }
}

function logout() {
    localStorage.removeItem('xki_admin_key');
    apiKey = null;
    elements.dashboard.classList.add('hidden');
    elements.authSection.classList.remove('hidden');
    elements.btnLogout.classList.add('hidden');
    elements.apiKeyInput.value = '';
}

function showDashboard() {
    elements.authSection.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
    elements.btnLogout.classList.remove('hidden');
    loadStats();
    loadClaims();
}

// Load Stats
async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/admin/stats`, {
            headers: { 'X-API-Key': apiKey }
        });
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
            ? `${API_BASE}/admin/claims`
            : `${API_BASE}/admin/claims?status=${status}`;
            
        const res = await fetch(url, {
            headers: { 'X-API-Key': apiKey }
        });
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
        const res = await fetch(`${API_BASE}/admin/claims/${id}`, {
            headers: { 'X-API-Key': apiKey }
        });
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
        showNotification('Error loading claim details', 'error');
    }
}

// Update Claim
async function updateClaim() {
    if (!currentClaim) return;
    
    const status = document.getElementById('update-status').value;
    const txHash = document.getElementById('update-txhash').value.trim();
    const adminNotes = document.getElementById('update-notes').value.trim();
    
    if (status === 'completed' && !txHash) {
        showNotification('TX Hash is required for completed claims', 'error');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/admin/claims/${currentClaim.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify({ status, txHash, adminNotes })
        });
        
        if (res.ok) {
            showNotification('Claim updated successfully', 'success');
            closeModal();
            loadClaims();
            loadStats();
        } else {
            const err = await res.json();
            showNotification('Error: ' + (err.message || 'Unknown error'), 'error');
        }
    } catch (e) {
        showNotification('Error updating claim', 'error');
    }
}

// Export CSV
async function exportCSV() {
    try {
        const res = await fetch(`${API_BASE}/admin/claims`, {
            headers: { 'X-API-Key': apiKey }
        });
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
        
        showNotification('CSV exported successfully', 'success');
    } catch (e) {
        showNotification('Error exporting CSV', 'error');
    }
}

// Simple notification
function showNotification(message, type = 'info') {
    // For now, use alert. Could be replaced with a toast system.
    alert(message);
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
