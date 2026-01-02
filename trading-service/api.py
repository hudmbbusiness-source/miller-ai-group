"""
StuntMan Trading API Server
FastAPI server that exposes trading functionality to the Next.js frontend
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from config import load_config
from trading_client import TradingClient, OrderSide, OrderType

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load configuration
config = load_config()

# Initialize trading client
trading_client = TradingClient(config)

# WebSocket connections for real-time updates
websocket_connections: List[WebSocket] = []


# ============================================================================
# Lifespan Management
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info("Starting StuntMan Trading Service...")
    logger.info(f"Connecting to Rithmic as {config.rithmic.user}...")

    # Connect to Rithmic
    connected = await trading_client.connect()
    if connected:
        logger.info("Successfully connected to Rithmic!")
        # Subscribe to default instrument
        try:
            await trading_client.subscribe_market_data(config.trading.default_contract)
        except Exception as e:
            logger.warning(f"Failed to subscribe to market data: {e}")
    else:
        logger.warning("Failed to connect to Rithmic - running in offline mode")

    yield

    # Shutdown
    logger.info("Shutting down...")
    await trading_client.disconnect()


# Create FastAPI app
app = FastAPI(
    title="StuntMan Trading API",
    description="Trading execution API for StuntMan automated trading system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://miller-ai-group.vercel.app",
        "https://miller-ai-group-hub.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key authentication
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Depends(api_key_header)):
    """Verify API key for protected endpoints"""
    if api_key != config.server.secret_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key


# ============================================================================
# Pydantic Models
# ============================================================================

class OrderRequest(BaseModel):
    symbol: str
    side: str  # "BUY" or "SELL"
    quantity: int
    order_type: str = "MARKET"  # "MARKET", "LIMIT", "STOP", "STOP_LIMIT"
    price: Optional[float] = None
    stop_price: Optional[float] = None


class SignalRequest(BaseModel):
    """Signal from the Next.js StuntMan system"""
    signal_type: str  # "LONG", "SHORT", "EXIT"
    symbol: str
    confidence: float
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    contracts: int = 1


class StatusResponse(BaseModel):
    connected: bool
    trading_enabled: bool
    account_id: str
    balance: float
    daily_pnl: float
    positions: int
    open_orders: int


# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "StuntMan Trading API",
        "version": "1.0.0",
        "status": "running",
        "connected": trading_client.is_connected,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "connected": trading_client.is_connected,
        "trading_enabled": trading_client.is_trading_enabled,
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/status", response_model=StatusResponse)
async def get_status():
    """Get trading system status"""
    account = await trading_client.get_account_info()
    positions = await trading_client.get_positions()
    open_orders = trading_client.get_open_orders()

    return StatusResponse(
        connected=trading_client.is_connected,
        trading_enabled=trading_client.is_trading_enabled,
        account_id=account.account_id if account else config.rithmic.user,
        balance=account.balance if account else 150000,
        daily_pnl=account.daily_pnl if account else 0,
        positions=len(positions),
        open_orders=len(open_orders),
    )


# ============================================================================
# Market Data Endpoints
# ============================================================================

@app.get("/market/{symbol}")
async def get_market_data(symbol: str):
    """Get current market data for a symbol"""
    data = trading_client.get_market_data(symbol)
    if not data:
        return {
            "symbol": symbol,
            "available": False,
            "message": "No market data available. Subscribe first.",
        }

    return {
        "symbol": data.symbol,
        "available": True,
        "last_price": data.last_price,
        "bid": data.bid,
        "ask": data.ask,
        "bid_size": data.bid_size,
        "ask_size": data.ask_size,
        "volume": data.volume,
        "high": data.high,
        "low": data.low,
        "open": data.open,
        "timestamp": data.timestamp.isoformat(),
    }


@app.post("/market/subscribe/{symbol}")
async def subscribe_market_data(symbol: str, _: str = Depends(verify_api_key)):
    """Subscribe to market data for a symbol"""
    try:
        await trading_client.subscribe_market_data(symbol)
        return {"success": True, "symbol": symbol, "message": "Subscribed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Order Endpoints
# ============================================================================

@app.post("/orders")
async def place_order(order: OrderRequest, _: str = Depends(verify_api_key)):
    """Place a new order"""
    if not trading_client.is_connected:
        raise HTTPException(status_code=503, detail="Not connected to Rithmic")

    if not trading_client.is_trading_enabled:
        raise HTTPException(status_code=403, detail="Trading is disabled - safety limits reached")

    try:
        side = OrderSide.BUY if order.side.upper() == "BUY" else OrderSide.SELL
        order_type_map = {
            "MARKET": OrderType.MARKET,
            "LIMIT": OrderType.LIMIT,
            "STOP": OrderType.STOP,
            "STOP_LIMIT": OrderType.STOP_LIMIT,
        }
        order_type = order_type_map.get(order.order_type.upper(), OrderType.MARKET)

        result = await trading_client.place_order(
            symbol=order.symbol,
            side=side,
            quantity=order.quantity,
            order_type=order_type,
            price=order.price,
            stop_price=order.stop_price,
        )

        if result:
            return {
                "success": True,
                "order_id": result.order_id,
                "symbol": result.symbol,
                "side": result.side.value,
                "quantity": result.quantity,
                "status": result.status.value,
            }
        else:
            raise HTTPException(status_code=400, detail="Order rejected")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/orders/{order_id}")
async def cancel_order(order_id: str, _: str = Depends(verify_api_key)):
    """Cancel an order"""
    success = await trading_client.cancel_order(order_id)
    if success:
        return {"success": True, "order_id": order_id, "message": "Order cancelled"}
    raise HTTPException(status_code=400, detail="Failed to cancel order")


@app.delete("/orders")
async def cancel_all_orders(_: str = Depends(verify_api_key)):
    """Cancel all open orders"""
    success = await trading_client.cancel_all_orders()
    return {"success": success, "message": "All orders cancelled" if success else "Failed"}


@app.get("/orders")
async def get_orders():
    """Get all open orders"""
    orders = trading_client.get_open_orders()
    return {
        "count": len(orders),
        "orders": [
            {
                "order_id": o.order_id,
                "symbol": o.symbol,
                "side": o.side.value,
                "quantity": o.quantity,
                "order_type": o.order_type.value,
                "price": o.price,
                "stop_price": o.stop_price,
                "status": o.status.value,
                "filled_quantity": o.filled_quantity,
                "timestamp": o.timestamp.isoformat(),
            }
            for o in orders
        ],
    }


# ============================================================================
# Position Endpoints
# ============================================================================

@app.get("/positions")
async def get_positions():
    """Get all positions"""
    positions = await trading_client.get_positions()
    return {
        "count": len(positions),
        "positions": [
            {
                "symbol": p.symbol,
                "quantity": p.quantity,
                "avg_price": p.avg_price,
                "unrealized_pnl": p.unrealized_pnl,
                "realized_pnl": p.realized_pnl,
            }
            for p in positions
        ],
    }


@app.post("/positions/{symbol}/close")
async def close_position(symbol: str, _: str = Depends(verify_api_key)):
    """Close a specific position"""
    success = await trading_client.close_position(symbol)
    if success:
        return {"success": True, "symbol": symbol, "message": "Position closed"}
    raise HTTPException(status_code=400, detail="Failed to close position")


@app.post("/positions/close-all")
async def close_all_positions(_: str = Depends(verify_api_key)):
    """Close all positions"""
    success = await trading_client.close_all_positions()
    return {"success": success, "message": "All positions closed" if success else "Failed"}


# ============================================================================
# Account Endpoints
# ============================================================================

@app.get("/account")
async def get_account():
    """Get account information"""
    account = await trading_client.get_account_info()
    if not account:
        return {
            "account_id": config.rithmic.user,
            "connected": False,
            "message": "Not connected - showing estimated data",
            "balance": 150000,
            "daily_pnl": 0,
        }

    return {
        "account_id": account.account_id,
        "connected": True,
        "balance": account.balance,
        "buying_power": account.buying_power,
        "daily_pnl": account.daily_pnl,
        "unrealized_pnl": account.unrealized_pnl,
        "realized_pnl": account.realized_pnl,
        "positions_count": len(account.positions),
    }


# ============================================================================
# Signal Execution (from Next.js StuntMan)
# ============================================================================

@app.post("/signals/execute")
async def execute_signal(signal: SignalRequest, _: str = Depends(verify_api_key)):
    """
    Execute a trading signal from the StuntMan system

    This is the main endpoint called by the Next.js app when a signal is generated.
    """
    if not trading_client.is_connected:
        raise HTTPException(status_code=503, detail="Not connected to Rithmic")

    if not trading_client.is_trading_enabled:
        raise HTTPException(status_code=403, detail="Trading disabled - safety limits")

    try:
        logger.info(f"Executing signal: {signal.signal_type} {signal.symbol} ({signal.confidence:.1%} confidence)")

        # Determine action based on signal type
        if signal.signal_type == "LONG":
            # Enter long position
            order = await trading_client.place_order(
                symbol=signal.symbol,
                side=OrderSide.BUY,
                quantity=signal.contracts,
                order_type=OrderType.MARKET,
            )

            # Place stop loss if provided
            if signal.stop_loss and order:
                await trading_client.place_order(
                    symbol=signal.symbol,
                    side=OrderSide.SELL,
                    quantity=signal.contracts,
                    order_type=OrderType.STOP,
                    stop_price=signal.stop_loss,
                )

        elif signal.signal_type == "SHORT":
            # Enter short position
            order = await trading_client.place_order(
                symbol=signal.symbol,
                side=OrderSide.SELL,
                quantity=signal.contracts,
                order_type=OrderType.MARKET,
            )

            # Place stop loss if provided
            if signal.stop_loss and order:
                await trading_client.place_order(
                    symbol=signal.symbol,
                    side=OrderSide.BUY,
                    quantity=signal.contracts,
                    order_type=OrderType.STOP,
                    stop_price=signal.stop_loss,
                )

        elif signal.signal_type == "EXIT":
            # Close position
            await trading_client.close_position(signal.symbol)
            await trading_client.cancel_all_orders()  # Cancel pending stop/take profit
            return {"success": True, "action": "EXIT", "message": "Position closed"}

        else:
            raise HTTPException(status_code=400, detail=f"Unknown signal type: {signal.signal_type}")

        return {
            "success": True,
            "action": signal.signal_type,
            "symbol": signal.symbol,
            "contracts": signal.contracts,
            "confidence": signal.confidence,
            "message": f"Signal executed: {signal.signal_type} {signal.contracts}x {signal.symbol}",
        }

    except Exception as e:
        logger.error(f"Failed to execute signal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Trading Controls
# ============================================================================

@app.post("/controls/enable")
async def enable_trading(_: str = Depends(verify_api_key)):
    """Enable trading"""
    trading_client.enable_trading()
    return {"success": True, "trading_enabled": True}


@app.post("/controls/disable")
async def disable_trading(_: str = Depends(verify_api_key)):
    """Disable trading"""
    trading_client.disable_trading()
    return {"success": True, "trading_enabled": False}


@app.post("/controls/reset-daily")
async def reset_daily(_: str = Depends(verify_api_key)):
    """Reset daily statistics"""
    trading_client.reset_daily_stats()
    return {"success": True, "message": "Daily stats reset"}


@app.post("/controls/emergency-stop")
async def emergency_stop(_: str = Depends(verify_api_key)):
    """Emergency stop - close all positions and disable trading"""
    trading_client.disable_trading()
    await trading_client.cancel_all_orders()
    await trading_client.close_all_positions()
    return {
        "success": True,
        "message": "Emergency stop executed - all positions closed, trading disabled",
    }


# ============================================================================
# WebSocket for Real-Time Updates
# ============================================================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    websocket_connections.append(websocket)

    try:
        # Register callbacks
        async def send_market_data(data):
            await websocket.send_json({"type": "market_data", "data": data})

        async def send_order_update(data):
            await websocket.send_json({"type": "order_update", "data": data})

        trading_client.on("market_data", send_market_data)
        trading_client.on("order_update", send_order_update)

        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                # Handle ping/pong
                if data == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break

    finally:
        websocket_connections.remove(websocket)
        trading_client.off("market_data", send_market_data)
        trading_client.off("order_update", send_order_update)


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=config.server.port,
        reload=True,
    )
