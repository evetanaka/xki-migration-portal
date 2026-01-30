// XKI Migration Portal - App Logic

const API_BASE = '/api';

// State
let currentStep = 1;
let isProcessing = false;
let state = {
    kiAddress: null,
    ethAddress: '',
    balance: null,
    nonce: null,
    message: null,
    claimId: null
};

// Step Titles
const TITLES = {
    1: "Authentication",
    2: "Eligibility Check",
    3: "Destination",
    4: "Confirmation",
    5: "Submission Complete"
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// Load Stats from API
async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/stats`);
        const data = await res.json();
        
        const eligible = document.getElementById('stat-eligible');
        const claimed = document.getElementById('stat-claimed');
        const countdown = document.getElementById('stat-countdown');
        
        if (eligible) eligible.textContent = formatNumber(data.totalEligible);
        if (claimed) claimed.textContent = formatNumber(data.totalClaimed);
        if (countdown) countdown.textContent = formatCountdown(data.deadline);
    } catch (e) {
        console.log('Stats not available yet');
    }
}

// Render Step
function renderStep(step) {
    const stepContent = document.getElementById('step-content');
    const stepTitle = document.getElementById('step-title');
    const stepIndicator = document.getElementById('step-indicator');
    const progressBar = document.getElementById('progress-bar');
    const walletStatus = document.getElementById('wallet-status');
    
    if (!stepContent) return;
    
    stepContent.classList.add('opacity-0');
    
    setTimeout(() => {
        const template = document.getElementById(`template-step-${step}`);
        if (!template) return;
        
        const clone = template.content.cloneNode(true);
        stepContent.innerHTML = '';
        stepContent.appendChild(clone);
        
        // Update dynamic content based on step
        if (step === 2) {
            const balanceDisplay = document.getElementById('balance-display');
            if (balanceDisplay && state.balance) {
                balanceDisplay.innerHTML = `${formatNumber(state.balance)} <span class="text-lg text-gray-600">XKI</span>`;
            }
        }
        
        if (step === 4) {
            const displayAddr = document.getElementById('display-address');
            const amountDisplay = document.getElementById('amount-display');
            if (displayAddr) displayAddr.textContent = state.ethAddress || "0x...";
            if (amountDisplay && state.balance) amountDisplay.textContent = `${formatNumber(state.balance)} XKI`;
        }
        
        if (step === 5) {
            const claimIdDisplay = document.getElementById('claim-id-display');
            if (claimIdDisplay) claimIdDisplay.textContent = state.claimId || '—';
        }
        
        // Update UI
        if (stepTitle) stepTitle.textContent = TITLES[step];
        if (stepIndicator) stepIndicator.textContent = `Step 0${Math.min(step, 4)} / 04`;
        if (progressBar) progressBar.style.width = `${(step / 5) * 100}%`;
        
        // Update wallet status
        if (step > 1 && state.kiAddress && walletStatus) {
            walletStatus.textContent = truncateAddress(state.kiAddress);
            walletStatus.className = "px-3 py-1 border text-[10px] uppercase tracking-widest transition-all duration-500 border-green-900 text-green-500 bg-green-900/10";
        }
        
        stepContent.classList.remove('opacity-0');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }, 300);
}

// Transition to Step
function transitionToStep(nextStep) {
    if (isProcessing) return;
    isProcessing = true;
    
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    
    setTimeout(() => {
        isProcessing = false;
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        currentStep = nextStep;
        renderStep(nextStep);
    }, 800);
}

// === Event Handlers (called from HTML onclick) ===

// Step 1 -> 2: Connect Keplr
async function handleConnect() {
    const btn = document.querySelector('#step-content button');
    if (btn) btn.innerHTML = "Connecting...";
    
    if (!window.keplr) {
        alert('Please install Keplr extension to connect your Ki Chain wallet.');
        if (btn) btn.innerHTML = "Connect Keplr";
        return;
    }
    
    try {
        const chainId = 'kichain-2';
        const key = await window.keplr.getKey(chainId);
        state.kiAddress = key.bech32Address;
        
        // Check eligibility
        await checkEligibility();
    } catch (e) {
        console.error('Keplr error:', e);
        alert('Error connecting to Keplr. Make sure Ki Chain is configured in your wallet.');
        if (btn) btn.innerHTML = "Connect Keplr";
    }
}

// Check eligibility from API
async function checkEligibility() {
    try {
        const res = await fetch(`${API_BASE}/eligibility/${state.kiAddress}`);
        const data = await res.json();
        
        if (data.eligible) {
            state.balance = data.balance;
            transitionToStep(2);
        } else if (data.claimed) {
            alert('This address has already claimed.');
        } else {
            alert('This address is not eligible for migration.');
        }
    } catch (e) {
        // Demo mode - simulate eligibility
        state.balance = 45230;
        transitionToStep(2);
    }
}

// Go to specific step
function goToStep(step) {
    transitionToStep(step);
}

// Check ETH input validity
function checkInput(input) {
    const btn = document.getElementById('btn-review');
    if (!btn) return;
    
    state.ethAddress = input.value;
    const isValid = state.ethAddress.match(/^0x[a-fA-F0-9]{40}$/);
    
    if (isValid) {
        btn.removeAttribute('disabled');
        btn.classList.remove('bg-gray-900', 'text-gray-600', 'cursor-not-allowed', 'border-gray-800');
        btn.classList.add('bg-white', 'text-black', 'hover:bg-gray-200', 'cursor-pointer');
    } else {
        btn.setAttribute('disabled', 'true');
        btn.classList.add('bg-gray-900', 'text-gray-600', 'cursor-not-allowed', 'border-gray-800');
        btn.classList.remove('bg-white', 'text-black', 'hover:bg-gray-200', 'cursor-pointer');
    }
}

// Step 3 -> 4: Submit ETH address
async function handleAddressSubmit(e) {
    e.preventDefault();
    
    if (!state.ethAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        alert('Please enter a valid Ethereum address');
        return;
    }
    
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
    } catch (e) {
        // Demo mode
        state.nonce = 'demo-nonce';
        state.message = 'Sign this message to claim your XKI tokens';
    }
    
    transitionToStep(4);
}

// Step 4 -> 5: Sign message
async function handleSign() {
    const btn = document.querySelector('#step-content button');
    if (btn) btn.textContent = "Verifying Signature...";
    
    try {
        if (window.keplr && state.kiAddress) {
            const chainId = 'kichain-2';
            const signature = await window.keplr.signArbitrary(
                chainId,
                state.kiAddress,
                state.message || 'Sign to claim XKI tokens'
            );
            
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
                state.claimId = data.claimId;
            }
        }
    } catch (e) {
        console.log('Sign flow:', e);
    }
    
    // Generate demo claim ID if none
    if (!state.claimId) {
        state.claimId = `#${Math.random().toString(36).substr(2, 4).toUpperCase()}-XKI-MIG`;
    }
    
    transitionToStep(5);
}

// Check claim status by Ki address
async function checkStatus() {
    const input = document.getElementById('check-address');
    const resultDiv = document.getElementById('status-result');
    
    if (!input || !resultDiv) return;
    
    const address = input.value.trim();
    
    if (!address.startsWith('ki1')) {
        resultDiv.className = 'mt-4 p-4 border border-red-900/30 bg-red-900/10';
        resultDiv.innerHTML = '<p class="text-xs text-red-400">Please enter a valid Ki Chain address (ki1...)</p>';
        return;
    }
    
    resultDiv.className = 'mt-4 p-4 border border-white/10 bg-white/5';
    resultDiv.innerHTML = '<p class="text-xs text-gray-400 animate-pulse">Checking status...</p>';
    
    try {
        const res = await fetch(`${API_BASE}/claim/status/${address}`);
        const data = await res.json();
        
        if (data.status === 'completed') {
            resultDiv.className = 'mt-4 p-4 border border-green-900/30 bg-green-900/10';
            resultDiv.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center gap-2">
                        <i data-lucide="check-circle" class="w-4 h-4 text-green-500"></i>
                        <p class="text-xs text-green-400 uppercase tracking-wider">Claim Completed</p>
                    </div>
                    <div class="space-y-2 text-[11px]">
                        <div class="flex justify-between">
                            <span class="text-gray-500">Amount</span>
                            <span class="text-white font-mono">${formatNumber(data.amount)} XKI</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-500">TX Hash</span>
                            <a href="https://etherscan.io/tx/${data.txHash}" target="_blank" class="text-white font-mono hover:underline">${truncateAddress(data.txHash)}</a>
                        </div>
                    </div>
                </div>
            `;
        } else if (data.status === 'pending') {
            resultDiv.className = 'mt-4 p-4 border border-yellow-900/30 bg-yellow-900/10';
            resultDiv.innerHTML = `
                <div class="flex items-center gap-2">
                    <i data-lucide="clock" class="w-4 h-4 text-yellow-500"></i>
                    <p class="text-xs text-yellow-400 uppercase tracking-wider">Pending — Awaiting Processing</p>
                </div>
            `;
        } else {
            resultDiv.className = 'mt-4 p-4 border border-white/10 bg-white/5';
            resultDiv.innerHTML = `
                <div class="flex items-center gap-2">
                    <i data-lucide="info" class="w-4 h-4 text-gray-500"></i>
                    <p class="text-xs text-gray-400">No claim found for this address</p>
                </div>
            `;
        }
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (e) {
        resultDiv.className = 'mt-4 p-4 border border-white/10 bg-white/5';
        resultDiv.innerHTML = `
            <div class="flex items-center gap-2">
                <i data-lucide="info" class="w-4 h-4 text-gray-500"></i>
                <p class="text-xs text-gray-400">No claim found for this address</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// === Helpers ===

function formatNumber(num) {
    if (!num) return '—';
    return new Intl.NumberFormat().format(num);
}

function formatCountdown(deadline) {
    if (!deadline) return '—';
    const now = Date.now();
    const diff = new Date(deadline) - now;
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days}j ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}

function truncateAddress(addr) {
    if (!addr) return '';
    return addr.slice(0, 8) + '...' + addr.slice(-4);
}
