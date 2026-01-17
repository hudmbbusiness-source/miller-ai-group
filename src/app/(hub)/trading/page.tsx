"use client";

// ============================================================================
// KACHOW - APEX TRADING DASHBOARD
// Real-time monitoring for Apex 300K trading system
// ============================================================================

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Shield,
  Activity,
  BarChart3,
  Clock,
  Zap,
  Play,
  Square,
  AlertTriangle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TradingState {
  account: {
    name: string;
    balance: number;
    profit: number;
    threshold: number;
    buffer: number;
  };
  performance: {
    trades: number;
    wins: number;
    win_rate: number;
    total_pnl: number;
  };
  strategy: {
    name: string;
    entry: string;
    stop: string;
    target: string;
  };
  position: {
    entry_price: number;
    stop_price: number;
    target_price: number;
    contracts: number;
  } | null;
  trade_history: Array<{
    date: string;
    entry: number;
    exit: number;
    contracts: number;
    pnl: number;
    balance: number;
    type: string;
    won: boolean;
  }>;
  timestamp: string;
  systemStatus?: 'stopped' | 'running' | 'starting' | 'stopping';
  connected?: boolean;
}

export default function TradingDashboard() {
  const [data, setData] = useState<TradingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [commandPending, setCommandPending] = useState(false);

  const sendCommand = async (command: "START" | "STOP" | "FLATTEN") => {
    setCommandPending(true);
    try {
      const response = await fetch("/api/trading/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "command", command }),
      });
      await fetchData();
    } catch (err) {
      setError("Failed to send command");
    } finally {
      setCommandPending(false);
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch("/api/trading/update");
      if (!response.ok) throw new Error("Failed to fetch");

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date().toLocaleTimeString());
        setError(null);
      }
    } catch (err) {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <Activity className="w-5 h-5 animate-pulse" />
          <span>Loading trading data...</span>
        </div>
      </div>
    );
  }

  const profit = data?.account?.profit || 0;
  const isProfit = profit >= 0;
  const isConnected = data?.connected === true;
  const systemStatus = data?.systemStatus || "stopped";
  const isRunning = systemStatus === "running";

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Page Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl">Apex Trading System</h1>
            <p className="text-sm text-neutral-500">{data?.account?.name || "Waiting for connection..."}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2", isConnected ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-red-500/15 text-red-400 border border-red-500/30")}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? "CONNECTED" : "DISCONNECTED"}
            </div>
            <div className={cn("px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2", isRunning ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-neutral-500/15 text-neutral-400 border border-neutral-500/30")}>
              <span className={cn("w-2 h-2 rounded-full", isRunning ? "bg-emerald-400 animate-pulse" : "bg-neutral-500")} />
              {systemStatus.toUpperCase()}
            </div>
            <span className="text-xs text-neutral-600">{lastUpdate}</span>
          </div>
        </div>
        {/* Control Buttons */}
        <div className="flex items-center gap-3 mt-4">
          <button onClick={() => sendCommand("START")} disabled={!isConnected || isRunning || commandPending} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm", isConnected && !isRunning && !commandPending ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-neutral-800 text-neutral-500 cursor-not-allowed")}>
            <Play className="w-4 h-4" /> Start Trading
          </button>
          <button onClick={() => sendCommand("STOP")} disabled={!isConnected || !isRunning || commandPending} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm", isConnected && isRunning && !commandPending ? "bg-red-600 hover:bg-red-500 text-white" : "bg-neutral-800 text-neutral-500 cursor-not-allowed")}>
            <Square className="w-4 h-4" /> Stop Trading
          </button>
          <button onClick={() => sendCommand("FLATTEN")} disabled={!isConnected || commandPending} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm", isConnected && !commandPending ? "bg-amber-600 hover:bg-amber-500 text-white" : "bg-neutral-800 text-neutral-500 cursor-not-allowed")}>
            <AlertTriangle className="w-4 h-4" /> Flatten All
          </button>
          {commandPending && <span className="text-sm text-amber-400 animate-pulse">Sending to Tradovate...</span>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {error}
          </div>
        )}
        {!isConnected && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-3 rounded-xl flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span className="font-medium">Local trading system not connected.</span>
            <span className="text-amber-400/70">Run the trading system on your computer to see real data.</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Balance */}
          <div className="bg-neutral-900/50 rounded-2xl p-5 border border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Balance</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold">
              {isConnected ? formatMoney(data?.account?.balance || 0) : "--"}
            </div>
            <div className="text-sm text-neutral-500 mt-1">{isConnected ? "Live from Tradovate" : "Waiting for data"}</div>
          </div>

          {/* Profit */}
          <div className="bg-neutral-900/50 rounded-2xl p-5 border border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              {isProfit ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className="text-xs font-medium uppercase tracking-wider">Profit</span>
            </div>
            <div
              className={cn(
                "text-2xl sm:text-3xl font-bold",
                isProfit ? "text-emerald-400" : "text-red-400"
              )}
            >
              {formatMoney(profit)}
            </div>
            <div className="text-sm text-neutral-500 mt-1">
              {((profit / 300000) * 100).toFixed(1)}% return
            </div>
          </div>

          {/* Buffer */}
          <div className="bg-neutral-900/50 rounded-2xl p-5 border border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Buffer</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold">
              {formatMoney(data?.account?.buffer || 0)}
            </div>
            <div className="text-sm text-neutral-500 mt-1">Above $292,500</div>
          </div>

          {/* Win Rate */}
          <div className="bg-neutral-900/50 rounded-2xl p-5 border border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Win Rate</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold">
              {(data?.performance?.win_rate || 0).toFixed(1)}%
            </div>
            <div className="text-sm text-neutral-500 mt-1">
              {data?.performance?.trades || 0} trades
            </div>
          </div>
        </div>

        {/* Position & Strategy Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Position Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                <h2 className="font-semibold text-lg">Current Position</h2>
              </div>
              <span className="bg-neutral-900/80 px-4 py-2 rounded-lg font-bold">
                {data?.position?.contracts || 0} MES
              </span>
            </div>

            {data?.position ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center bg-neutral-900/50 rounded-xl p-4">
                  <div className="text-xs uppercase text-neutral-500 mb-2">Entry</div>
                  <div className="text-xl font-bold text-cyan-400">
                    {formatPrice(data.position.entry_price)}
                  </div>
                </div>
                <div className="text-center bg-neutral-900/50 rounded-xl p-4">
                  <div className="text-xs uppercase text-neutral-500 mb-2">Stop</div>
                  <div className="text-xl font-bold text-red-400">
                    {formatPrice(data.position.stop_price)}
                  </div>
                </div>
                <div className="text-center bg-neutral-900/50 rounded-xl p-4">
                  <div className="text-xs uppercase text-neutral-500 mb-2">Target</div>
                  <div className="text-xl font-bold text-emerald-400">
                    {formatPrice(data.position.target_price)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-neutral-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No active position</p>
                <p className="text-sm">Waiting for entry signal...</p>
              </div>
            )}
          </div>

          {/* Strategy Card */}
          <div className="bg-neutral-900/50 rounded-2xl p-6 border border-neutral-800">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-5 h-5 text-purple-400" />
              <h2 className="font-semibold text-lg">Strategy</h2>
            </div>

            <div className="space-y-4">
              {[
                { label: "Name", value: data?.strategy?.name || "EMA21 Dip Buying" },
                { label: "Entry", value: data?.strategy?.entry || "EMA21 < -0.5%" },
                { label: "Stop", value: data?.strategy?.stop || "2.0 ATR" },
                { label: "Target", value: data?.strategy?.target || "1.5 ATR" },
                { label: "Sizing", value: "Dynamic 5-35 MES" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0"
                >
                  <span className="text-neutral-500 text-sm">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trade History */}
        <div className="bg-neutral-900/50 rounded-2xl p-6 border border-neutral-800">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-lg">Recent Trades</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-neutral-500 border-b border-neutral-800">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Entry</th>
                  <th className="pb-3 pr-4 font-medium">Exit</th>
                  <th className="pb-3 pr-4 font-medium">Size</th>
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">P&L</th>
                  <th className="pb-3 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data?.trade_history && data.trade_history.length > 0 ? (
                  [...data.trade_history]
                    .reverse()
                    .slice(0, 10)
                    .map((trade, i) => (
                      <tr key={i} className="border-b border-neutral-800/50 last:border-0">
                        <td className="py-3 pr-4 text-sm">
                          {new Date(trade.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4 text-sm font-mono">
                          {formatPrice(trade.entry)}
                        </td>
                        <td className="py-3 pr-4 text-sm font-mono">
                          {formatPrice(trade.exit)}
                        </td>
                        <td className="py-3 pr-4 text-sm">{trade.contracts} MES</td>
                        <td className="py-3 pr-4">
                          <span
                            className={cn(
                              "px-2 py-1 rounded text-xs font-semibold",
                              trade.type === "TARGET"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : trade.type === "STOP"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-amber-500/15 text-amber-400"
                            )}
                          >
                            {trade.type}
                          </span>
                        </td>
                        <td
                          className={cn(
                            "py-3 pr-4 text-sm font-semibold",
                            trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                          )}
                        >
                          {formatMoney(trade.pnl)}
                        </td>
                        <td className="py-3 text-sm">{formatMoney(trade.balance)}</td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-neutral-500">
                      No trades yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
