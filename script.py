import os
from core_0dte import analyze_symbols

def main():
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("Set OPENAI_API_KEY first.")
    print("Running analysis for SPY, QQQ, IWM...")
    print(analyze_symbols(["SPY", "QQQ", "IWM"], focus="both", style="balanced", timeframe="intraday"))

if __name__ == "__main__":
    main()
    