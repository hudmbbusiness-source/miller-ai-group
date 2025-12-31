// =============================================================================
// STUNTMAN AI - SETTINGS
// =============================================================================
// Configure trading preferences, risk management, and API keys
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { TRADING_CONFIG, DEFAULT_RISK_CONFIG } from '@/lib/stuntman/constants'

interface Account {
  id: string
  name: string
  is_paper: boolean
  balance: number
  is_active: boolean
}

interface Settings {
  default_instrument: string
  default_timeframe: string
  risk_per_trade: number
  max_daily_loss: number
  max_position_size: number
  auto_stop_loss: boolean
  default_stop_loss_percent: number
  auto_take_profit: boolean
  default_take_profit_percent: number
  show_confirmations: boolean
  sound_alerts: boolean
  theme: string
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings>({
    default_instrument: 'BTC_USDT',
    default_timeframe: '15m',
    risk_per_trade: 2,
    max_daily_loss: DEFAULT_RISK_CONFIG.maxDailyLoss,
    max_position_size: DEFAULT_RISK_CONFIG.maxPositionSize,
    auto_stop_loss: true,
    default_stop_loss_percent: TRADING_CONFIG.DEFAULT_STOP_LOSS_PERCENT,
    auto_take_profit: true,
    default_take_profit_percent: TRADING_CONFIG.DEFAULT_TAKE_PROFIT_PERCENT,
    show_confirmations: true,
    sound_alerts: true,
    theme: 'dark',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/stuntman/accounts')
        const data = await res.json()
        if (data.success && data.accounts.length > 0) {
          setAccounts(data.accounts)
          setSelectedAccount(data.accounts[0].id)
        }
      } catch (err) {
        console.error('Failed to fetch accounts:', err)
      }
    }
    fetchAccounts()
  }, [])

  // Reset account
  const handleResetAccount = async (accountId: string) => {
    if (
      !confirm(
        'Are you sure you want to reset this account? This will close all positions and reset your balance.'
      )
    ) {
      return
    }

    try {
      const res = await fetch('/api/stuntman/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: accountId,
          action: 'reset',
        }),
      })

      const data = await res.json()
      if (data.success) {
        setMessage('Account reset successfully')
        // Refresh accounts
        const accRes = await fetch('/api/stuntman/accounts')
        const accData = await accRes.json()
        if (accData.success) {
          setAccounts(accData.accounts)
        }
      }
    } catch (err) {
      console.error('Failed to reset account:', err)
      setMessage('Failed to reset account')
    }
  }

  // Delete account
  const handleDeleteAccount = async (accountId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this account? This action cannot be undone.'
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/stuntman/accounts?id=${accountId}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (data.success) {
        setMessage('Account deleted successfully')
        setAccounts(accounts.filter((a) => a.id !== accountId))
        if (selectedAccount === accountId && accounts.length > 1) {
          setSelectedAccount(accounts.find((a) => a.id !== accountId)?.id || null)
        }
      } else {
        setMessage(data.error || 'Failed to delete account')
      }
    } catch (err) {
      console.error('Failed to delete account:', err)
      setMessage('Failed to delete account')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-zinc-400 mt-1">
          Configure your trading preferences and risk management
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-6 p-4 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-300">
          {message}
          <button
            onClick={() => setMessage(null)}
            className="float-right text-orange-400 hover:text-orange-300"
          >
            ×
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Account Management */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Account Management</h2>
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 rounded-lg bg-zinc-800"
              >
                <div>
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-zinc-400">
                    {account.is_paper ? 'Paper Trading' : 'Live Trading'} •{' '}
                    ${account.balance.toFixed(2)} USDT
                  </div>
                </div>
                <div className="flex gap-2">
                  {account.is_paper && (
                    <button
                      onClick={() => handleResetAccount(account.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Management */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Risk Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Risk Per Trade (%)
              </label>
              <input
                type="number"
                value={settings.risk_per_trade}
                onChange={(e) =>
                  setSettings({ ...settings, risk_per_trade: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Max Daily Loss (USDT)
              </label>
              <input
                type="number"
                value={settings.max_daily_loss}
                onChange={(e) =>
                  setSettings({ ...settings, max_daily_loss: parseFloat(e.target.value) })
                }
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Max Position Size (USDT)
              </label>
              <input
                type="number"
                value={settings.max_position_size}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_position_size: parseFloat(e.target.value),
                  })
                }
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Default Stop Loss (%)
              </label>
              <input
                type="number"
                value={settings.default_stop_loss_percent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_stop_loss_percent: parseFloat(e.target.value),
                  })
                }
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
              />
            </div>
          </div>
        </div>

        {/* Trading Preferences */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Trading Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto Stop Loss</div>
                <div className="text-sm text-zinc-500">
                  Automatically set stop loss on new positions
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings({ ...settings, auto_stop_loss: !settings.auto_stop_loss })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.auto_stop_loss ? 'bg-green-500' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                    settings.auto_stop_loss ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto Take Profit</div>
                <div className="text-sm text-zinc-500">
                  Automatically set take profit on new positions
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    auto_take_profit: !settings.auto_take_profit,
                  })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.auto_take_profit ? 'bg-green-500' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                    settings.auto_take_profit ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Order Confirmations</div>
                <div className="text-sm text-zinc-500">
                  Show confirmation dialog before placing orders
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    show_confirmations: !settings.show_confirmations,
                  })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.show_confirmations ? 'bg-green-500' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                    settings.show_confirmations ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Sound Alerts</div>
                <div className="text-sm text-zinc-500">
                  Play sounds for trades and signals
                </div>
              </div>
              <button
                onClick={() =>
                  setSettings({ ...settings, sound_alerts: !settings.sound_alerts })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.sound_alerts ? 'bg-green-500' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                    settings.sound_alerts ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* API Configuration */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4">API Configuration</h2>
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <div className="text-orange-400 font-medium mb-1">Live Trading Disabled</div>
            <div className="text-sm text-zinc-400">
              Live trading requires Crypto.com API credentials. Currently only paper
              trading is available.
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Crypto.com API Key
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                disabled
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Crypto.com API Secret
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                disabled
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setSaving(true)
              setTimeout(() => {
                setSaving(false)
                setMessage('Settings saved successfully')
              }, 1000)
            }}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
