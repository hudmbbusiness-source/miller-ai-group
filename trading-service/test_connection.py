"""Test Rithmic connection"""
import asyncio
from config import load_config

async def test_connection():
    try:
        from async_rithmic import RithmicClient, Gateway

        config = load_config()

        print("=" * 60)
        print("Testing Rithmic Connection")
        print("=" * 60)
        print(f"User: {config.rithmic.user}")
        print(f"System: {config.rithmic.system_name}")
        print(f"Gateway: CHICAGO")
        print("=" * 60)
        print()
        print("Connecting...")

        client = RithmicClient(
            user=config.rithmic.user,
            password=config.rithmic.password,
            system_name=config.rithmic.system_name,
            app_name=config.rithmic.app_name,
            app_version=config.rithmic.app_version,
            gateway=Gateway.CHICAGO,
        )

        await client.connect()
        print("SUCCESS! Connected to Rithmic!")
        print()

        # Get account info
        print("Getting account info...")
        try:
            accounts = await client.list_accounts()
            print(f"Accounts: {accounts}")
        except Exception as e:
            print(f"Could not list accounts: {e}")

        # Disconnect
        print()
        print("Disconnecting...")
        await client.disconnect()
        print("Disconnected.")

        return True

    except Exception as e:
        print(f"CONNECTION FAILED: {e}")
        print()
        print("Possible issues:")
        print("1. Wrong credentials - check your Apex dashboard")
        print("2. Account not active - log into RTrader Pro first")
        print("3. Network issue - check your internet connection")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_connection())
    exit(0 if result else 1)
