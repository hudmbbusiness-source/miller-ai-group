/**
 * TRADOVATE API CLIENT
 *
 * Direct API integration - NO PickMyTrade middleman
 * Supports both Demo and Live environments
 */

export interface TradovateConfig {
  username: string;
  password: string;
  appId: string;
  appVersion: string;
  cid: string;  // Client ID
  sec: string;  // Client Secret
  mode: 'demo' | 'live';
}

export interface TradovateAuth {
  accessToken: string;
  expirationTime: string;
  userId: number;
  name: string;
}

export interface TradovateAccount {
  id: number;
  name: string;
  userId: number;
  accountType: string;
  active: boolean;
  clearingHouseId: number;
  riskCategoryId: number;
  autoLiqProfileId: number;
  marginAccountType: string;
  legalStatus: string;
  archived: boolean;
  timestamp: string;
}

export interface TradovatePosition {
  id: number;
  accountId: number;
  contractId: number;
  timestamp: string;
  tradeDate: { year: number; month: number; day: number };
  netPos: number;
  netPrice: number;
  bought: number;
  boughtValue: number;
  sold: number;
  soldValue: number;
  prevPos: number;
  prevPrice: number;
}

export interface TradovateOrder {
  accountId: number;
  action: 'Buy' | 'Sell';
  symbol: string;
  orderQty: number;
  orderType: 'Market' | 'Limit' | 'Stop' | 'StopLimit';
  price?: number;
  stopPrice?: number;
  timeInForce?: 'Day' | 'GTC' | 'IOC' | 'FOK';
  isAutomated: boolean;  // Required by CME for automated trading
}

export interface TradovateOrderResult {
  orderId: number;
  orderStatus: string;
  commandStatus?: string;
  failureReason?: string;
}

export interface CashBalance {
  accountId: number;
  timestamp: string;
  tradeDate: { year: number; month: number; day: number };
  currencyId: number;
  amount: number;
  realizedPnL: number;
  weekRealizedPnL: number;
}

class TradovateClient {
  private config: TradovateConfig | null = null;
  private auth: TradovateAuth | null = null;
  private baseUrl: string = '';
  private wsUrl: string = '';
  private mdWsUrl: string = '';
  private accounts: TradovateAccount[] = [];
  private primaryAccountId: number | null = null;

  constructor() {
    // Will be initialized with configure()
  }

  configure(config: TradovateConfig) {
    this.config = config;

    if (config.mode === 'demo') {
      this.baseUrl = 'https://demo.tradovateapi.com/v1';
      this.wsUrl = 'wss://demo.tradovateapi.com/v1/websocket';
      this.mdWsUrl = 'wss://md-demo.tradovateapi.com/v1/websocket';
    } else {
      this.baseUrl = 'https://live.tradovateapi.com/v1';
      this.wsUrl = 'wss://live.tradovateapi.com/v1/websocket';
      this.mdWsUrl = 'wss://md-live.tradovateapi.com/v1/websocket';
    }
  }

  isConfigured(): boolean {
    return this.config !== null &&
           this.config.username !== '' &&
           this.config.password !== '';
  }

  isAuthenticated(): boolean {
    if (!this.auth) return false;
    // Check if token is expired
    const expiry = new Date(this.auth.expirationTime);
    return expiry > new Date();
  }

  /**
   * Authenticate with Tradovate API
   */
  async authenticate(): Promise<TradovateAuth> {
    if (!this.config) {
      throw new Error('Tradovate client not configured. Call configure() first.');
    }

    const response = await fetch(`${this.baseUrl}/auth/accesstokenrequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name: this.config.username,
        password: this.config.password,
        appId: this.config.appId,
        appVersion: this.config.appVersion,
        cid: this.config.cid,
        sec: this.config.sec,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tradovate auth failed: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (data.errorText) {
      throw new Error(`Tradovate auth error: ${data.errorText}`);
    }

    this.auth = {
      accessToken: data.accessToken,
      expirationTime: data.expirationTime,
      userId: data.userId,
      name: data.name,
    };

    // Load accounts after authentication
    await this.loadAccounts();

    return this.auth;
  }

  /**
   * Get authentication headers
   */
  private getHeaders(): HeadersInit {
    if (!this.auth) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }
    return {
      'Authorization': `Bearer ${this.auth.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Load user accounts
   */
  async loadAccounts(): Promise<TradovateAccount[]> {
    const response = await fetch(`${this.baseUrl}/account/list`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to load accounts: ${response.status}`);
    }

    this.accounts = await response.json();

    // Set primary account (first active account)
    const activeAccount = this.accounts.find(a => a.active);
    if (activeAccount) {
      this.primaryAccountId = activeAccount.id;
    }

    return this.accounts;
  }

  /**
   * Get account list
   */
  getAccounts(): TradovateAccount[] {
    return this.accounts;
  }

  /**
   * Get primary account ID
   */
  getPrimaryAccountId(): number | null {
    return this.primaryAccountId;
  }

  /**
   * Set primary account
   */
  setPrimaryAccount(accountId: number): void {
    const account = this.accounts.find(a => a.id === accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }
    this.primaryAccountId = accountId;
  }

  /**
   * Get cash balance for account
   */
  async getCashBalance(accountId?: number): Promise<CashBalance> {
    const accId = accountId || this.primaryAccountId;
    if (!accId) {
      throw new Error('No account specified and no primary account set');
    }

    const response = await fetch(`${this.baseUrl}/cashBalance/getCashBalanceSnapshot?accountId=${accId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get cash balance: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all positions for account
   */
  async getPositions(accountId?: number): Promise<TradovatePosition[]> {
    const accId = accountId || this.primaryAccountId;
    if (!accId) {
      throw new Error('No account specified and no primary account set');
    }

    const response = await fetch(`${this.baseUrl}/position/list`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get positions: ${response.status}`);
    }

    const positions: TradovatePosition[] = await response.json();
    return positions.filter(p => p.accountId === accId);
  }

  /**
   * Get contract details by symbol
   */
  async getContract(symbol: string): Promise<{ id: number; name: string }> {
    const response = await fetch(`${this.baseUrl}/contract/find?name=${encodeURIComponent(symbol)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to find contract: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Place an order
   */
  async placeOrder(order: Omit<TradovateOrder, 'accountId' | 'isAutomated'> & { accountId?: number }): Promise<TradovateOrderResult> {
    const accountId = order.accountId || this.primaryAccountId;
    if (!accountId) {
      throw new Error('No account specified and no primary account set');
    }

    // Get account spec (name)
    const account = this.accounts.find(a => a.id === accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const orderPayload = {
      accountSpec: account.name,
      accountId: accountId,
      action: order.action,
      symbol: order.symbol,
      orderQty: order.orderQty,
      orderType: order.orderType,
      price: order.price,
      stopPrice: order.stopPrice,
      timeInForce: order.timeInForce || 'Day',
      isAutomated: true,  // Required by CME for automated systems
    };

    console.log('[Tradovate] Placing order:', orderPayload);

    const response = await fetch(`${this.baseUrl}/order/placeorder`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to place order: ${response.status} - ${error}`);
    }

    const result = await response.json();

    if (result.failureReason) {
      throw new Error(`Order rejected: ${result.failureReason}`);
    }

    return {
      orderId: result.orderId,
      orderStatus: result.orderStatus || 'Submitted',
      commandStatus: result.commandStatus,
      failureReason: result.failureReason,
    };
  }

  /**
   * Place a market order (convenience method)
   */
  async placeMarketOrder(symbol: string, action: 'Buy' | 'Sell', quantity: number): Promise<TradovateOrderResult> {
    return this.placeOrder({
      symbol,
      action,
      orderQty: quantity,
      orderType: 'Market',
    });
  }

  /**
   * Place a limit order (convenience method)
   */
  async placeLimitOrder(symbol: string, action: 'Buy' | 'Sell', quantity: number, price: number): Promise<TradovateOrderResult> {
    return this.placeOrder({
      symbol,
      action,
      orderQty: quantity,
      orderType: 'Limit',
      price,
    });
  }

  /**
   * Place a stop order (convenience method)
   */
  async placeStopOrder(symbol: string, action: 'Buy' | 'Sell', quantity: number, stopPrice: number): Promise<TradovateOrderResult> {
    return this.placeOrder({
      symbol,
      action,
      orderQty: quantity,
      orderType: 'Stop',
      stopPrice,
    });
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/order/cancelorder`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ orderId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to cancel order: ${response.status} - ${error}`);
    }
  }

  /**
   * Get working orders
   */
  async getWorkingOrders(accountId?: number): Promise<unknown[]> {
    const accId = accountId || this.primaryAccountId;
    if (!accId) {
      throw new Error('No account specified and no primary account set');
    }

    const response = await fetch(`${this.baseUrl}/order/list`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get orders: ${response.status}`);
    }

    const orders = await response.json();
    return orders.filter((o: { accountId: number; ordStatus: string }) =>
      o.accountId === accId &&
      ['Working', 'Submitted', 'Pending'].includes(o.ordStatus)
    );
  }

  /**
   * Liquidate all positions for account
   */
  async liquidatePosition(accountId?: number): Promise<void> {
    const accId = accountId || this.primaryAccountId;
    if (!accId) {
      throw new Error('No account specified and no primary account set');
    }

    const response = await fetch(`${this.baseUrl}/order/liquidateposition`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ accountId: accId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to liquidate position: ${response.status} - ${error}`);
    }
  }

  /**
   * Get WebSocket URL for market data
   */
  getMarketDataWebSocketUrl(): string {
    return this.mdWsUrl;
  }

  /**
   * Get WebSocket URL for orders/positions
   */
  getOrderWebSocketUrl(): string {
    return this.wsUrl;
  }

  /**
   * Get access token for WebSocket authentication
   */
  getAccessToken(): string | null {
    return this.auth?.accessToken || null;
  }

  /**
   * Get current mode (demo/live)
   */
  getMode(): 'demo' | 'live' | null {
    return this.config?.mode || null;
  }
}

// Singleton instance
export const tradovateClient = new TradovateClient();

// Initialize from environment variables
export function initTradovateFromEnv(): boolean {
  const username = process.env.TRADOVATE_USERNAME;
  const password = process.env.TRADOVATE_PASSWORD;
  const appId = process.env.TRADOVATE_APP_ID;
  const appVersion = process.env.TRADOVATE_APP_VERSION || '1.0';
  const cid = process.env.TRADOVATE_CID;
  const sec = process.env.TRADOVATE_SEC;
  const mode = (process.env.TRADOVATE_MODE || 'demo') as 'demo' | 'live';

  if (!username || !password || !appId || !cid || !sec) {
    console.warn('[Tradovate] Missing environment variables. Required: TRADOVATE_USERNAME, TRADOVATE_PASSWORD, TRADOVATE_APP_ID, TRADOVATE_CID, TRADOVATE_SEC');
    return false;
  }

  tradovateClient.configure({
    username,
    password,
    appId,
    appVersion,
    cid,
    sec,
    mode,
  });

  return true;
}
