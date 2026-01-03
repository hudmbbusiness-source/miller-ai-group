# StuntMan ES Futures Strategy Research

## Sources & Research

### Academic/Quantitative Sources
1. **VWAP Trading Research** - Zarattini & Aziz (SSRN)
   - VWAP Trend Trading: 671% return, 9.4% max drawdown, **Sharpe Ratio 2.1**
   - Long above VWAP, Short below VWAP
   - Source: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4631351

2. **Z-Score Mean Reversion** - QuantStart
   - Entry threshold: |z| > 2.0
   - Exit threshold: |z| < 1.0
   - Source: https://www.quantstart.com/articles/Backtesting-An-Intraday-Mean-Reversion-Pairs-Strategy-Between-SPY-And-IWM/

3. **Opening Range Breakout (ORB)** - Quantified Strategies
   - 30-minute ORB (9:30-10:00 AM EST) is optimal
   - Edge diminishes after 1:00 PM, gone by 2:00 PM
   - Works best on high-volatility days
   - NQ Backtest: 74.56% win rate, 2.512 profit factor
   - Source: https://www.quantifiedstrategies.com/opening-range-breakout-strategy/

### Institutional Order Flow
4. **Delta Analysis** - TradePro Academy
   - ES Delta threshold: 800+ indicates institutional activity
   - Delta divergence at support/resistance = high probability reversal
   - Source: https://tradeproacademy.com/delta-profiles-the-secret-sauce-of-successful-futures-trading/

5. **CME E-mini S&P 500 Specifications**
   - Over 1 million contracts daily (highly liquid)
   - Tick size: 0.25 points ($12.50 per tick)
   - Source: https://www.cmegroup.com/markets/equities/sp/e-mini-sandp500.html

---

## PROVEN STRATEGIES TO IMPLEMENT

### Strategy 1: VWAP Mean Reversion
**Edge**: ES frequently reverts to VWAP intraday
**Setup**:
- Calculate session VWAP
- Long entry: Price < VWAP - 1 ATR AND RSI < 30
- Short entry: Price > VWAP + 1 ATR AND RSI > 70
- Target: Return to VWAP
- Stop: 1.5 ATR beyond entry

### Strategy 2: Opening Range Breakout (ORB)
**Edge**: First 30 minutes sets the tone for the day
**Setup**:
- Define range: 9:30 - 10:00 AM EST high/low
- Long entry: Break above ORB high with volume confirmation
- Short entry: Break below ORB low with volume confirmation
- Filter: Only trade on days with ORB range > 0.5 ATR (volatility filter)
- Time filter: No new entries after 1:00 PM EST
- Target: 2x ORB range
- Stop: Opposite side of ORB

### Strategy 3: EMA Trend + Pullback
**Edge**: Trade with the trend, enter on pullbacks
**Setup**:
- Trend: EMA20 > EMA50 (uptrend) or EMA20 < EMA50 (downtrend)
- Entry: RSI pullback to 40-50 zone (uptrend) or 50-60 zone (downtrend)
- Confirmation: Price bounces off EMA20
- Target: 2 ATR
- Stop: Below recent swing low (1.5 ATR)

### Strategy 4: Delta Divergence
**Edge**: Institutional order flow divergence predicts reversals
**Setup**:
- Track cumulative delta
- Bullish divergence: Price makes lower low, delta makes higher low
- Bearish divergence: Price makes higher high, delta makes lower high
- Entry: On divergence confirmation
- Filter: Delta magnitude > 800 (institutional threshold)
- Target: Recent swing high/low
- Stop: Beyond divergence low/high

### Strategy 5: Session Momentum
**Edge**: Specific session times have predictable behavior
**Setup**:
- Opening Drive (9:30-10:30): Trade breakouts
- Lunch Chop (11:30-1:00): Avoid or fade extremes
- Power Hour (2:00-3:00): Trade with momentum
- Close (3:30-4:00): Take profits, reduce exposure

---

## REGIME DETECTION

### Trending Regime
- ADX > 25
- EMA20 and EMA50 aligned
- Use: Trend-following strategies (EMA Pullback, ORB)

### Ranging Regime
- ADX < 20
- Price oscillating around VWAP
- Use: Mean reversion strategies (VWAP reversion)

### High Volatility Regime
- ATR > 1.5x 20-period average
- Use: ORB with wider stops, reduce position size

### Low Volatility Regime
- ATR < 0.7x 20-period average
- Use: Avoid trading or use tight range strategies

---

## RISK MANAGEMENT RULES

1. **Max Daily Loss**: 2% of account ($3,000 on $150k)
2. **Max Position Size**: Based on ATR, never risk > 1% per trade
3. **Correlation Filter**: Don't stack same-direction trades
4. **Drawdown Scaling**: Reduce size as drawdown increases
5. **Time Exit**: Close all positions by 3:45 PM EST

---

## VALIDATION REQUIREMENTS

Before going live, each strategy must pass:
1. Minimum 100 trades in backtest
2. Profit factor > 1.5
3. Win rate > 45% (for trend) or > 55% (for mean reversion)
4. Max drawdown < 15%
5. Sharpe ratio > 1.0
6. Out-of-sample validation (train on 70%, test on 30%)
