/**
 * Rithmic API Client for Apex Prop Firm Integration
 *
 * Provides real-time account data, positions, and order management
 * through Rithmic's trading infrastructure.
 *
 * Connection Methods:
 * 1. Rithmic Protocol Buffer API (requires Rithmic SDK license)
 * 2. PickMyTrade webhook sync (for trade execution feedback)
 * 3. Manual sync from Apex dashboard
 *
 * Note: For full Rithmic API access, you need:
 * - Rithmic System ID (from your prop firm)
 * - API credentials from Rithmic
 * - Protocol Buffer definitions
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RithmicCredentials {
  systemId: string;           // e.g., "Apex-Demo" or production system
  userId: string;             // Your Rithmic user ID
  password: string;           // API password
  gateway: RithmicGateway;
  fcmId?: string;             // FCM ID for order routing
  ibId?: string;              // IB ID for order routing
}

export type RithmicGateway =
  | 'paper'                   // Paper trading
  | 'apex_paper'              // Apex paper/demo
  | 'apex_live'               // Apex live trading
  | 'topstep_paper'           // Topstep demo
  | 'topstep_live';           // Topstep live

export interface RithmicAccountData {
  accountId: string;
  fcmId: string;
  ibId: string;
  accountName: string;
  accountType: 'PAPER' | 'LIVE' | 'EVAL';
  currency: string;
  balance: {
    cashBalance: number;
    openPnL: number;
    closedPnL: number;
    totalPnL: number;
    buyingPower: number;
    netLiquidation: number;
    marginUsed: number;
    marginAvailable: number;
  };
  limits: {
    maxPositionSize: number;
    maxDailyLoss: number;
    trailingDrawdown: number;
    profitTarget: number;
  };
  status: 'ACTIVE' | 'RESTRICTED' | 'VIOLATED' | 'PASSED';
  lastUpdate: number;
}

export interface RithmicPosition {
  accountId: string;
  symbol: string;
  exchange: string;
  quantity: number;           // Positive = long, negative = short
  averagePrice: number;
  currentPrice: number;
  openPnL: number;
  closedPnL: number;
  marginRequired: number;
  timestamp: number;
}

export interface RithmicOrder {
  orderId: string;
  accountId: string;
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  filledQuantity: number;
  price?: number;
  stopPrice?: number;
  status: 'PENDING' | 'OPEN' | 'PARTIAL' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  timestamp: number;
  fillPrice?: number;
  commission?: number;
}

export interface RithmicTrade {
  tradeId: string;
  orderId: string;
  accountId: string;
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  commission: number;
  timestamp: number;
}

export interface RithmicMarketData {
  symbol: string;
  exchange: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  bidSize: number;
  askSize: number;
  volume: number;
  openInterest: number;
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: number;
}

// ============================================================================
// GATEWAY CONFIGURATION
// ============================================================================

const GATEWAY_CONFIG: Record<RithmicGateway, { host: string; port: number; ssl: boolean }> = {
  paper: {
    host: 'rituz00100.rithmic.com',
    port: 443,
    ssl: true,
  },
  apex_paper: {
    host: 'apex-paper.rithmic.com',
    port: 443,
    ssl: true,
  },
  apex_live: {
    host: 'apex-live.rithmic.com',
    port: 443,
    ssl: true,
  },
  topstep_paper: {
    host: 'topstep-paper.rithmic.com',
    port: 443,
    ssl: true,
  },
  topstep_live: {
    host: 'topstep-live.rithmic.com',
    port: 443,
    ssl: true,
  },
};

// ============================================================================
// MANUAL SYNC DATA STORAGE
// ============================================================================

interface StoredAccountData {
  data: RithmicAccountData;
  positions: RithmicPosition[];
  trades: RithmicTrade[];
  syncedAt: number;
  source: 'manual' | 'webhook' | 'api';
}

let storedData: StoredAccountData | null = null;

// ============================================================================
// RITHMIC CLIENT CLASS
// ============================================================================

export class RithmicClient {
  private credentials: RithmicCredentials | null = null;
  private connected: boolean = false;
  private accountData: RithmicAccountData | null = null;
  private positions: Map<string, RithmicPosition> = new Map();
  private orders: Map<string, RithmicOrder> = new Map();
  private trades: RithmicTrade[] = [];

  // Event handlers
  private onAccountUpdate?: (data: RithmicAccountData) => void;
  private onPositionUpdate?: (position: RithmicPosition) => void;
  private onOrderUpdate?: (order: RithmicOrder) => void;
  private onTradeUpdate?: (trade: RithmicTrade) => void;
  private onError?: (error: Error) => void;

  constructor() {
    // Load stored data if available
    this.loadStoredData();
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  /**
   * Initialize with credentials (for future API connection)
   */
  async initialize(credentials: RithmicCredentials): Promise<boolean> {
    this.credentials = credentials;

    // Note: Full Rithmic API requires their Protocol Buffer SDK
    // This is a placeholder for when API access is available
    console.log('Rithmic client initialized with credentials');
    console.log('Full API connection requires Rithmic SDK license');

    return true;
  }

  /**
   * Connect to Rithmic servers
   * Note: Requires Rithmic Protocol Buffer implementation
   */
  async connect(): Promise<boolean> {
    if (!this.credentials) {
      throw new Error('Credentials not set. Call initialize() first.');
    }

    // Placeholder for actual Rithmic connection
    // In production, this would:
    // 1. Open WebSocket/TCP connection to Rithmic gateway
    // 2. Send login request with credentials
    // 3. Subscribe to account updates, positions, orders

    console.log('Rithmic connection placeholder');
    console.log('For full API access, integrate Rithmic Protocol Buffer SDK');

    // For now, use stored/manual data
    this.connected = storedData !== null;
    return this.connected;
  }

  /**
   * Disconnect from Rithmic
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('Rithmic client disconnected');
  }

  isConnected(): boolean {
    return this.connected || storedData !== null;
  }

  // ============================================================================
  // MANUAL DATA SYNC
  // ============================================================================

  /**
   * Manually sync account data from Apex dashboard
   * Users can copy values from their Apex account page
   */
  syncManualData(data: {
    accountId: string;
    balance: number;
    openPnL: number;
    closedPnL: number;
    trailingDrawdown: number;
    tradingDays: number;
    positions?: Array<{
      symbol: string;
      quantity: number;
      avgPrice: number;
      currentPrice: number;
    }>;
  }): RithmicAccountData {
    const accountData: RithmicAccountData = {
      accountId: data.accountId,
      fcmId: 'APEX',
      ibId: data.accountId,
      accountName: `Apex ${data.accountId}`,
      accountType: 'EVAL',
      currency: 'USD',
      balance: {
        cashBalance: data.balance,
        openPnL: data.openPnL,
        closedPnL: data.closedPnL,
        totalPnL: data.openPnL + data.closedPnL,
        buyingPower: data.balance + data.openPnL,
        netLiquidation: data.balance + data.openPnL,
        marginUsed: 0,
        marginAvailable: data.balance,
      },
      limits: {
        maxPositionSize: 17,      // Apex 150K account limit
        maxDailyLoss: 2500,       // Typical daily loss limit
        trailingDrawdown: 5000,   // Apex 150K trailing drawdown
        profitTarget: 9000,       // Apex 150K profit target
      },
      status: data.trailingDrawdown < 5000 ? 'ACTIVE' : 'VIOLATED',
      lastUpdate: Date.now(),
    };

    // Process positions
    const positions: RithmicPosition[] = (data.positions || []).map(p => ({
      accountId: data.accountId,
      symbol: p.symbol,
      exchange: 'CME',
      quantity: p.quantity,
      averagePrice: p.avgPrice,
      currentPrice: p.currentPrice,
      openPnL: (p.currentPrice - p.avgPrice) * p.quantity * getContractMultiplier(p.symbol),
      closedPnL: 0,
      marginRequired: getMarginRequired(p.symbol, Math.abs(p.quantity)),
      timestamp: Date.now(),
    }));

    // Store the data
    storedData = {
      data: accountData,
      positions,
      trades: [],
      syncedAt: Date.now(),
      source: 'manual',
    };

    this.accountData = accountData;
    this.positions.clear();
    positions.forEach(p => this.positions.set(p.symbol, p));

    // Save to localStorage for persistence
    this.saveStoredData();

    return accountData;
  }

  /**
   * Process webhook data from PickMyTrade
   * Updates account state based on executed trades
   */
  processWebhookUpdate(webhookData: {
    action: 'FILLED' | 'CANCELLED' | 'REJECTED';
    orderId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    timestamp: number;
  }): void {
    if (webhookData.action !== 'FILLED') return;

    const trade: RithmicTrade = {
      tradeId: `T${Date.now()}`,
      orderId: webhookData.orderId,
      accountId: this.accountData?.accountId || 'APEX-456334',
      symbol: webhookData.symbol,
      exchange: 'CME',
      side: webhookData.side,
      quantity: webhookData.quantity,
      price: webhookData.price,
      commission: 0.54 * webhookData.quantity, // Standard commission
      timestamp: webhookData.timestamp,
    };

    this.trades.push(trade);

    // Update position
    const existingPosition = this.positions.get(webhookData.symbol);
    const direction = webhookData.side === 'BUY' ? 1 : -1;
    const newQuantity = (existingPosition?.quantity || 0) + (webhookData.quantity * direction);

    if (newQuantity !== 0) {
      const avgPrice = existingPosition
        ? ((existingPosition.averagePrice * Math.abs(existingPosition.quantity)) +
           (webhookData.price * webhookData.quantity)) /
          (Math.abs(existingPosition.quantity) + webhookData.quantity)
        : webhookData.price;

      this.positions.set(webhookData.symbol, {
        accountId: trade.accountId,
        symbol: webhookData.symbol,
        exchange: 'CME',
        quantity: newQuantity,
        averagePrice: avgPrice,
        currentPrice: webhookData.price,
        openPnL: 0,
        closedPnL: 0,
        marginRequired: getMarginRequired(webhookData.symbol, Math.abs(newQuantity)),
        timestamp: Date.now(),
      });
    } else {
      this.positions.delete(webhookData.symbol);
    }

    // Update stored data
    if (storedData) {
      storedData.trades.push(trade);
      storedData.positions = Array.from(this.positions.values());
      storedData.syncedAt = Date.now();
      storedData.source = 'webhook';
      this.saveStoredData();
    }

    // Trigger callbacks
    if (this.onTradeUpdate) this.onTradeUpdate(trade);
    if (this.onPositionUpdate && this.positions.has(webhookData.symbol)) {
      this.onPositionUpdate(this.positions.get(webhookData.symbol)!);
    }
  }

  // ============================================================================
  // DATA RETRIEVAL
  // ============================================================================

  getAccountData(): RithmicAccountData | null {
    return this.accountData || storedData?.data || null;
  }

  getPositions(): RithmicPosition[] {
    return Array.from(this.positions.values()) || storedData?.positions || [];
  }

  getPosition(symbol: string): RithmicPosition | undefined {
    return this.positions.get(symbol);
  }

  getOrders(): RithmicOrder[] {
    return Array.from(this.orders.values());
  }

  getTrades(limit: number = 100): RithmicTrade[] {
    const allTrades = [...this.trades, ...(storedData?.trades || [])];
    return allTrades.slice(-limit);
  }

  getLastSyncTime(): number {
    return storedData?.syncedAt || 0;
  }

  getDataSource(): 'manual' | 'webhook' | 'api' | 'none' {
    return storedData?.source || 'none';
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  onAccount(handler: (data: RithmicAccountData) => void): void {
    this.onAccountUpdate = handler;
  }

  onPosition(handler: (position: RithmicPosition) => void): void {
    this.onPositionUpdate = handler;
  }

  onOrder(handler: (order: RithmicOrder) => void): void {
    this.onOrderUpdate = handler;
  }

  onTrade(handler: (trade: RithmicTrade) => void): void {
    this.onTradeUpdate = handler;
  }

  onConnectionError(handler: (error: Error) => void): void {
    this.onError = handler;
  }

  // ============================================================================
  // ORDER MANAGEMENT (via PickMyTrade webhook)
  // ============================================================================

  /**
   * Submit order via PickMyTrade webhook
   * This is the actual execution path for Apex accounts
   */
  async submitOrder(order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    orderType: 'MARKET' | 'LIMIT' | 'STOP';
    price?: number;
    stopPrice?: number;
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    // This would call the existing webhook executor
    // For now, return a placeholder
    const orderId = `O${Date.now()}`;

    const rithmicOrder: RithmicOrder = {
      orderId,
      accountId: this.accountData?.accountId || 'APEX-456334',
      symbol: order.symbol,
      exchange: 'CME',
      side: order.side,
      orderType: order.orderType,
      quantity: order.quantity,
      filledQuantity: 0,
      price: order.price,
      stopPrice: order.stopPrice,
      status: 'PENDING',
      timestamp: Date.now(),
    };

    this.orders.set(orderId, rithmicOrder);

    if (this.onOrderUpdate) {
      this.onOrderUpdate(rithmicOrder);
    }

    return { success: true, orderId };
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) return false;

    order.status = 'CANCELLED';
    if (this.onOrderUpdate) {
      this.onOrderUpdate(order);
    }

    return true;
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private saveStoredData(): void {
    if (typeof window !== 'undefined' && storedData) {
      try {
        localStorage.setItem('rithmic_data', JSON.stringify(storedData));
      } catch (e) {
        console.error('Failed to save Rithmic data:', e);
      }
    }
  }

  private loadStoredData(): void {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rithmic_data');
        if (saved) {
          storedData = JSON.parse(saved);
          if (storedData) {
            this.accountData = storedData.data;
            storedData.positions.forEach(p => this.positions.set(p.symbol, p));
            this.trades = storedData.trades;
          }
        }
      } catch (e) {
        console.error('Failed to load Rithmic data:', e);
      }
    }
  }

  /**
   * Clear all stored data
   */
  clearData(): void {
    storedData = null;
    this.accountData = null;
    this.positions.clear();
    this.orders.clear();
    this.trades = [];

    if (typeof window !== 'undefined') {
      localStorage.removeItem('rithmic_data');
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getContractMultiplier(symbol: string): number {
  const multipliers: Record<string, number> = {
    'ES': 50,     // E-mini S&P 500
    'NQ': 20,     // E-mini Nasdaq
    'MES': 5,     // Micro E-mini S&P 500
    'MNQ': 2,     // Micro E-mini Nasdaq
    'RTY': 50,    // E-mini Russell 2000
    'M2K': 5,     // Micro E-mini Russell
    'YM': 5,      // E-mini Dow
    'MYM': 0.5,   // Micro E-mini Dow
    'CL': 1000,   // Crude Oil
    'MCL': 100,   // Micro Crude Oil
    'GC': 100,    // Gold
    'MGC': 10,    // Micro Gold
    'SI': 5000,   // Silver
    'HG': 25000,  // Copper
    'NG': 10000,  // Natural Gas
  };

  return multipliers[symbol] || 1;
}

function getMarginRequired(symbol: string, quantity: number): number {
  // Approximate day trading margins
  const margins: Record<string, number> = {
    'ES': 500,
    'NQ': 500,
    'MES': 50,
    'MNQ': 50,
    'RTY': 500,
    'M2K': 50,
    'YM': 500,
    'MYM': 50,
    'CL': 500,
    'MCL': 50,
    'GC': 1000,
    'MGC': 100,
  };

  return (margins[symbol] || 500) * quantity;
}

// ============================================================================
// APEX ACCOUNT CONFIGURATIONS
// ============================================================================

export const APEX_ACCOUNT_CONFIGS = {
  '25K': {
    name: 'Apex 25K',
    startingBalance: 25000,
    profitTarget: 1500,
    trailingDrawdown: 1500,
    maxContracts: 3,
    maxDailyLoss: 500,
  },
  '50K': {
    name: 'Apex 50K',
    startingBalance: 50000,
    profitTarget: 3000,
    trailingDrawdown: 2500,
    maxContracts: 6,
    maxDailyLoss: 1100,
  },
  '100K': {
    name: 'Apex 100K',
    startingBalance: 100000,
    profitTarget: 6000,
    trailingDrawdown: 3000,
    maxContracts: 12,
    maxDailyLoss: 2200,
  },
  '150K': {
    name: 'Apex 150K',
    startingBalance: 150000,
    profitTarget: 9000,
    trailingDrawdown: 5000,
    maxContracts: 17,
    maxDailyLoss: 2500,
  },
  '250K': {
    name: 'Apex 250K',
    startingBalance: 250000,
    profitTarget: 15000,
    trailingDrawdown: 6500,
    maxContracts: 27,
    maxDailyLoss: 4500,
  },
  '300K': {
    name: 'Apex 300K',
    startingBalance: 300000,
    profitTarget: 20000,
    trailingDrawdown: 7500,
    maxContracts: 35,
    maxDailyLoss: 5500,
  },
};

// Export singleton instance
export const rithmicClient = new RithmicClient();
