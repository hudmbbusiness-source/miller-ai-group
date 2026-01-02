"""
StuntMan Trading Client - Rithmic Connection Manager
Handles all communication with Rithmic/Apex for live trading
"""

import asyncio
import logging
from datetime import datetime
from typing import Callable, Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OrderSide(Enum):
    BUY = "BUY"
    SELL = "SELL"


class OrderType(Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"


class OrderStatus(Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    FILLED = "FILLED"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


@dataclass
class Position:
    """Current position information"""
    symbol: str
    quantity: int  # Positive = long, Negative = short
    avg_price: float
    unrealized_pnl: float
    realized_pnl: float


@dataclass
class Order:
    """Order information"""
    order_id: str
    symbol: str
    side: OrderSide
    quantity: int
    order_type: OrderType
    price: Optional[float]
    stop_price: Optional[float]
    status: OrderStatus
    filled_quantity: int = 0
    filled_price: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class AccountInfo:
    """Account information"""
    account_id: str
    balance: float
    buying_power: float
    daily_pnl: float
    unrealized_pnl: float
    realized_pnl: float
    positions: List[Position] = field(default_factory=list)


@dataclass
class MarketData:
    """Real-time market data"""
    symbol: str
    last_price: float
    bid: float
    ask: float
    bid_size: int
    ask_size: int
    volume: int
    high: float
    low: float
    open: float
    timestamp: datetime


class TradingClient:
    """
    Main trading client for Rithmic/Apex connection

    Handles:
    - Connection management
    - Real-time market data streaming
    - Order execution
    - Position tracking
    - Account information
    """

    def __init__(self, config):
        self.config = config
        self._client = None
        self._connected = False
        self._market_data: Dict[str, MarketData] = {}
        self._positions: Dict[str, Position] = {}
        self._orders: Dict[str, Order] = {}
        self._account_info: Optional[AccountInfo] = None
        self._callbacks: Dict[str, List[Callable]] = {
            "market_data": [],
            "order_update": [],
            "position_update": [],
            "connection_status": [],
        }
        self._daily_pnl = 0.0
        self._trading_enabled = True

    async def connect(self) -> bool:
        """Connect to Rithmic"""
        try:
            # Import async_rithmic
            from async_rithmic import RithmicClient, Gateway

            # Map gateway string to enum
            gateway_map = {
                "CHICAGO": Gateway.CHICAGO,
                "SYDNEY": Gateway.SYDNEY,
                "SAO_PAULO": Gateway.SAO_PAULO,
                "EUROPE": Gateway.EUROPE,
                "HONG_KONG": Gateway.HONG_KONG,
            }
            gateway = gateway_map.get(self.config.rithmic.gateway, Gateway.CHICAGO)

            logger.info(f"Connecting to Rithmic ({self.config.rithmic.system_name})...")
            logger.info(f"User: {self.config.rithmic.user}")
            logger.info(f"Gateway: {gateway}")

            self._client = RithmicClient(
                user=self.config.rithmic.user,
                password=self.config.rithmic.password,
                system_name=self.config.rithmic.system_name,
                app_name=self.config.rithmic.app_name,
                app_version=self.config.rithmic.app_version,
                gateway=gateway,
            )

            await self._client.connect()
            self._connected = True

            logger.info("Successfully connected to Rithmic!")
            await self._notify_callbacks("connection_status", {"connected": True})

            # Start background tasks
            asyncio.create_task(self._heartbeat_loop())

            return True

        except ImportError:
            logger.error(
                "async_rithmic not installed. Run: pip install async-rithmic"
            )
            return False
        except Exception as e:
            logger.error(f"Failed to connect to Rithmic: {e}")
            self._connected = False
            await self._notify_callbacks("connection_status", {"connected": False, "error": str(e)})
            return False

    async def disconnect(self):
        """Disconnect from Rithmic"""
        if self._client:
            try:
                await self._client.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting: {e}")
            finally:
                self._connected = False
                await self._notify_callbacks("connection_status", {"connected": False})

    @property
    def is_connected(self) -> bool:
        """Check if connected to Rithmic"""
        return self._connected

    # =========================================================================
    # Market Data
    # =========================================================================

    async def subscribe_market_data(self, symbol: str):
        """Subscribe to real-time market data for a symbol"""
        if not self._connected:
            raise RuntimeError("Not connected to Rithmic")

        try:
            from async_rithmic import DataType

            logger.info(f"Subscribing to market data for {symbol}...")

            await self._client.subscribe_to_market_data(
                symbol=symbol,
                exchange="CME",  # CME for futures
                data_type=DataType.LAST_TRADE | DataType.BBO,
                callback=self._handle_market_data,
            )

            logger.info(f"Subscribed to {symbol}")

        except Exception as e:
            logger.error(f"Failed to subscribe to {symbol}: {e}")
            raise

    async def _handle_market_data(self, data: dict):
        """Handle incoming market data"""
        try:
            symbol = data.get("symbol", "")

            market_data = MarketData(
                symbol=symbol,
                last_price=data.get("last_trade_price", 0),
                bid=data.get("best_bid_price", 0),
                ask=data.get("best_ask_price", 0),
                bid_size=data.get("best_bid_size", 0),
                ask_size=data.get("best_ask_size", 0),
                volume=data.get("volume", 0),
                high=data.get("high_price", 0),
                low=data.get("low_price", 0),
                open=data.get("open_price", 0),
                timestamp=datetime.now(),
            )

            self._market_data[symbol] = market_data
            await self._notify_callbacks("market_data", market_data.__dict__)

        except Exception as e:
            logger.error(f"Error handling market data: {e}")

    def get_market_data(self, symbol: str) -> Optional[MarketData]:
        """Get latest market data for a symbol"""
        return self._market_data.get(symbol)

    # =========================================================================
    # Order Management
    # =========================================================================

    async def place_order(
        self,
        symbol: str,
        side: OrderSide,
        quantity: int,
        order_type: OrderType = OrderType.MARKET,
        price: Optional[float] = None,
        stop_price: Optional[float] = None,
    ) -> Optional[Order]:
        """
        Place an order

        Args:
            symbol: Contract symbol (e.g., "ESH5")
            side: BUY or SELL
            quantity: Number of contracts
            order_type: MARKET, LIMIT, STOP, or STOP_LIMIT
            price: Limit price (required for LIMIT and STOP_LIMIT)
            stop_price: Stop price (required for STOP and STOP_LIMIT)

        Returns:
            Order object if successful, None otherwise
        """
        if not self._connected:
            raise RuntimeError("Not connected to Rithmic")

        if not self._trading_enabled:
            logger.warning("Trading is disabled - safety limits reached")
            return None

        # Safety checks
        if quantity > self.config.trading.max_contracts:
            logger.warning(
                f"Order quantity {quantity} exceeds max {self.config.trading.max_contracts}"
            )
            quantity = self.config.trading.max_contracts

        # Check daily loss limit
        if self._daily_pnl < -self.config.trading.max_daily_loss:
            logger.warning(
                f"Daily loss limit reached (${self._daily_pnl:.2f}). Trading disabled."
            )
            self._trading_enabled = False
            return None

        try:
            logger.info(
                f"Placing {side.value} order: {quantity}x {symbol} @ {order_type.value}"
            )

            # Map order type
            from async_rithmic import OrderType as RithmicOrderType

            order_type_map = {
                OrderType.MARKET: RithmicOrderType.MARKET,
                OrderType.LIMIT: RithmicOrderType.LIMIT,
                OrderType.STOP: RithmicOrderType.STOP_MARKET,
                OrderType.STOP_LIMIT: RithmicOrderType.STOP_LIMIT,
            }

            # Place order via Rithmic
            result = await self._client.submit_order(
                symbol=symbol,
                exchange="CME",
                side="B" if side == OrderSide.BUY else "S",
                quantity=quantity,
                order_type=order_type_map.get(order_type, RithmicOrderType.MARKET),
                price=price,
                stop_price=stop_price,
            )

            # Create order object
            order = Order(
                order_id=result.get("order_id", f"ORD-{datetime.now().timestamp()}"),
                symbol=symbol,
                side=side,
                quantity=quantity,
                order_type=order_type,
                price=price,
                stop_price=stop_price,
                status=OrderStatus.SUBMITTED,
            )

            self._orders[order.order_id] = order
            logger.info(f"Order placed: {order.order_id}")

            await self._notify_callbacks("order_update", order.__dict__)
            return order

        except Exception as e:
            logger.error(f"Failed to place order: {e}")
            return None

    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an existing order"""
        if not self._connected:
            raise RuntimeError("Not connected to Rithmic")

        try:
            await self._client.cancel_order(order_id=order_id)
            if order_id in self._orders:
                self._orders[order_id].status = OrderStatus.CANCELLED
            logger.info(f"Order cancelled: {order_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to cancel order {order_id}: {e}")
            return False

    async def cancel_all_orders(self) -> bool:
        """Cancel all open orders"""
        if not self._connected:
            raise RuntimeError("Not connected to Rithmic")

        try:
            await self._client.cancel_all_orders()
            for order in self._orders.values():
                if order.status in [OrderStatus.PENDING, OrderStatus.SUBMITTED]:
                    order.status = OrderStatus.CANCELLED
            logger.info("All orders cancelled")
            return True
        except Exception as e:
            logger.error(f"Failed to cancel all orders: {e}")
            return False

    def get_order(self, order_id: str) -> Optional[Order]:
        """Get order by ID"""
        return self._orders.get(order_id)

    def get_open_orders(self) -> List[Order]:
        """Get all open orders"""
        return [
            o for o in self._orders.values()
            if o.status in [OrderStatus.PENDING, OrderStatus.SUBMITTED, OrderStatus.PARTIALLY_FILLED]
        ]

    # =========================================================================
    # Position Management
    # =========================================================================

    async def get_positions(self) -> List[Position]:
        """Get current positions"""
        if not self._connected:
            return list(self._positions.values())

        try:
            positions = await self._client.get_positions()
            self._positions = {}

            for pos in positions:
                position = Position(
                    symbol=pos.get("symbol", ""),
                    quantity=pos.get("quantity", 0),
                    avg_price=pos.get("avg_price", 0),
                    unrealized_pnl=pos.get("unrealized_pnl", 0),
                    realized_pnl=pos.get("realized_pnl", 0),
                )
                self._positions[position.symbol] = position

            return list(self._positions.values())

        except Exception as e:
            logger.error(f"Failed to get positions: {e}")
            return list(self._positions.values())

    async def close_position(self, symbol: str) -> bool:
        """Close a position by market order"""
        if symbol not in self._positions:
            logger.warning(f"No position found for {symbol}")
            return False

        position = self._positions[symbol]
        if position.quantity == 0:
            return True

        # Place opposite order to close
        side = OrderSide.SELL if position.quantity > 0 else OrderSide.BUY
        quantity = abs(position.quantity)

        order = await self.place_order(
            symbol=symbol,
            side=side,
            quantity=quantity,
            order_type=OrderType.MARKET,
        )

        return order is not None

    async def close_all_positions(self) -> bool:
        """Close all open positions"""
        success = True
        for symbol in list(self._positions.keys()):
            if not await self.close_position(symbol):
                success = False
        return success

    # =========================================================================
    # Account Information
    # =========================================================================

    async def get_account_info(self) -> Optional[AccountInfo]:
        """Get account information"""
        if not self._connected:
            return self._account_info

        try:
            account = await self._client.get_account_info()
            positions = await self.get_positions()

            self._account_info = AccountInfo(
                account_id=account.get("account_id", self.config.rithmic.user),
                balance=account.get("balance", 150000),
                buying_power=account.get("buying_power", 0),
                daily_pnl=account.get("daily_pnl", 0),
                unrealized_pnl=account.get("unrealized_pnl", 0),
                realized_pnl=account.get("realized_pnl", 0),
                positions=positions,
            )

            self._daily_pnl = self._account_info.daily_pnl
            return self._account_info

        except Exception as e:
            logger.error(f"Failed to get account info: {e}")
            return self._account_info

    # =========================================================================
    # Callbacks and Events
    # =========================================================================

    def on(self, event: str, callback: Callable):
        """Register a callback for an event"""
        if event in self._callbacks:
            self._callbacks[event].append(callback)

    def off(self, event: str, callback: Callable):
        """Remove a callback"""
        if event in self._callbacks and callback in self._callbacks[event]:
            self._callbacks[event].remove(callback)

    async def _notify_callbacks(self, event: str, data: Any):
        """Notify all callbacks for an event"""
        for callback in self._callbacks.get(event, []):
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(data)
                else:
                    callback(data)
            except Exception as e:
                logger.error(f"Callback error for {event}: {e}")

    # =========================================================================
    # Internal Methods
    # =========================================================================

    async def _heartbeat_loop(self):
        """Keep connection alive"""
        while self._connected:
            try:
                await asyncio.sleep(30)
                # Rithmic client handles heartbeat internally
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Heartbeat error: {e}")

    # =========================================================================
    # Trading Controls
    # =========================================================================

    def enable_trading(self):
        """Enable trading"""
        self._trading_enabled = True
        logger.info("Trading enabled")

    def disable_trading(self):
        """Disable trading"""
        self._trading_enabled = False
        logger.info("Trading disabled")

    @property
    def is_trading_enabled(self) -> bool:
        """Check if trading is enabled"""
        return self._trading_enabled

    def reset_daily_stats(self):
        """Reset daily statistics"""
        self._daily_pnl = 0.0
        self._trading_enabled = True
        logger.info("Daily stats reset")
