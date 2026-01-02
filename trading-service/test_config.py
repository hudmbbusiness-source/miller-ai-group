"""Test configuration loading"""
from config import load_config

try:
    config = load_config()
    print("Configuration loaded successfully!")
    print(f"User: {config.rithmic.user}")
    print(f"System: {config.rithmic.system_name}")
    print(f"Gateway: {config.rithmic.gateway}")
    print(f"Max contracts: {config.trading.max_contracts}")
    print(f"Max daily loss: ${config.trading.max_daily_loss}")
except Exception as e:
    print(f"Error: {e}")
