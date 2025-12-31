-- =============================================================================
-- STUNTMAN AI TRADING SYSTEM - DATABASE SCHEMA
-- =============================================================================
-- Version: 1.0.0
-- Created: 2025-12-31
-- Description: Complete schema for crypto trading system with paper/live trading
-- =============================================================================

-- Trading accounts (paper vs live)
CREATE TABLE IF NOT EXISTS stuntman_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('paper', 'live')),
  name TEXT NOT NULL,
  initial_balance DECIMAL(20, 8) NOT NULL DEFAULT 1000,
  current_balance DECIMAL(20, 8) NOT NULL DEFAULT 1000,
  reserved_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings
CREATE TABLE IF NOT EXISTS stuntman_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  trading_mode TEXT DEFAULT 'paper' CHECK (trading_mode IN ('paper', 'live')),
  default_account_id UUID REFERENCES stuntman_accounts(id) ON DELETE SET NULL,
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  max_daily_loss DECIMAL(20, 8) DEFAULT 100,
  max_position_size DECIMAL(20, 8) DEFAULT 500,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  auto_trading_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading strategies
CREATE TABLE IF NOT EXISTS stuntman_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES stuntman_accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  strategy_type TEXT NOT NULL CHECK (strategy_type IN ('technical', 'momentum', 'pattern', 'hybrid')),
  instruments TEXT[] DEFAULT ARRAY['BTC_USDT'],
  is_active BOOLEAN DEFAULT FALSE,

  -- Risk parameters
  max_position_size DECIMAL(20, 8) DEFAULT 100,
  max_daily_trades INTEGER DEFAULT 50,
  stop_loss_percent DECIMAL(5, 2) DEFAULT 2.0,
  take_profit_percent DECIMAL(5, 2) DEFAULT 4.0,

  -- Strategy configuration (JSON)
  config JSONB NOT NULL DEFAULT '{
    "indicators": {
      "rsi": {"enabled": true, "period": 14, "overbought": 70, "oversold": 30},
      "macd": {"enabled": true, "fast": 12, "slow": 26, "signal": 9},
      "ema": {"enabled": true, "periods": [9, 21, 50]},
      "bollinger": {"enabled": false, "period": 20, "stdDev": 2}
    },
    "patterns": {
      "candlestick": true,
      "chartPatterns": true,
      "supportResistance": true
    },
    "entryConditions": {
      "minSignalStrength": 0.6,
      "requireConfirmation": true,
      "volumeFilter": true
    }
  }'::jsonb,

  -- Performance tracking
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  total_pnl DECIMAL(20, 8) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions (current holdings)
CREATE TABLE IF NOT EXISTS stuntman_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES stuntman_accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strategy_id UUID REFERENCES stuntman_strategies(id) ON DELETE SET NULL,

  instrument_name TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('LONG', 'SHORT')),

  -- Position details
  quantity DECIMAL(20, 8) NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  current_price DECIMAL(20, 8),
  avg_entry_price DECIMAL(20, 8) NOT NULL,

  -- P&L
  unrealized_pnl DECIMAL(20, 8) DEFAULT 0,
  realized_pnl DECIMAL(20, 8) DEFAULT 0,
  total_fees DECIMAL(20, 8) DEFAULT 0,

  -- Risk management
  stop_loss DECIMAL(20, 8),
  take_profit DECIMAL(20, 8),
  trailing_stop_percent DECIMAL(5, 2),

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed')),
  close_reason TEXT,

  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders (pending and filled)
CREATE TABLE IF NOT EXISTS stuntman_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES stuntman_accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  position_id UUID REFERENCES stuntman_positions(id) ON DELETE SET NULL,
  strategy_id UUID REFERENCES stuntman_strategies(id) ON DELETE SET NULL,
  signal_id UUID,

  -- External reference (for live trading)
  external_order_id TEXT,

  -- Order details
  instrument_name TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  order_type TEXT NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT', 'STOP_LOSS', 'TAKE_PROFIT', 'STOP_LIMIT')),
  time_in_force TEXT DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK')),

  -- Quantities
  quantity DECIMAL(20, 8) NOT NULL,
  filled_quantity DECIMAL(20, 8) DEFAULT 0,
  remaining_quantity DECIMAL(20, 8),

  -- Prices
  price DECIMAL(20, 8),
  stop_price DECIMAL(20, 8),
  filled_price DECIMAL(20, 8),
  avg_fill_price DECIMAL(20, 8),

  -- Fees
  fee DECIMAL(20, 8) DEFAULT 0,
  fee_currency TEXT DEFAULT 'USDT',

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'partial', 'filled', 'cancelled', 'rejected', 'expired')),
  reject_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  filled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Trades (executed transactions)
CREATE TABLE IF NOT EXISTS stuntman_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES stuntman_accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES stuntman_orders(id) ON DELETE SET NULL,
  position_id UUID REFERENCES stuntman_positions(id) ON DELETE SET NULL,

  -- External reference (for live trading)
  external_trade_id TEXT,

  -- Trade details
  instrument_name TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  value DECIMAL(20, 8) NOT NULL,

  -- Fees
  fee DECIMAL(20, 8) NOT NULL DEFAULT 0,
  fee_currency TEXT DEFAULT 'USDT',
  fee_rate DECIMAL(10, 6),

  -- P&L (for closing trades)
  pnl DECIMAL(20, 8),
  pnl_percent DECIMAL(10, 4),

  -- Execution info
  is_maker BOOLEAN DEFAULT FALSE,
  slippage DECIMAL(10, 6),

  executed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading signals
CREATE TABLE IF NOT EXISTS stuntman_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES stuntman_strategies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  instrument_name TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD', 'CLOSE')),

  -- Signal strength and confidence
  strength DECIMAL(5, 4) NOT NULL CHECK (strength >= 0 AND strength <= 1),
  confidence DECIMAL(5, 4) CHECK (confidence >= 0 AND confidence <= 1),

  -- Price at signal
  price_at_signal DECIMAL(20, 8) NOT NULL,
  suggested_entry DECIMAL(20, 8),
  suggested_stop_loss DECIMAL(20, 8),
  suggested_take_profit DECIMAL(20, 8),

  -- Indicator values snapshot
  indicators JSONB DEFAULT '{}'::jsonb,

  -- Pattern detection results
  patterns_detected JSONB DEFAULT '[]'::jsonb,

  -- Execution
  executed BOOLEAN DEFAULT FALSE,
  order_id UUID REFERENCES stuntman_orders(id) ON DELETE SET NULL,
  execution_price DECIMAL(20, 8),

  -- Validity
  valid_until TIMESTAMPTZ,
  expired BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backtests
CREATE TABLE IF NOT EXISTS stuntman_backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES stuntman_strategies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  name TEXT,
  description TEXT,

  -- Time range
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  timeframe TEXT DEFAULT '15m',

  -- Configuration
  initial_balance DECIMAL(20, 8) NOT NULL DEFAULT 1000,
  instruments TEXT[] NOT NULL,
  config_snapshot JSONB,

  -- Results
  final_balance DECIMAL(20, 8),
  total_pnl DECIMAL(20, 8),
  total_pnl_percent DECIMAL(10, 4),

  -- Trade statistics
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2),

  -- Risk metrics
  max_drawdown DECIMAL(10, 4),
  max_drawdown_percent DECIMAL(5, 2),
  sharpe_ratio DECIMAL(10, 4),
  sortino_ratio DECIMAL(10, 4),
  profit_factor DECIMAL(10, 4),

  -- Averages
  avg_win DECIMAL(20, 8),
  avg_loss DECIMAL(20, 8),
  avg_trade_duration_minutes INTEGER,

  -- Detailed results
  equity_curve JSONB DEFAULT '[]'::jsonb,
  trades JSONB DEFAULT '[]'::jsonb,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  progress INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Market data cache (OHLCV for indicators)
CREATE TABLE IF NOT EXISTS stuntman_market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_name TEXT NOT NULL,
  timeframe TEXT NOT NULL,

  -- OHLCV data
  open_time TIMESTAMPTZ NOT NULL,
  close_time TIMESTAMPTZ,
  open DECIMAL(20, 8) NOT NULL,
  high DECIMAL(20, 8) NOT NULL,
  low DECIMAL(20, 8) NOT NULL,
  close DECIMAL(20, 8) NOT NULL,
  volume DECIMAL(20, 8) NOT NULL,
  quote_volume DECIMAL(20, 8),
  trade_count INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(instrument_name, timeframe, open_time)
);

-- P&L snapshots (daily tracking)
CREATE TABLE IF NOT EXISTS stuntman_pnl_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES stuntman_accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  snapshot_date DATE NOT NULL,

  -- Balances
  balance DECIMAL(20, 8) NOT NULL,
  equity DECIMAL(20, 8) NOT NULL,

  -- P&L
  daily_pnl DECIMAL(20, 8) NOT NULL DEFAULT 0,
  daily_pnl_percent DECIMAL(10, 4),
  total_pnl DECIMAL(20, 8) NOT NULL DEFAULT 0,
  total_pnl_percent DECIMAL(10, 4),

  -- Activity
  open_positions INTEGER DEFAULT 0,
  trades_count INTEGER DEFAULT 0,
  volume DECIMAL(20, 8) DEFAULT 0,
  fees_paid DECIMAL(20, 8) DEFAULT 0,

  -- Performance
  win_rate DECIMAL(5, 2),
  max_drawdown DECIMAL(20, 8),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(account_id, snapshot_date)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Accounts
CREATE INDEX IF NOT EXISTS idx_stuntman_accounts_user ON stuntman_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stuntman_accounts_active ON stuntman_accounts(user_id, is_active);

-- Positions
CREATE INDEX IF NOT EXISTS idx_stuntman_positions_account ON stuntman_positions(account_id, status);
CREATE INDEX IF NOT EXISTS idx_stuntman_positions_user ON stuntman_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_stuntman_positions_instrument ON stuntman_positions(instrument_name, status);

-- Orders
CREATE INDEX IF NOT EXISTS idx_stuntman_orders_account ON stuntman_orders(account_id, status);
CREATE INDEX IF NOT EXISTS idx_stuntman_orders_user ON stuntman_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_stuntman_orders_position ON stuntman_orders(position_id);
CREATE INDEX IF NOT EXISTS idx_stuntman_orders_created ON stuntman_orders(created_at DESC);

-- Trades
CREATE INDEX IF NOT EXISTS idx_stuntman_trades_account ON stuntman_trades(account_id);
CREATE INDEX IF NOT EXISTS idx_stuntman_trades_user ON stuntman_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_stuntman_trades_executed ON stuntman_trades(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_stuntman_trades_position ON stuntman_trades(position_id);

-- Strategies
CREATE INDEX IF NOT EXISTS idx_stuntman_strategies_user ON stuntman_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_stuntman_strategies_active ON stuntman_strategies(user_id, is_active);

-- Signals
CREATE INDEX IF NOT EXISTS idx_stuntman_signals_strategy ON stuntman_signals(strategy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stuntman_signals_user ON stuntman_signals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stuntman_signals_instrument ON stuntman_signals(instrument_name, created_at DESC);

-- Market data
CREATE INDEX IF NOT EXISTS idx_stuntman_market_data_lookup ON stuntman_market_data(instrument_name, timeframe, open_time DESC);

-- P&L snapshots
CREATE INDEX IF NOT EXISTS idx_stuntman_pnl_snapshots_account ON stuntman_pnl_snapshots(account_id, snapshot_date DESC);

-- Backtests
CREATE INDEX IF NOT EXISTS idx_stuntman_backtests_strategy ON stuntman_backtests(strategy_id);
CREATE INDEX IF NOT EXISTS idx_stuntman_backtests_user ON stuntman_backtests(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE stuntman_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stuntman_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stuntman_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stuntman_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stuntman_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stuntman_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE stuntman_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE stuntman_backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stuntman_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE stuntman_pnl_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage own accounts" ON stuntman_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own settings" ON stuntman_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own strategies" ON stuntman_strategies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own positions" ON stuntman_positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own orders" ON stuntman_orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own trades" ON stuntman_trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own signals" ON stuntman_signals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own backtests" ON stuntman_backtests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users read market data" ON stuntman_market_data FOR SELECT USING (true);
CREATE POLICY "System writes market data" ON stuntman_market_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Users manage own pnl snapshots" ON stuntman_pnl_snapshots FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_stuntman_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_stuntman_accounts_updated_at
  BEFORE UPDATE ON stuntman_accounts
  FOR EACH ROW EXECUTE FUNCTION update_stuntman_updated_at();

CREATE TRIGGER update_stuntman_settings_updated_at
  BEFORE UPDATE ON stuntman_settings
  FOR EACH ROW EXECUTE FUNCTION update_stuntman_updated_at();

CREATE TRIGGER update_stuntman_strategies_updated_at
  BEFORE UPDATE ON stuntman_strategies
  FOR EACH ROW EXECUTE FUNCTION update_stuntman_updated_at();

CREATE TRIGGER update_stuntman_positions_updated_at
  BEFORE UPDATE ON stuntman_positions
  FOR EACH ROW EXECUTE FUNCTION update_stuntman_updated_at();

CREATE TRIGGER update_stuntman_orders_updated_at
  BEFORE UPDATE ON stuntman_orders
  FOR EACH ROW EXECUTE FUNCTION update_stuntman_updated_at();

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- No initial data needed - accounts created on user signup
