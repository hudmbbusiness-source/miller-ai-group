const http = require('http');

async function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function main() {
  const baseUrl = 'http://localhost:3000/api/stuntman/backtest-engine';

  // Reset
  console.log('Resetting backtest engine...');
  await fetchJSON(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reset' })
  });

  // Poll at MAX speed until we get enough trades
  console.log('Running backtest at MAX speed...\n');
  let result;
  for (let i = 1; i <= 50; i++) {
    await new Promise(r => setTimeout(r, 400));
    result = await fetchJSON(baseUrl + '?speed=MAX');

    if (i % 10 === 0) {
      console.log(`Poll ${i}: ${result.status.progress} - ${result.performance.trades} trades`);
    }

    if (result.performance.trades >= 80) break;
  }

  console.log('\n' + '='.repeat(60));
  console.log('STRATEGY PERFORMANCE ANALYSIS');
  console.log('='.repeat(60) + '\n');

  if (!result.strategies || result.strategies.length === 0) {
    console.log('No strategy data available yet.');
    return;
  }

  // Sort by different metrics
  const byWinRate = [...result.strategies].sort((a, b) => b.winRate - a.winRate);
  const byPnL = [...result.strategies].sort((a, b) => b.pnl - a.pnl);
  const byAvgPnL = [...result.strategies].sort((a, b) => b.avgPnL - a.avgPnL);

  console.log('🏆 BEST PERFORMERS (by Win Rate):');
  console.log('-'.repeat(60));
  byWinRate.slice(0, 4).forEach((s, i) => {
    console.log(`${i+1}. ${s.name.padEnd(25)} WR: ${s.winRate.toFixed(1).padStart(5)}%  P&L: $${s.pnl.toFixed(2).padStart(10)}  (${s.trades} trades)`);
  });

  console.log('\n❌ WORST PERFORMERS (by Win Rate):');
  console.log('-'.repeat(60));
  byWinRate.slice(-4).reverse().forEach((s, i) => {
    console.log(`${i+1}. ${s.name.padEnd(25)} WR: ${s.winRate.toFixed(1).padStart(5)}%  P&L: $${s.pnl.toFixed(2).padStart(10)}  (${s.trades} trades)`);
  });

  console.log('\n💰 BY TOTAL P&L (best to worst):');
  console.log('-'.repeat(60));
  byPnL.forEach(s => {
    const sign = s.pnl >= 0 ? '+' : '';
    console.log(`${s.pnl >= 0 ? '✓' : '✗'} ${s.name.padEnd(25)} P&L: ${sign}$${s.pnl.toFixed(2).padStart(9)}  WR: ${s.winRate.toFixed(1).padStart(5)}%  Avg: $${s.avgPnL.toFixed(2).padStart(8)}  (${s.trades})`);
  });

  console.log('\n📊 BY AVG PROFIT PER TRADE:');
  console.log('-'.repeat(60));
  byAvgPnL.forEach(s => {
    const sign = s.avgPnL >= 0 ? '+' : '';
    console.log(`${s.avgPnL >= 0 ? '✓' : '✗'} ${s.name.padEnd(25)} Avg: ${sign}$${s.avgPnL.toFixed(2).padStart(9)}  Total: $${s.pnl.toFixed(2).padStart(9)}  (${s.trades} trades)`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('OVERALL PERFORMANCE');
  console.log('='.repeat(60));
  console.log(`Total Trades:   ${result.performance.trades}`);
  console.log(`Win Rate:       ${result.performance.winRate}`);
  console.log(`Net P&L:        $${result.performance.netPnL.toFixed(2)}`);
  console.log(`Profit Factor:  ${result.performance.profitFactor}`);
  console.log(`Max Drawdown:   ${result.performance.maxDrawdownPercent}`);
  console.log(`Apex Risk:      ${result.apexRisk.riskLevel}`);
}

main().catch(console.error);
