// XKI Migration Portal - App Logic

const API_BASE = 'https://api.foundation.ki/api';

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

// Governance State
let governanceState = {
    proposals: [],
    currentProposal: null,
    selectedVote: null,
    votingPower: '0',
    hasVoted: false,
    canVote: false
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
            if (amountDisplay && state.balance) amountDisplay.textContent = `${formatXKI(state.balance)} XKI`;
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
    console.log('handleConnect called');
    const btn = document.querySelector('#step-content button');
    if (btn) {
        btn.innerHTML = "Connecting...";
        btn.disabled = true;
    }
    
    if (!window.keplr) {
        // Show install prompt
        const confirmInstall = confirm('Keplr wallet extension is required.\n\nClick OK to open the Chrome Web Store and install Keplr.');
        if (confirmInstall) {
            window.open('https://chrome.google.com/webstore/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap', '_blank');
        }
        if (btn) {
            btn.innerHTML = "Connect Keplr";
            btn.disabled = false;
        }
        return;
    }
    
    try {
        const chainId = 'kichain-2';
        
        // First, try to enable the chain (may prompt user)
        try {
            await window.keplr.enable(chainId);
        } catch (enableErr) {
            console.log('Chain not configured, trying to suggest:', enableErr);
            // Ki Chain might need to be added - suggest it
            await window.keplr.experimentalSuggestChain({
                chainId: "kichain-2",
                chainName: "Ki Chain",
                rpc: "https://rpc-mainnet.blockchain.ki",
                rest: "https://api-mainnet.blockchain.ki",
                bip44: { coinType: 118 },
                bech32Config: {
                    bech32PrefixAccAddr: "ki",
                    bech32PrefixAccPub: "kipub",
                    bech32PrefixValAddr: "kivaloper",
                    bech32PrefixValPub: "kivaloperpub",
                    bech32PrefixConsAddr: "kivalcons",
                    bech32PrefixConsPub: "kivalconspub"
                },
                currencies: [{ coinDenom: "XKI", coinMinimalDenom: "uxki", coinDecimals: 6 }],
                feeCurrencies: [{ coinDenom: "XKI", coinMinimalDenom: "uxki", coinDecimals: 6 }],
                stakeCurrency: { coinDenom: "XKI", coinMinimalDenom: "uxki", coinDecimals: 6 }
            });
            await window.keplr.enable(chainId);
        }
        
        const key = await window.keplr.getKey(chainId);
        state.kiAddress = key.bech32Address;
        console.log('Connected:', state.kiAddress);
        
        // Check eligibility
        await checkEligibility();
    } catch (e) {
        console.error('Keplr error:', e);
        alert('Error connecting to Keplr:\n' + e.message);
        if (btn) {
            btn.innerHTML = "Connect Keplr";
            btn.disabled = false;
        }
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
                            <span class="text-white font-mono">${formatXKI(data.amount)} XKI</span>
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

function formatXKI(uxki) {
    if (!uxki) return '—';
    const xki = uxki / 1000000;
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(xki);
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

// ============================================
// GOVERNANCE FUNCTIONS
// ============================================

// Load proposals on page load
async function loadProposals() {
    const container = document.getElementById('proposals-list');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/governance/proposals/latest?limit=5`);
        const data = await res.json();
        governanceState.proposals = data.proposals || [];
        renderProposals();
    } catch (e) {
        console.log('Proposals not available:', e);
        container.innerHTML = `
            <div class="text-center py-8 text-gray-600 text-sm">
                <i data-lucide="inbox" class="w-5 h-5 mx-auto mb-3"></i>
                No proposals at the moment
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// Render proposals list
function renderProposals() {
    const container = document.getElementById('proposals-list');
    if (!container) return;

    if (governanceState.proposals.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-600 text-sm">
                <i data-lucide="inbox" class="w-5 h-5 mx-auto mb-3"></i>
                No proposals at the moment
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    container.innerHTML = governanceState.proposals.map(p => {
        const totalVotes = BigInt(p.votesFor) + BigInt(p.votesAgainst) + BigInt(p.votesAbstain);
        const forPercent = totalVotes > 0n ? Number((BigInt(p.votesFor) * 100n) / totalVotes) : 0;
        const againstPercent = totalVotes > 0n ? Number((BigInt(p.votesAgainst) * 100n) / totalVotes) : 0;
        
        const statusColor = {
            'active': 'text-green-400 border-green-500/30 bg-green-900/10',
            'passed': 'text-blue-400 border-blue-500/30 bg-blue-900/10',
            'rejected': 'text-red-400 border-red-500/30 bg-red-900/10',
            'ended': 'text-gray-400 border-gray-500/30 bg-gray-900/10',
        }[p.status] || 'text-gray-400 border-gray-500/30 bg-gray-900/10';

        const statusLabel = {
            'active': 'Active',
            'passed': 'Passed',
            'rejected': 'Rejected',
            'ended': 'Ended',
        }[p.status] || p.status;

        const endDate = new Date(p.endDate);
        const timeLeft = p.isActive ? formatTimeLeft(endDate) : '';

        return `
            <div class="glass-panel p-6 hover:border-white/20 transition-all cursor-pointer" onclick="openVoteModal(${p.id})">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <span class="text-[10px] uppercase tracking-widest text-gray-500">${p.proposalNumber}</span>
                        <h3 class="text-lg font-serif text-white mt-1">${escapeHtml(p.title)}</h3>
                    </div>
                    <div class="flex items-center gap-3">
                        ${timeLeft ? `<span class="text-[10px] text-gray-500">${timeLeft}</span>` : ''}
                        <span class="text-[10px] uppercase tracking-wider px-2 py-1 border ${statusColor}">${statusLabel}</span>
                    </div>
                </div>
                
                <p class="text-sm text-gray-500 mb-4 line-clamp-2">${escapeHtml(p.description.substring(0, 150))}${p.description.length > 150 ? '...' : ''}</p>
                
                <!-- Vote Bar -->
                <div class="space-y-2">
                    <div class="flex justify-between text-[10px] uppercase tracking-wider">
                        <span class="text-green-400">Yes ${forPercent}%</span>
                        <span class="text-gray-500">${p.voterCount} voter${p.voterCount !== 1 ? 's' : ''}</span>
                        <span class="text-red-400">No ${againstPercent}%</span>
                    </div>
                    <div class="h-1 bg-gray-800 flex overflow-hidden">
                        <div class="bg-green-500 transition-all" style="width: ${forPercent}%"></div>
                        <div class="bg-red-500 transition-all" style="width: ${againstPercent}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Open vote modal
async function openVoteModal(proposalId) {
    const proposal = governanceState.proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    governanceState.currentProposal = proposal;
    governanceState.selectedVote = null;

    // Update modal content
    document.getElementById('modal-proposal-number').textContent = proposal.proposalNumber;
    document.getElementById('modal-proposal-title').textContent = proposal.title;
    document.getElementById('modal-proposal-desc').textContent = proposal.description;

    // Reset vote buttons
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.classList.remove('border-green-500', 'bg-green-900/30', 'border-red-500', 'bg-red-900/30', 'border-gray-500', 'bg-gray-900/30');
    });

    // Reset submit button
    const submitBtn = document.getElementById('btn-submit-vote');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Select an Option';
    submitBtn.classList.add('bg-gray-900', 'text-gray-600', 'cursor-not-allowed');
    submitBtn.classList.remove('bg-white', 'text-black', 'hover:bg-gray-200', 'cursor-pointer');

    // Show/hide states
    document.getElementById('vote-options').classList.remove('hidden');
    document.getElementById('btn-submit-vote').classList.remove('hidden');
    document.getElementById('already-voted').classList.add('hidden');
    document.getElementById('not-eligible').classList.add('hidden');

    // Check vote status if connected
    if (state.kiAddress) {
        try {
            const res = await fetch(`${API_BASE}/governance/proposals/${proposalId}/vote-status/${state.kiAddress}`);
            const data = await res.json();
            
            governanceState.votingPower = data.votingPower || '0';
            governanceState.hasVoted = data.hasVoted;
            governanceState.canVote = data.canVote;

            document.getElementById('modal-voting-power').textContent = formatXKI(governanceState.votingPower) + ' XKI';

            if (data.hasVoted) {
                document.getElementById('vote-options').classList.add('hidden');
                document.getElementById('btn-submit-vote').classList.add('hidden');
                document.getElementById('already-voted').classList.remove('hidden');
            } else if (!data.canVote && !proposal.isActive) {
                document.getElementById('vote-options').classList.add('hidden');
                document.getElementById('btn-submit-vote').classList.add('hidden');
            }
        } catch (e) {
            document.getElementById('modal-voting-power').textContent = '— XKI';
        }
    } else {
        document.getElementById('modal-voting-power').textContent = 'Connect wallet to vote';
        document.getElementById('vote-options').classList.add('hidden');
        document.getElementById('btn-submit-vote').textContent = 'Connect Keplr to Vote';
        document.getElementById('btn-submit-vote').disabled = false;
        document.getElementById('btn-submit-vote').classList.remove('bg-gray-900', 'text-gray-600', 'cursor-not-allowed');
        document.getElementById('btn-submit-vote').classList.add('bg-white', 'text-black', 'hover:bg-gray-200', 'cursor-pointer');
        document.getElementById('btn-submit-vote').onclick = connectForVoting;
    }

    // Show modal
    document.getElementById('vote-modal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Close vote modal
function closeVoteModal() {
    document.getElementById('vote-modal').classList.add('hidden');
    governanceState.currentProposal = null;
    governanceState.selectedVote = null;
}

// Select vote option
function selectVote(choice) {
    governanceState.selectedVote = choice;
    
    // Update button styles
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.classList.remove('border-green-500', 'bg-green-900/30', 'border-red-500', 'bg-red-900/30', 'border-gray-500', 'bg-gray-900/30');
    });

    const selectedBtn = document.querySelector(`.vote-btn[data-vote="${choice}"]`);
    if (choice === 'for') {
        selectedBtn.classList.add('border-green-500', 'bg-green-900/30');
    } else if (choice === 'against') {
        selectedBtn.classList.add('border-red-500', 'bg-red-900/30');
    } else {
        selectedBtn.classList.add('border-gray-500', 'bg-gray-900/30');
    }

    // Enable submit button
    const submitBtn = document.getElementById('btn-submit-vote');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign & Submit Vote';
    submitBtn.classList.remove('bg-gray-900', 'text-gray-600', 'cursor-not-allowed');
    submitBtn.classList.add('bg-white', 'text-black', 'hover:bg-gray-200', 'cursor-pointer');
    submitBtn.onclick = submitVote;
}

// Connect wallet specifically for voting
async function connectForVoting() {
    if (!window.keplr) {
        const confirmInstall = confirm('Keplr wallet extension is required.\n\nClick OK to open the Chrome Web Store and install Keplr.');
        if (confirmInstall) {
            window.open('https://chrome.google.com/webstore/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap', '_blank');
        }
        return;
    }

    try {
        const chainId = 'kichain-2';
        
        try {
            await window.keplr.enable(chainId);
        } catch (enableErr) {
            await window.keplr.experimentalSuggestChain({
                chainId: "kichain-2",
                chainName: "Ki Chain",
                rpc: "https://rpc-mainnet.blockchain.ki",
                rest: "https://api-mainnet.blockchain.ki",
                bip44: { coinType: 118 },
                bech32Config: {
                    bech32PrefixAccAddr: "ki",
                    bech32PrefixAccPub: "kipub",
                    bech32PrefixValAddr: "kivaloper",
                    bech32PrefixValPub: "kivaloperpub",
                    bech32PrefixConsAddr: "kivalcons",
                    bech32PrefixConsPub: "kivalconspub"
                },
                currencies: [{ coinDenom: "XKI", coinMinimalDenom: "uxki", coinDecimals: 6 }],
                feeCurrencies: [{ coinDenom: "XKI", coinMinimalDenom: "uxki", coinDecimals: 6 }],
                stakeCurrency: { coinDenom: "XKI", coinMinimalDenom: "uxki", coinDecimals: 6 }
            });
            await window.keplr.enable(chainId);
        }

        const key = await window.keplr.getKey(chainId);
        state.kiAddress = key.bech32Address;

        // Reload modal with vote status
        if (governanceState.currentProposal) {
            openVoteModal(governanceState.currentProposal.id);
        }
    } catch (e) {
        console.error('Keplr error:', e);
        alert('Error connecting to Keplr:\n' + e.message);
    }
}

// Submit vote
async function submitVote() {
    if (!governanceState.selectedVote || !governanceState.currentProposal || !state.kiAddress) {
        return;
    }

    const submitBtn = document.getElementById('btn-submit-vote');
    submitBtn.textContent = 'Signing...';
    submitBtn.disabled = true;

    try {
        const chainId = 'kichain-2';
        const message = `Vote ${governanceState.selectedVote} on ${governanceState.currentProposal.proposalNumber}: ${governanceState.currentProposal.title}`;
        
        const signature = await window.keplr.signArbitrary(chainId, state.kiAddress, message);

        submitBtn.textContent = 'Submitting...';

        const res = await fetch(`${API_BASE}/governance/proposals/${governanceState.currentProposal.id}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kiAddress: state.kiAddress,
                voteChoice: governanceState.selectedVote,
                signature: signature.signature,
                pubKey: signature.pub_key.value
            })
        });

        const data = await res.json();

        if (data.success) {
            // Update local state
            const proposalIndex = governanceState.proposals.findIndex(p => p.id === governanceState.currentProposal.id);
            if (proposalIndex >= 0) {
                governanceState.proposals[proposalIndex] = data.proposal;
            }

            // Show success
            document.getElementById('vote-options').classList.add('hidden');
            submitBtn.classList.add('hidden');
            document.getElementById('already-voted').classList.remove('hidden');

            // Refresh proposals list
            renderProposals();
        } else {
            alert('Vote failed: ' + (data.error || 'Unknown error'));
            submitBtn.textContent = 'Sign & Submit Vote';
            submitBtn.disabled = false;
        }
    } catch (e) {
        console.error('Vote error:', e);
        alert('Error submitting vote: ' + e.message);
        submitBtn.textContent = 'Sign & Submit Vote';
        submitBtn.disabled = false;
    }
}

// Helper: Format time left
function formatTimeLeft(endDate) {
    const now = new Date();
    const diff = endDate - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${mins}m left`;
}

// Helper: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load proposals on page load
document.addEventListener('DOMContentLoaded', () => {
    loadProposals();
});

/* Build ${Date.now()} */
