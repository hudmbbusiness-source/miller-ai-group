/**
 * PickMyTrade Webhook Client
 *
 * Professional integration for executing trades on Apex/Rithmic via PickMyTrade webhooks.
 * This is the execution layer that connects StuntMan signals to live trading.
 *
 * API Endpoint: https://api.pickmytrade.io/v2/add-trade-data
 * Platform: RITHMIC
 */

// =============================================================================
// TYPES
// =============================================================================

export interface PickMyTradeConfig {
  token: string;                    // Your PickMyTrade API token
  accountId: string;                // Rithmic account ID (e.g., "APEX-456334")
  connectionName: string;           // Rithmic connection name (e.g., "RITHMIC1")
  platform: 'RITHMIC';
  defaultSymbol: string;            // Default contract (e.g., "ESH5", "NQH5")
  maxContracts: number;             // Maximum contracts per trade
  enabled: boolean;                 // Kill switch
}

export interface TradeSignal {
  action: 'BUY' | 'SELL' | 'FLAT';  // FLAT = close position
  symbol: string;                    // Contract symbol (ESH5, NQH5, etc.)
  quantity: number;                  // Number of contracts
  orderType: 'MKT' | 'LMT' | 'STP'; // Market, Limit, or Stop
  price?: number;                    // Required for LMT/STP orders
  stopLoss?: number;                 // Stop loss price
  takeProfit?: number;               // Take profit price
  dollarStopLoss?: number;           // Stop loss in dollars
  dollarTakeProfit?: number;         // Take profit in dollars
  reason?: string;                   // Signal reason for logging
}

export interface PickMyTradePayload {
  symbol: string;
  date: string;
  data: 'buy' | 'sell' | 'flat';
  quantity: number;
  risk_percentage: number;
  price: number | string;
  tp: number;
  percentage_tp: number;
  dollar_tp: number;
  sl: number;
  dollar_sl: number;
  percentage_sl: number;
  order_type: 'MKT' | 'LMT' | 'STP';
  update_tp: boolean;
  update_sl: boolean;
  token: string;
  duplicate_position_allow: boolean;
  platform: 'RITHMIC';
  connection_name: string;          // CRITICAL: Must match your Rithmic connection name
  reverse_order_close: boolean;
  multiple_accounts: {
    token: string;                // Required per docs
    account_id: string;           // Account identifier
    connection_name: string;      // Rithmic connection name
    quantity_multiplier: number;  // Was "quantity", docs say "quantity_multiplier"
  }[];
}

export interface TradeResult {
  // EXECUTION STATE - Based on PickMyTrade response ONLY
  // NOTE: This does NOT confirm Rithmic fill - only that PickMyTrade accepted the request
  success: boolean;              // True = PickMyTrade accepted (HTTP 200 + no error message)
  orderId?: string;              // Order ID from PickMyTrade (NOT Rithmic order ID)
  message: string;               // Human-readable status
  timestamp: number;
  signal: TradeSignal;
  response?: any;                // Raw PickMyTrade response for debugging

  // EXECUTION VERIFICATION FLAGS
  pickMyTradeAccepted: boolean;  // PickMyTrade API returned success
  rithmicConfirmed: boolean;     // ALWAYS FALSE - we cannot verify Rithmic fills via API
  warningMessage?: string;       // Any warning from PickMyTrade (e.g., "USER HAS NO PERMISSION")
}

// =============================================================================
// PICKMYTRADE CLIENT
// =============================================================================

const PICKMYTRADE_API = 'https://api.pickmytrade.io/v2/add-trade-data';

export class PickMyTradeClient {
  private config: PickMyTradeConfig;
  private tradeHistory: TradeResult[] = [];
  private dailyTrades: number = 0;
  private dailyPnL: number = 0;
  private lastTradeTime: number = 0;
  private minTimeBetweenTrades: number = 5000; // 5 seconds minimum between trades

  constructor(config: PickMyTradeConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.token) {
      throw new Error('PickMyTrade token is required');
    }
    if (!this.config.accountId) {
      throw new Error('Account ID is required');
    }
    if (this.config.maxContracts < 1 || this.config.maxContracts > 17) {
      throw new Error('Max contracts must be between 1 and 17 for Apex 150K');
    }
  }

  /**
   * Execute a trade signal via PickMyTrade webhook
   */
  async executeSignal(signal: TradeSignal): Promise<TradeResult> {
    // Safety checks
    if (!this.config.enabled) {
      return {
        success: false,
        message: 'Trading is disabled',
        timestamp: Date.now(),
        signal,
      };
    }

    // Rate limiting
    const timeSinceLastTrade = Date.now() - this.lastTradeTime;
    if (timeSinceLastTrade < this.minTimeBetweenTrades) {
      return {
        success: false,
        message: `Rate limited. Wait ${this.minTimeBetweenTrades - timeSinceLastTrade}ms`,
        timestamp: Date.now(),
        signal,
      };
    }

    // Validate quantity (FLAT orders can have 0 quantity)
    const quantity = signal.action === 'FLAT' ? 1 : Math.min(signal.quantity, this.config.maxContracts);
    if (signal.action !== 'FLAT' && quantity < 1) {
      return {
        success: false,
        message: 'Invalid quantity',
        timestamp: Date.now(),
        signal,
      };
    }

    // Build payload
    const payload = this.buildPayload(signal, quantity);

    try {
      console.log(`[PickMyTrade] Executing: ${signal.action} ${quantity}x ${signal.symbol}`);

      // CRITICAL DEBUG: Log full payload for SELL orders to diagnose permission issue
      if (signal.action === 'SELL') {
        console.log(`[PickMyTrade SELL DEBUG] Full payload:`, JSON.stringify(payload, null, 2));
        console.log(`[PickMyTrade SELL DEBUG] account_id in payload: ${payload.multiple_accounts[0].account_id}`);
        console.log(`[PickMyTrade SELL DEBUG] connection_name: ${payload.connection_name}`);
        console.log(`[PickMyTrade SELL DEBUG] price: ${payload.price}`);
      }

      const response = await fetch(PICKMYTRADE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      // =======================================================================
      // CRITICAL: Parse PickMyTrade response and check for ACTUAL success
      // HTTP 200 does NOT mean the order was filled by Rithmic!
      // =======================================================================

      // Check for error messages in response (PickMyTrade returns 200 even for failures)
      const responseMessage = responseData?.message || responseData?.msg || '';
      const hasPermissionError = responseMessage.toLowerCase().includes('permission') ||
                                  responseMessage.toLowerCase().includes('denied') ||
                                  responseMessage.toLowerCase().includes('not allowed');
      const hasPriceError = responseMessage.toLowerCase().includes('price not found') ||
                            responseMessage.toLowerCase().includes('invalid price');
      const hasAccountError = responseMessage.toLowerCase().includes('account') ||
                              responseMessage.toLowerCase().includes('invalid') ||
                              responseMessage.toLowerCase().includes('not found');

      const hasAnyError = hasPermissionError || hasPriceError || hasAccountError ||
                          responseMessage.toLowerCase().includes('error') ||
                          responseMessage.toLowerCase().includes('fail') ||
                          responseMessage.toLowerCase().includes('reject');

      if (response.ok && !hasAnyError) {
        this.lastTradeTime = Date.now();
        this.dailyTrades++;

        const result: TradeResult = {
          success: true,
          orderId: responseData.orderId, // DO NOT generate fake IDs
          message: `Order SENT to PickMyTrade: ${signal.action} ${quantity}x ${signal.symbol} (VERIFY IN RITHMIC/APEX)`,
          timestamp: Date.now(),
          signal,
          response: responseData,
          pickMyTradeAccepted: true,
          rithmicConfirmed: false, // WE CANNOT VERIFY THIS
          warningMessage: undefined,
        };

        this.tradeHistory.push(result);
        console.log(`[PickMyTrade] SENT (not confirmed):`, result.message);
        console.warn(`[PickMyTrade] WARNING: Order sent but Rithmic fill NOT verified. Check Apex account manually.`);
        return result;
      } else {
        // CRITICAL: Order was REJECTED - halt trading immediately
        console.error(`[PickMyTrade] ORDER REJECTED:`, responseMessage);

        // HALT AUTO-TRADING ON ANY REJECTION
        this.config.enabled = false;
        console.error(`[PickMyTrade] AUTO-TRADING HALTED due to order rejection`);

        const result: TradeResult = {
          success: false,
          message: responseMessage || 'Order rejected by PickMyTrade',
          timestamp: Date.now(),
          signal,
          response: responseData,
          pickMyTradeAccepted: false,
          rithmicConfirmed: false,
          warningMessage: responseMessage,
        };

        this.tradeHistory.push(result);
        return result;
      }
    } catch (error) {
      // CRITICAL: Network error - halt trading
      console.error(`[PickMyTrade] NETWORK ERROR - HALTING TRADING`);
      this.config.enabled = false;

      const result: TradeResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
        timestamp: Date.now(),
        signal,
        pickMyTradeAccepted: false,
        rithmicConfirmed: false,
        warningMessage: 'Network error - trading halted',
      };

      this.tradeHistory.push(result);
      console.error(`[PickMyTrade] Error:`, result.message);
      return result;
    }
  }

  /**
   * Build the PickMyTrade API payload
   */
  private buildPayload(signal: TradeSignal, quantity: number): PickMyTradePayload {
    return {
      symbol: signal.symbol,
      date: new Date().toISOString(),
      data: signal.action.toLowerCase() as 'buy' | 'sell' | 'flat',
      quantity: quantity,
      risk_percentage: 0,
      price: signal.price || 0,
      tp: signal.takeProfit || 0,
      percentage_tp: 0,
      dollar_tp: signal.dollarTakeProfit || 0,
      sl: signal.stopLoss || 0,
      dollar_sl: signal.dollarStopLoss || 0,
      percentage_sl: 0,
      order_type: signal.orderType,
      update_tp: false,
      update_sl: false,
      token: this.config.token,
      duplicate_position_allow: false,
      platform: 'RITHMIC',
      connection_name: this.config.connectionName, // CRITICAL: Links to your Rithmic connection
      reverse_order_close: true, // Close opposite position when entering
      multiple_accounts: [
        {
          token: this.config.token,                    // Required per docs
          account_id: this.config.accountId,           // Account identifier
          connection_name: this.config.connectionName, // Required per docs
          quantity_multiplier: quantity,               // Was "quantity", docs say "quantity_multiplier"
        },
      ],
    };
  }

  /**
   * Quick methods for common operations
   */
  async buyMarket(symbol: string, quantity: number, stopLoss?: number, takeProfit?: number, referencePrice?: number): Promise<TradeResult> {
    return this.executeSignal({
      action: 'BUY',
      symbol,
      quantity,
      orderType: 'MKT',
      stopLoss,
      takeProfit,
      price: referencePrice, // PickMyTrade needs reference price to avoid "Price Not Found"
    });
  }

  async sellMarket(symbol: string, quantity: number, stopLoss?: number, takeProfit?: number, referencePrice?: number): Promise<TradeResult> {
    return this.executeSignal({
      action: 'SELL',
      symbol,
      quantity,
      orderType: 'MKT',
      stopLoss,
      takeProfit,
      price: referencePrice, // PickMyTrade needs reference price to avoid "Price Not Found"
    });
  }

  async closePosition(symbol: string): Promise<TradeResult> {
    return this.executeSignal({
      action: 'FLAT',
      symbol,
      quantity: 0, // Quantity ignored for FLAT
      orderType: 'MKT',
    });
  }

  /**
   * Emergency stop - close all positions and disable trading
   */
  async emergencyStop(): Promise<void> {
    console.log('[PickMyTrade] EMERGENCY STOP ACTIVATED');
    this.config.enabled = false;

    // Close position on default symbol
    await this.closePosition(this.config.defaultSymbol);
  }

  /**
   * Getters
   */
  get isEnabled(): boolean {
    return this.config.enabled;
  }

  get trades(): TradeResult[] {
    return [...this.tradeHistory];
  }

  get todaysTrades(): number {
    return this.dailyTrades;
  }

  /**
   * Enable/disable trading
   */
  enable(): void {
    this.config.enabled = true;
    console.log('[PickMyTrade] Trading ENABLED');
  }

  disable(): void {
    this.config.enabled = false;
    console.log('[PickMyTrade] Trading DISABLED');
  }

  /**
   * Reset daily counters (call at start of trading day)
   */
  resetDaily(): void {
    this.dailyTrades = 0;
    this.dailyPnL = 0;
    console.log('[PickMyTrade] Daily counters reset');
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PickMyTradeConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

let clientInstance: PickMyTradeClient | null = null;

export function getPickMyTradeClient(): PickMyTradeClient | null {
  return clientInstance;
}

export function initializePickMyTrade(config: PickMyTradeConfig): PickMyTradeClient {
  clientInstance = new PickMyTradeClient(config);
  return clientInstance;
}

// =============================================================================
// HELPER: Get current ES/NQ contract symbol
// =============================================================================

export function getCurrentContractSymbol(instrument: 'ES' | 'NQ'): string {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear() % 10; // FIXED: Single digit year (6 for 2026, not 26)

  // Futures contract months: H (Mar), M (Jun), U (Sep), Z (Dec)
  // Roll typically happens ~1 week before expiration
  const contractMonths = [
    { code: 'H', expMonth: 2 },  // March
    { code: 'M', expMonth: 5 },  // June
    { code: 'U', expMonth: 8 },  // September
    { code: 'Z', expMonth: 11 }, // December
  ];

  // Find current contract
  for (let i = 0; i < contractMonths.length; i++) {
    const contract = contractMonths[i];
    if (month <= contract.expMonth) {
      return `${instrument}${contract.code}${year}`;
    }
  }

  // Roll to next year's March contract
  return `${instrument}H${(year + 1) % 10}`;
}

// =============================================================================
// ES/NQ SPECIFIC HELPERS
// =============================================================================

export const ES_TICK_VALUE = 12.50;  // $12.50 per tick (0.25 points)
export const NQ_TICK_VALUE = 5.00;   // $5.00 per tick (0.25 points)
export const ES_POINT_VALUE = 50;    // $50 per point
export const NQ_POINT_VALUE = 20;    // $20 per point

export function calculateStopLoss(
  entryPrice: number,
  dollarRisk: number,
  contracts: number,
  instrument: 'ES' | 'NQ'
): number {
  const pointValue = instrument === 'ES' ? ES_POINT_VALUE : NQ_POINT_VALUE;
  const pointsRisk = dollarRisk / (contracts * pointValue);
  return entryPrice - pointsRisk;
}

export function calculateTakeProfit(
  entryPrice: number,
  dollarTarget: number,
  contracts: number,
  instrument: 'ES' | 'NQ'
): number {
  const pointValue = instrument === 'ES' ? ES_POINT_VALUE : NQ_POINT_VALUE;
  const pointsTarget = dollarTarget / (contracts * pointValue);
  return entryPrice + pointsTarget;
}

export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  stopLossPoints: number,
  instrument: 'ES' | 'NQ',
  maxContracts: number = 17
): number {
  const pointValue = instrument === 'ES' ? ES_POINT_VALUE : NQ_POINT_VALUE;
  const dollarRisk = accountBalance * (riskPercent / 100);
  const riskPerContract = stopLossPoints * pointValue;
  const contracts = Math.floor(dollarRisk / riskPerContract);
  return Math.min(Math.max(1, contracts), maxContracts);
}
