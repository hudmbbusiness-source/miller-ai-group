"""
StuntMan Trading Service - Startup Script
Run this to start the trading service
"""

import sys
import subprocess


def check_dependencies():
    """Check if required packages are installed"""
    required = [
        "async_rithmic",
        "fastapi",
        "uvicorn",
        "python-dotenv",
    ]

    missing = []
    for package in required:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing.append(package)

    if missing:
        print("Missing dependencies:", ", ".join(missing))
        print("Installing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])


def main():
    """Start the trading service"""
    print("=" * 60)
    print("StuntMan Trading Service")
    print("=" * 60)

    # Check dependencies
    check_dependencies()

    # Import and run
    import uvicorn
    from config import load_config

    try:
        config = load_config()
        print(f"Rithmic User: {config.rithmic.user}")
        print(f"System: {config.rithmic.system_name}")
        print(f"Gateway: {config.rithmic.gateway}")
        print(f"API Port: {config.server.port}")
        print("=" * 60)

        uvicorn.run(
            "api:app",
            host="0.0.0.0",
            port=config.server.port,
            reload=False,
        )

    except ValueError as e:
        print(f"Configuration error: {e}")
        print("Make sure to copy .env.example to .env and fill in your credentials")
        sys.exit(1)


if __name__ == "__main__":
    main()
