/**
 * TRADOVATE WEBSOCKET CLIENT
 *
 * Real-time market data streaming and order updates
 * Uses Tradovate's WebSocket API for:
 * - Live price ticks (no delay!)
 * - Order book depth
 * - Order/position updates
 */

import { tradovateClient } from './tradovate-client';

export interface MarketDataTick {
  symbol: string;
  timestamp: number;
  price: number;
  size: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
}

export interface DOMLevelUpdate {
  symbol: string;
  timestamp: number;
  bids: { price: number; size: number }[];
  asks: { price: number; size: number }[];
}

export interface BarData {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type MessageHandler = (data: unknown) => void;
type TickHandler = (tick: MarketDataTick) => void;
type BarHandler = (bar: BarData) => void;
type DOMHandler = (dom: DOMLevelUpdate) => void;

class TradovateWebSocket {
  private mdSocket: WebSocket | null = null;
  private orderSocket: WebSocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private tickHandlers: Map<string, TickHandler[]> = new Map();
  private barHandlers: Map<string, BarHandler[]> = new Map();
  private domHandlers: Map<string, DOMHandler[]> = new Map();
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Connect to market data WebSocket
   */
  async connectMarketData(): Promise<void> {
    const wsUrl = tradovateClient.getMarketDataWebSocketUrl();
    const token = tradovateClient.getAccessToken();

    if (!token) {
      throw new Error('Not authenticated. Call tradovateClient.authenticate() first.');
    }

    return new Promise((resolve, reject) => {
      this.mdSocket = new WebSocket(wsUrl);

      this.mdSocket.onopen = () => {
        console.log('[TradovateWS] Market data connection opened');
        // Authenticate the WebSocket connection
        this.sendMd({ op: 'authorize', token });
        this.startHeartbeat();
        this.reconnectAttempts = 0;
        resolve();
      };

      this.mdSocket.onmessage = (event) => {
        this.handleMarketDataMessage(event.data);
      };

      this.mdSocket.onerror = (error) => {
        console.error('[TradovateWS] Market data error:', error);
        reject(error);
      };

      this.mdSocket.onclose = () => {
        console.log('[TradovateWS] Market data connection closed');
        this.stopHeartbeat();
        this.attemptReconnect('md');
      };
    });
  }

  /**
   * Connect to order/position WebSocket
   */
  async connectOrders(): Promise<void> {
    const wsUrl = tradovateClient.getOrderWebSocketUrl();
    const token = tradovateClient.getAccessToken();

    if (!token) {
      throw new Error('Not authenticated. Call tradovateClient.authenticate() first.');
    }

    return new Promise((resolve, reject) => {
      this.orderSocket = new WebSocket(wsUrl);

      this.orderSocket.onopen = () => {
        console.log('[TradovateWS] Order connection opened');
        // Authenticate
        this.sendOrder({ op: 'authorize', token });
        resolve();
      };

      this.orderSocket.onmessage = (event) => {
        this.handleOrderMessage(event.data);
      };

      this.orderSocket.onerror = (error) => {
        console.error('[TradovateWS] Order error:', error);
        reject(error);
      };

      this.orderSocket.onclose = () => {
        console.log('[TradovateWS] Order connection closed');
        this.attemptReconnect('order');
      };
    });
  }

  /**
   * Subscribe to real-time market data for a symbol
   */
  subscribeMarketData(symbol: string): void {
    if (!this.mdSocket || this.mdSocket.readyState !== WebSocket.OPEN) {
      console.warn('[TradovateWS] Market data socket not connected');
      return;
    }

    // Subscribe to quotes (bid/ask)
    this.sendMd({
      op: 'subscribe',
      args: ['md/subscribequote', { symbol }]
    });

    // Subscribe to DOM (depth of market)
    this.sendMd({
      op: 'subscribe',
      args: ['md/subscribedom', { symbol }]
    });

    // Subscribe to histogram (volume at price)
    this.sendMd({
      op: 'subscribe',
      args: ['md/subscribehistogram', { symbol }]
    });

    this.subscriptions.add(symbol);
    console.log(`[TradovateWS] Subscribed to ${symbol}`);
  }

  /**
   * Subscribe to chart data (bars/candles)
   */
  subscribeChart(symbol: string, timeframe: 'Tick' | '1Min' | '5Min' | '15Min' | '30Min' | '1Hour' | 'Daily'): void {
    if (!this.mdSocket || this.mdSocket.readyState !== WebSocket.OPEN) {
      console.warn('[TradovateWS] Market data socket not connected');
      return;
    }

    // Map timeframe to Tradovate's elementSize and elementType
    const chartConfig: Record<string, { elementSize: number; elementSizeUnit: string }> = {
      'Tick': { elementSize: 1, elementSizeUnit: 'Tick' },
      '1Min': { elementSize: 1, elementSizeUnit: 'UnderlyingUnits' },
      '5Min': { elementSize: 5, elementSizeUnit: 'UnderlyingUnits' },
      '15Min': { elementSize: 15, elementSizeUnit: 'UnderlyingUnits' },
      '30Min': { elementSize: 30, elementSizeUnit: 'UnderlyingUnits' },
      '1Hour': { elementSize: 60, elementSizeUnit: 'UnderlyingUnits' },
      'Daily': { elementSize: 1440, elementSizeUnit: 'UnderlyingUnits' },
    };

    const config = chartConfig[timeframe];

    this.sendMd({
      op: 'subscribe',
      args: ['md/getchart', {
        symbol,
        chartDescription: {
          underlyingType: 'MinuteBar',
          elementSize: config.elementSize,
          elementSizeUnit: config.elementSizeUnit,
          withHistogram: true,
        },
        timeRange: {
          asMuchAsElements: 100  // Get last 100 bars
        }
      }]
    });

    console.log(`[TradovateWS] Subscribed to ${symbol} ${timeframe} chart`);
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribeMarketData(symbol: string): void {
    if (!this.mdSocket || this.mdSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.sendMd({
      op: 'unsubscribe',
      args: ['md/unsubscribequote', { symbol }]
    });

    this.sendMd({
      op: 'unsubscribe',
      args: ['md/unsubscribedom', { symbol }]
    });

    this.subscriptions.delete(symbol);
    console.log(`[TradovateWS] Unsubscribed from ${symbol}`);
  }

  /**
   * Register tick handler for a symbol
   */
  onTick(symbol: string, handler: TickHandler): void {
    if (!this.tickHandlers.has(symbol)) {
      this.tickHandlers.set(symbol, []);
    }
    this.tickHandlers.get(symbol)!.push(handler);
  }

  /**
   * Register bar handler for a symbol
   */
  onBar(symbol: string, handler: BarHandler): void {
    if (!this.barHandlers.has(symbol)) {
      this.barHandlers.set(symbol, []);
    }
    this.barHandlers.get(symbol)!.push(handler);
  }

  /**
   * Register DOM handler for a symbol
   */
  onDOM(symbol: string, handler: DOMHandler): void {
    if (!this.domHandlers.has(symbol)) {
      this.domHandlers.set(symbol, []);
    }
    this.domHandlers.get(symbol)!.push(handler);
  }

  /**
   * Register general message handler
   */
  onMessage(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Handle incoming market data messages
   */
  private handleMarketDataMessage(data: string): void {
    try {
      // Tradovate sends frames like: [eventType, data]
      // or heartbeat: 'h' for heartbeat
      if (data === 'h') {
        // Heartbeat response - ignore
        return;
      }

      // Handle array format
      if (data.startsWith('a')) {
        const messages = JSON.parse(data.slice(1));
        for (const msg of messages) {
          this.processMarketDataMessage(msg);
        }
      } else if (data.startsWith('o')) {
        // Connection opened confirmation
        console.log('[TradovateWS] Connection confirmed');
      } else {
        // Try parsing as JSON
        const msg = JSON.parse(data);
        this.processMarketDataMessage(msg);
      }
    } catch (error) {
      // Non-JSON message, might be keep-alive
      if (data !== 'h' && data !== 'o') {
        console.log('[TradovateWS] Unhandled message:', data);
      }
    }
  }

  /**
   * Process individual market data message
   */
  private processMarketDataMessage(msg: unknown): void {
    if (!msg || typeof msg !== 'object') return;

    const message = msg as Record<string, unknown>;
    const eventType = message.e as string;
    const data = message.d;

    // Emit to general handlers
    if (eventType && this.messageHandlers.has(eventType)) {
      for (const handler of this.messageHandlers.get(eventType)!) {
        handler(data);
      }
    }

    // Handle specific message types
    if (eventType === 'md/quote') {
      const quoteData = data as { entries: { contractId: number; price: number; size: number; id: string }[] };
      // Process quote updates
      for (const entry of quoteData.entries || []) {
        // Find symbol from contractId (would need contract lookup)
        console.log('[TradovateWS] Quote update:', entry);
      }
    }

    if (eventType === 'chart') {
      // Process bar data
      const chartData = data as { id: number; td: number; bars: { timestamp: string; open: number; high: number; low: number; close: number; upVolume: number; downVolume: number }[] };
      if (chartData.bars) {
        for (const bar of chartData.bars) {
          const barData: BarData = {
            symbol: 'UNKNOWN', // Would need to track by ID
            timestamp: new Date(bar.timestamp).getTime(),
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: (bar.upVolume || 0) + (bar.downVolume || 0),
          };

          // Emit to handlers
          for (const [, handlers] of this.barHandlers) {
            for (const handler of handlers) {
              handler(barData);
            }
          }
        }
      }
    }

    if (eventType === 'md/dom') {
      // Process DOM (depth of market) update
      const domData = data as { contractId: number; bids: { price: number; size: number }[]; offers: { price: number; size: number }[] };
      const domUpdate: DOMLevelUpdate = {
        symbol: 'UNKNOWN', // Would need to track by contractId
        timestamp: Date.now(),
        bids: domData.bids || [],
        asks: domData.offers || [],
      };

      for (const [, handlers] of this.domHandlers) {
        for (const handler of handlers) {
          handler(domUpdate);
        }
      }
    }
  }

  /**
   * Handle incoming order messages
   */
  private handleOrderMessage(data: string): void {
    try {
      if (data === 'h' || data === 'o') return;

      if (data.startsWith('a')) {
        const messages = JSON.parse(data.slice(1));
        for (const msg of messages) {
          console.log('[TradovateWS] Order message:', msg);
          // Emit to handlers
          const message = msg as Record<string, unknown>;
          const eventType = message.e as string;
          if (eventType && this.messageHandlers.has(eventType)) {
            for (const handler of this.messageHandlers.get(eventType)!) {
              handler(message.d);
            }
          }
        }
      }
    } catch (error) {
      console.log('[TradovateWS] Order message parse error:', data);
    }
  }

  /**
   * Send message to market data WebSocket
   */
  private sendMd(message: unknown): void {
    if (this.mdSocket && this.mdSocket.readyState === WebSocket.OPEN) {
      this.mdSocket.send(JSON.stringify(message));
    }
  }

  /**
   * Send message to order WebSocket
   */
  private sendOrder(message: unknown): void {
    if (this.orderSocket && this.orderSocket.readyState === WebSocket.OPEN) {
      this.orderSocket.send(JSON.stringify(message));
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.mdSocket && this.mdSocket.readyState === WebSocket.OPEN) {
        this.mdSocket.send('[]');  // Empty heartbeat
      }
    }, 2500);  // Tradovate requires heartbeat every 2.5 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(type: 'md' | 'order'): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[TradovateWS] Max reconnect attempts reached for ${type}`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`[TradovateWS] Reconnecting ${type} in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(async () => {
      try {
        if (type === 'md') {
          await this.connectMarketData();
          // Resubscribe
          for (const symbol of this.subscriptions) {
            this.subscribeMarketData(symbol);
          }
        } else {
          await this.connectOrders();
        }
      } catch (error) {
        console.error(`[TradovateWS] Reconnect failed:`, error);
      }
    }, delay);
  }

  /**
   * Close all connections
   */
  disconnect(): void {
    this.stopHeartbeat();

    if (this.mdSocket) {
      this.mdSocket.close();
      this.mdSocket = null;
    }

    if (this.orderSocket) {
      this.orderSocket.close();
      this.orderSocket = null;
    }

    this.subscriptions.clear();
    this.tickHandlers.clear();
    this.barHandlers.clear();
    this.domHandlers.clear();
    this.messageHandlers.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return (this.mdSocket?.readyState === WebSocket.OPEN) ||
           (this.orderSocket?.readyState === WebSocket.OPEN);
  }
}

// Singleton instance
export const tradovateWS = new TradovateWebSocket();
