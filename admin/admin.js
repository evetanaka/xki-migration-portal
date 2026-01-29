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
    filterStatus: document.getElementById('filter-status'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnExport: document.getElementById('btn-export'),
    claimsBody: document.getElementById('claims-body'),
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
    elements.btnRefresh.addEventListener('click', loadClaims);
    elements.btnExport.addEventListener('click', exportCSV);
    elements.filterStatus.addEventListener('change', loadClaims);
    elements.btnUpdate.addEventListener('click', updateClaim);
    
    // Modal close
    document.querySelector('.close').addEventListener('click', () => {
        elements.modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            elements.modal.style.display = 'none';
        }
    });
    
    // Enter key on API key input
    elements.apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') authenticate();
    });
}

// Authenticate
async function authenticate() {
    apiKey = elements.apiKeyInput.value.trim();
    
    if (!apiKey) {
        alert('Please enter an API key');
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
            alert('Invalid API key');
        }
    } catch (e) {
        alert('Error authenticating');
    }
}

function showDashboard() {
    elements.authSection.style.display = 'none';
    elements.dashboard.style.display = 'block';
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
            formatNumber(data.distributed || 0) + ' XKI';
        document.getElementById('stat-rate').textContent = 
            (data.rate || 0).toFixed(1) + '%';
    } catch (e) {
        console.error('Error loading stats:', e);
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
    } catch (e) {
        console.error('Error loading claims:', e);
    }
}

function renderClaims(claims) {
    elements.claimsBody.innerHTML = claims.map(claim => `
        <tr>
            <td>${claim.id}</td>
            <td class="address" title="${claim.kiAddress}">${truncate(claim.kiAddress, 15)}</td>
            <td class="address" title="${claim.ethAddress}">${truncate(claim.ethAddress, 15)}</td>
            <td>${formatNumber(claim.amount)}</td>
            <td class="status-${claim.status}">${claim.status.toUpperCase()}</td>
            <td>${formatDate(claim.createdAt)}</td>
            <td>
                <button class="btn btn-secondary btn-action" onclick="viewClaim(${claim.id})">
                    View
                </button>
            </td>
        </tr>
    `).join('');
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
        document.getElementById('detail-sig').textContent = truncate(claim.signature, 50);
        document.getElementById('detail-status').textContent = claim.status.toUpperCase();
        document.getElementById('detail-created').textContent = formatDate(claim.createdAt);
        
        document.getElementById('update-status').value = claim.status;
        document.getElementById('update-txhash').value = claim.txHash || '';
        document.getElementById('update-notes').value = claim.adminNotes || '';
        
        elements.modal.style.display = 'block';
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
        const res = await fetch(`${API_BASE}/admin/claims/${currentClaim.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify({ status, txHash, adminNotes })
        });
        
        if (res.ok) {
            alert('Claim updated successfully');
            elements.modal.style.display = 'none';
            loadClaims();
            loadStats();
        } else {
            const err = await res.json();
            alert('Error: ' + (err.message || 'Unknown error'));
        }
    } catch (e) {
        alert('Error updating claim');
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
    return new Date(dateStr).toLocaleString();
}

// Make viewClaim globally accessible
window.viewClaim = viewClaim;
