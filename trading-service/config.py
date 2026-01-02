"""
StuntMan Trading Service - Configuration
Loads settings from environment variables
"""

import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Load .env file
load_dotenv()


@dataclass
class RithmicConfig:
    """Rithmic connection configuration"""
    user: str
    password: str
    system_name: str
    gateway: str
    app_name: str
    app_version: str


@dataclass
class TradingConfig:
    """Trading safety configuration"""
    default_instrument: str
    default_contract: str
    max_contracts: int
    max_daily_loss: float
    auto_stop_drawdown_percent: float


@dataclass
class ServerConfig:
    """API server configuration"""
    port: int
    secret_key: str


@dataclass
class Config:
    """Main configuration container"""
    rithmic: RithmicConfig
    trading: TradingConfig
    server: ServerConfig


def load_config() -> Config:
    """Load configuration from environment variables"""

    # Validate required credentials
    rithmic_user = os.getenv("RITHMIC_USER", "")
    rithmic_password = os.getenv("RITHMIC_PASSWORD", "")

    if not rithmic_user or not rithmic_password:
        raise ValueError(
            "RITHMIC_USER and RITHMIC_PASSWORD must be set in .env file. "
            "Copy .env.example to .env and fill in your Apex credentials."
        )

    return Config(
        rithmic=RithmicConfig(
            user=rithmic_user,
            password=rithmic_password,
            system_name=os.getenv("RITHMIC_SYSTEM", "Apex"),
            gateway=os.getenv("RITHMIC_GATEWAY", "CHICAGO"),
            app_name=os.getenv("RITHMIC_APP_NAME", "StuntMan"),
            app_version=os.getenv("RITHMIC_APP_VERSION", "1.0"),
        ),
        trading=TradingConfig(
            default_instrument=os.getenv("DEFAULT_INSTRUMENT", "ES"),
            default_contract=os.getenv("DEFAULT_CONTRACT", "ESH5"),
            max_contracts=int(os.getenv("MAX_CONTRACTS", "5")),
            max_daily_loss=float(os.getenv("MAX_DAILY_LOSS", "1500")),
            auto_stop_drawdown_percent=float(os.getenv("AUTO_STOP_DRAWDOWN_PERCENT", "80")),
        ),
        server=ServerConfig(
            port=int(os.getenv("API_PORT", "8000")),
            secret_key=os.getenv("API_SECRET_KEY", "change_this"),
        ),
    )
