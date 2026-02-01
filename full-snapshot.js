const fs = require('fs');
const path = require('path');

// Working Ki Chain REST APIs
const API_ENDPOINTS = [
  'https://kichain.api.m.stavr.tech',
  'https://kichain-api.polkachu.com'
];
let currentEndpoint = 0;

function getApi() {
  return API_ENDPOINTS[currentEndpoint % API_ENDPOINTS.length];
}

function rotateEndpoint() {
  currentEndpoint++;
}

// Read existing snapshot
const snapshotPath = path.join(__dirname, 'snapshot.csv');
const lines = fs.readFileSync(snapshotPath, 'utf-8').trim().split('\n');
const addresses = lines.slice(1).map(line => line.split(',')[0]);

console.log(`Total addresses to process: ${addresses.length}`);

// Output file
const outputPath = path.join(__dirname, 'full-snapshot.csv');
const progressPath = path.join(__dirname, 'snapshot-progress.json');

// Resume from progress if exists
let processed = new Map();
if (fs.existsSync(progressPath)) {
  const progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
  for (const r of progress.results) {
    processed.set(r.address, r);
  }
  console.log(`Resuming from ${processed.size} processed addresses`);
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i < retries - 1) {
        rotateEndpoint();
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
      }
    }
  }
  return null;
}

async function getFullBalance(address) {
  let liquid = 0n;
  let staked = 0n;
  let unbonding = 0n;
  let rewards = 0n;

  try {
    const api = getApi();
    
    // Liquid balance
    const bankRes = await fetchWithRetry(`${api}/cosmos/bank/v1beta1/balances/${address}`);
    if (bankRes?.balances) {
      const uxki = bankRes.balances.find(b => b.denom === 'uxki');
      if (uxki) liquid = BigInt(uxki.amount);
    }

    // Staked (delegations)
    const delegRes = await fetchWithRetry(`${api}/cosmos/staking/v1beta1/delegations/${address}`);
    if (delegRes?.delegation_responses) {
      for (const d of delegRes.delegation_responses) {
        staked += BigInt(d.balance?.amount || 0);
      }
    }

    // Unbonding
    const unbondRes = await fetchWithRetry(`${api}/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`);
    if (unbondRes?.unbonding_responses) {
      for (const u of unbondRes.unbonding_responses) {
        for (const e of (u.entries || [])) {
          unbonding += BigInt(e.balance || 0);
        }
      }
    }

    // Rewards
    const rewardsRes = await fetchWithRetry(`${api}/cosmos/distribution/v1beta1/delegators/${address}/rewards`);
    if (rewardsRes?.total) {
      const uxki = rewardsRes.total.find(r => r.denom === 'uxki');
      if (uxki) rewards = BigInt(Math.floor(parseFloat(uxki.amount)));
    }
  } catch (e) {
    // Ignore errors, will have 0 values
  }

  const total = liquid + staked + unbonding + rewards;
  return { 
    address, 
    liquid: liquid.toString(), 
    staked: staked.toString(), 
    unbonding: unbonding.toString(), 
    rewards: rewards.toString(), 
    total: total.toString() 
  };
}

async function processInBatches(addresses, batchSize = 5) {
  const toProcess = addresses.filter(a => !processed.has(a));
  console.log(`Remaining to process: ${toProcess.length}`);

  for (let i = 0; i < toProcess.length; i += batchSize) {
    const batch = toProcess.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(getFullBalance));
    
    for (const r of batchResults) {
      processed.set(r.address, r);
    }

    // Save progress every 50 addresses
    if ((processed.size) % 50 === 0 || i + batchSize >= toProcess.length) {
      fs.writeFileSync(progressPath, JSON.stringify({
        results: [...processed.values()]
      }));
      const pct = ((processed.size / addresses.length) * 100).toFixed(1);
      console.log(`Progress: ${processed.size}/${addresses.length} (${pct}%)`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }
}

async function main() {
  console.log(`Using APIs: ${API_ENDPOINTS.join(', ')}`);
  
  await processInBatches(addresses, 5);

  // Write final CSV
  const results = [...processed.values()];
  const header = 'address,liquid_uxki,staked_uxki,unbonding_uxki,rewards_uxki,total_uxki,total_xki\n';
  const rows = results.map(r => {
    const totalXki = Number(BigInt(r.total)) / 1e6;
    return `${r.address},${r.liquid},${r.staked},${r.unbonding},${r.rewards},${r.total},${totalXki}`;
  }).join('\n');
  
  fs.writeFileSync(outputPath, header + rows);
  console.log(`\nDone! Written to ${outputPath}`);
  
  // Stats
  let totalLiquid = 0n, totalStaked = 0n, totalUnbonding = 0n, totalRewards = 0n;
  for (const r of results) {
    totalLiquid += BigInt(r.liquid);
    totalStaked += BigInt(r.staked);
    totalUnbonding += BigInt(r.unbonding);
    totalRewards += BigInt(r.rewards);
  }
  console.log(`\nTotal Liquid: ${Number(totalLiquid) / 1e6} XKI`);
  console.log(`Total Staked: ${Number(totalStaked) / 1e6} XKI`);
  console.log(`Total Unbonding: ${Number(totalUnbonding) / 1e6} XKI`);
  console.log(`Total Rewards: ${Number(totalRewards) / 1e6} XKI`);
}

main().catch(console.error);
