$ErrorActionPreference = "Stop"

Write-Host "Starting backtest polling test..."
Write-Host "================================="

for ($i = 1; $i -le 500; $i++) {
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/stuntman/backtest-engine?speed=MAX' -UseBasicParsing -TimeoutSec 30
        $data = $response.Content | ConvertFrom-Json

        $progress = $data.status.progress
        $processed = $data.status.candlesProcessed
        $total = $data.status.totalCandles
        $trades = $data.performance.trades
        $netPnL = $data.performance.netPnL
        $wins = $data.performance.wins
        $losses = $data.performance.losses

        Write-Host "Poll $i : $progress ($processed/$total) | Trades: $trades (W:$wins L:$losses) | Net PnL: `$$netPnL"

        if ($processed -ge $total -and $total -gt 0) {
            Write-Host ""
            Write-Host "============================================"
            Write-Host "BACKTEST COMPLETE!"
            Write-Host "============================================"
            Write-Host "Final Results:"
            Write-Host "  Candles: $processed"
            Write-Host "  Trades: $trades"
            Write-Host "  Wins: $wins"
            Write-Host "  Losses: $losses"
            Write-Host "  Win Rate: $($data.performance.winRate)"
            Write-Host "  Gross PnL: `$$($data.performance.grossPnL)"
            Write-Host "  Net PnL: `$$netPnL"
            Write-Host "  Max Drawdown: $($data.performance.maxDrawdownPercent)"
            Write-Host "  Profit Factor: $($data.performance.profitFactor)"
            Write-Host ""
            Write-Host "Top Strategies:"
            $data.strategies | Select-Object -First 5 | ForEach-Object {
                Write-Host "  $($_.name): $($_.trades) trades, $($_.winRate) win rate, `$$($_.pnl) PnL"
            }
            break
        }
    } catch {
        Write-Host "Poll $i : Error - $($_.Exception.Message)"
    }
}
