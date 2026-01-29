// XKI Migration Portal - Main JS

const API_BASE = '/api'; // Will be configured for production

// State
let state = {
    kiAddress: null,
    ethAddress: null,
    balance: null,
    nonce: null,
    message: null
};

// DOM Elements
const elements = {
    btnConnectKeplr: document.getElementById('btn-connect-keplr'),
    kiAddress: document.getElementById('ki-address'),
    eligibleBalance: document.getElementById('eligible-balance'),
    eligibilityStatus: document.getElementById('eligibility-status'),
    ethAddressInput: document.getElementById('eth-address'),
    btnPrepare: document.getElementById('btn-prepare'),
    btnSign: document.getElementById('btn-sign'),
    claimId: document.getElementById('claim-id'),
    confirmedEth: document.getElementById('confirmed-eth'),
    btnCheckStatus: document.getElementById('btn-check-status'),
    checkAddress: document.getElementById('check-address'),
    statusResult: document.getElementById('status-result')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    setupEventListeners();
});

function setupEventListeners() {
    elements.btnConnectKeplr.addEventListener('click', connectKeplr);
    elements.btnPrepare.addEventListener('click', prepareClaim);
    elements.btnSign.addEventListener('click', signMessage);
    elements.btnCheckStatus.addEventListener('click', checkStatus);
}

// Load Stats
async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/stats`);
        const data = await res.json();
        document.getElementById('stat-eligible').textContent = 
            formatNumber(data.totalEligible) + ' XKI';
        document.getElementById('stat-claimed').textContent = 
            formatNumber(data.totalClaimed) + ' XKI';
        document.getElementById('stat-countdown').textContent = 
            formatCountdown(data.deadline);
    } catch (e) {
        console.log('Stats not available yet');
    }
}

// Connect Keplr
async function connectKeplr() {
    if (!window.keplr) {
        alert('Please install Keplr extension');
        return;
    }

    try {
        // Ki Chain config (even if chain is offline, we need the key)
        const chainId = 'kichain-2';
        
        // Try to get the key directly
        const key = await window.keplr.getKey(chainId);
        state.kiAddress = key.bech32Address;
        
        elements.kiAddress.textContent = state.kiAddress;
        showStep(2);
        
        // Check eligibility
        await checkEligibility();
    } catch (e) {
        console.error('Keplr connection error:', e);
        alert('Error connecting to Keplr. Make sure you have the Ki Chain configured.');
    }
}

// Check Eligibility
async function checkEligibility() {
    try {
        const res = await fetch(`${API_BASE}/eligibility/${state.kiAddress}`);
        const data = await res.json();
        
        if (data.eligible) {
            state.balance = data.balance;
            elements.eligibleBalance.textContent = formatNumber(data.balance);
            elements.eligibilityStatus.textContent = '✅ You are eligible!';
            elements.eligibilityStatus.style.color = '#10b981';
            showStep(3);
        } else if (data.claimed) {
            elements.eligibilityStatus.textContent = '⚠️ Already claimed';
            elements.eligibilityStatus.style.color = '#f59e0b';
        } else {
            elements.eligibilityStatus.textContent = '❌ Not eligible';
            elements.eligibilityStatus.style.color = '#ef4444';
        }
    } catch (e) {
        elements.eligibilityStatus.textContent = 'Error checking eligibility';
    }
}

// Prepare Claim
async function prepareClaim() {
    const ethAddress = elements.ethAddressInput.value.trim();
    
    if (!ethAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        alert('Please enter a valid Ethereum address');
        return;
    }
    
    state.ethAddress = ethAddress;
    
    try {
        const res = await fetch(`${API_BASE}/claim/prepare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kiAddress: state.kiAddress,
                ethAddress: state.ethAddress
            })
        });
        
        const data = await res.json();
        state.nonce = data.nonce;
        state.message = data.message;
        
        showStep(4);
    } catch (e) {
        alert('Error preparing claim');
    }
}

// Sign Message
async function signMessage() {
    try {
        const chainId = 'kichain-2';
        
        // Sign arbitrary message with Keplr
        const signature = await window.keplr.signArbitrary(
            chainId,
            state.kiAddress,
            state.message
        );
        
        // Submit claim
        const res = await fetch(`${API_BASE}/claim/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kiAddress: state.kiAddress,
                ethAddress: state.ethAddress,
                signature: signature.signature,
                pubKey: signature.pub_key.value,
                nonce: state.nonce
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            elements.claimId.textContent = data.claimId;
            elements.confirmedEth.textContent = state.ethAddress;
            showStep(5);
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        console.error('Sign error:', e);
        alert('Error signing message');
    }
}

// Check Status
async function checkStatus() {
    const address = elements.checkAddress.value.trim();
    
    if (!address.startsWith('ki1')) {
        alert('Please enter a valid Ki Chain address');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/claim/status/${address}`);
        const data = await res.json();
        
        let html = '';
        if (data.status === 'completed') {
            html = `<p style="color: #10b981;">✅ Completed</p>
                    <p>TX: <a href="https://etherscan.io/tx/${data.txHash}" target="_blank">${data.txHash}</a></p>`;
        } else if (data.status === 'pending') {
            html = `<p style="color: #f59e0b;">⏳ Pending - awaiting processing</p>`;
        } else {
            html = `<p style="color: #94a3b8;">No claim found for this address</p>`;
        }
        
        elements.statusResult.innerHTML = html;
    } catch (e) {
        elements.statusResult.innerHTML = '<p>Error checking status</p>';
    }
}

// Helpers
function showStep(stepNum) {
    document.querySelectorAll('.step').forEach((el, i) => {
        el.classList.toggle('active', i < stepNum);
    });
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function formatCountdown(deadline) {
    const now = Date.now();
    const diff = new Date(deadline) - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days} days`;
}
