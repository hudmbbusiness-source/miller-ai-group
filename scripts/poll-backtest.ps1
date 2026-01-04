# Poll backtest until 95%+ complete at MAX speed
$maxPolls = 300
for ($i=1; $i -le $maxPolls; $i++) {
    try {
        $response = (Invoke-WebRequest -Uri 'http://localhost:3000/api/stuntman/backtest-engine?speed=MAX' -UseBasicParsing -TimeoutSec 30).Content | ConvertFrom-Json
        $processed = $response.status.candlesProcessed
        $total = $response.status.totalCandles
        $progress = $response.status.progress
        $trades = $response.performance.trades
        $pnl = [math]::Round($response.performance.netPnL, 2)
        $winRate = $response.performance.winRate

        # Only print every 20th poll
        if ($i % 20 -eq 0) {
            Write-Host "Poll $i : $processed / $total = $progress, $trades trades, Win: $winRate, P&L: `$$pnl"
        }

        # Check if complete (95%+)
        if ($processed -ge ($total * 0.95)) {
            Write-Host "Backtest 95%+ complete!"
            break
        }
    } catch {
        Write-Host "Poll $i : Error - $($_.Exception.Message)"
    }
    Start-Sleep -Milliseconds 50
}

# Final result with detailed stats
Write-Host ""
Write-Host "=========================================="
Write-Host "APEX 150K EVAL SIMULATION - FINAL RESULTS"
Write-Host "=========================================="
Start-Sleep -Seconds 1

try {
    $final = (Invoke-WebRequest -Uri 'http://localhost:3000/api/stuntman/backtest-engine?speed=MAX' -UseBasicParsing -TimeoutSec 30).Content | ConvertFrom-Json

    Write-Host ""
    Write-Host "PERFORMANCE METRICS:"
    Write-Host "--------------------"
    Write-Host "Candles Processed: $($final.status.candlesProcessed) / $($final.status.totalCandles)"
    Write-Host "Total Trades: $($final.performance.trades)"
    Write-Host "Wins: $($final.performance.wins)"
    Write-Host "Losses: $($final.performance.losses)"
    Write-Host "Win Rate: $($final.performance.winRate)"
    Write-Host "Net P&L: `$$([math]::Round($final.performance.netPnL, 2))"
    Write-Host "Max Drawdown: `$$([math]::Round($final.performance.maxDrawdown, 2))"
    Write-Host "Profit Factor: $($final.performance.profitFactor)"

    Write-Host ""
    Write-Host "TARGET ANALYSIS:"
    Write-Host "-----------------"
    $targetPnL = 9000
    $achieved = [math]::Round($final.performance.netPnL, 2)
    $percentOfTarget = [math]::Round(($achieved / $targetPnL) * 100, 1)
    Write-Host "Target: `$$targetPnL"
    Write-Host "Achieved: `$$achieved"
    Write-Host "Progress: $percentOfTarget%"

    if ($achieved -ge $targetPnL) {
        Write-Host ""
        Write-Host "*** TARGET MET - EVAL WOULD PASS ***"
    } else {
        $shortfall = $targetPnL - $achieved
        Write-Host "Shortfall: `$$([math]::Round($shortfall, 2))"
    }

    Write-Host ""
    Write-Host "STRATEGY BREAKDOWN:"
    Write-Host "-------------------"
    if ($final.strategies -and $final.strategies.Count -gt 0) {
        foreach ($s in $final.strategies) {
            $avgPnl = [math]::Round($s.avgPnL, 2)
            Write-Host "$($s.strategy): $($s.trades) trades, $($s.winRate) win rate, avg PnL: `$$avgPnl"
        }
    } else {
        Write-Host "Strategy data in strategyPerformance field"
    }

} catch {
    Write-Host "Error getting final results: $($_.Exception.Message)"
}
