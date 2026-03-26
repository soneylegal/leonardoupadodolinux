import re

with open("/home/archsoney/leonardoprojeto/backend/app/api/endpoints/dashboard.py", "r") as f:
    text = f.read()

# Replace fake price gen in get_chart_data
old_chart = """    import random as _rnd
    from datetime import datetime as _dt
    import time

    # Seed determinística baseada no ativo — o gráfico é sempre o mesmo para o m
esmo ativo                                                                          seed = sum(ord(c) for c in asset.upper())
    rng = _rnd.Random(seed)

    # Preço base por ativo (B3 simulado)
    base_prices = {
        "PETR4": 37.80, "VALE3": 68.50, "ITUB4": 32.40,
        "BBDC4": 15.20, "ABEV3": 12.90, "WEGE3": 42.10,
        "MGLU3": 2.50,  "RENT3": 55.80,
    }
    price = base_prices.get(asset.upper(), 25.00)

    NUM_CANDLES = 100
    SHORT_P = 9
    LONG_P = 21

    candles = []
    closes: list[float] = []

    # Fast forward based on time, so chart moves smoothly over time
    forward_steps = int(time.time() / 5) % 1000
    
    # Process history up to our window without storing
    for _ in range(forward_steps):
        drift = rng.gauss(0.0003, 0.008)
        price = round(price * (1 + drift), 2)
        price = max(price, 0.50)

    for i in range(NUM_CANDLES):
        drift = rng.gauss(0.0003, 0.008)        # leve tendência de alta + volat
ilidade                                                                                 price = round(price * (1 + drift), 2)
        price = max(price, 0.50)

        spread = price * rng.uniform(0.003, 0.012)
        open_p  = round(price + rng.uniform(-spread / 2, spread / 2), 2)
        close_p = round(price + rng.uniform(-spread / 2, spread / 2), 2)
        high_p  = round(max(open_p, close_p) + rng.uniform(0, spread * 0.6), 2)
        low_p   = round(min(open_p, close_p) - rng.uniform(0, spread * 0.6), 2)
        volume  = rng.randint(800_000, 6_000_000)

        candles.append({
            "timestamp": _dt.now() - timedelta(days=NUM_CANDLES - i),
            "open":   open_p,
            "high":   high_p,
            "low":    low_p,
            "close":  close_p,
            "volume": volume,
        })
        closes.append(close_p)
        price = close_p  # próximo candle abre perto do fechamento anterior"""

new_chart = """    from datetime import datetime as _dt
    import httpx
    
    SHORT_P = 9
    LONG_P = 21

    candles = []
    closes: list[float] = []
    
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"https://brapi.dev/api/quote/{asset}?range=3mo&interval=1d")
            if resp.status_code == 200:
                data = resp.json()
                if "results" in data and len(data["results"]) > 0:
                    hist = data["results"][0].get("historicalDataPrice", [])
                    # brapi usa timestamp em s
                    for c in hist:
                        candles.append({
                            "timestamp": _dt.fromtimestamp(c["date"]),
                            "open": c["open"],
                            "high": c["high"],
                            "low": c["low"],
                            "close": c["close"],
                            "volume": c["volume"]
                        })
                        closes.append(c["close"])
    except Exception as e:
        print(f"Erro ao buscar histórico do {asset}: {e}")
        pass

    # Fallback caso falhe ou API bloqueie (rate limit)
    if len(candles) < 10:
        import random as _rnd
        import time
        NUM_CANDLES = 100
        seed = sum(ord(c) for c in asset.upper())
        rng = _rnd.Random(seed)
        base_prices = {"PETR4": 37.80, "VALE3": 68.50, "ITUB4": 32.40, "BBDC4": 15.20, "ABEV3": 12.90, "WEGE3": 42.10, "MGLU3": 2.50, "RENT3": 55.80}
        price = base_prices.get(asset.upper(), 25.00)
        forward_steps = int(time.time() / 5) % 1000
        for _ in range(forward_steps):
            price = max(round(price * (1 + rng.gauss(0.0003, 0.008)), 2), 0.5)

        for i in range(NUM_CANDLES):
            price = max(round(price * (1 + rng.gauss(0.0003, 0.008)), 2), 0.5)
            spread = price * rng.uniform(0.003, 0.012)
            open_p  = round(price + rng.uniform(-spread / 2, spread / 2), 2)
            close_p = round(price + rng.uniform(-spread / 2, spread / 2), 2)
            candles.append({
                "timestamp": _dt.now() - timedelta(days=NUM_CANDLES - i),
                "open":   open_p,
                "high":   round(max(open_p, close_p) + rng.uniform(0, spread * 0.6), 2),
                "low":    round(min(open_p, close_p) - rng.uniform(0, spread * 0.6), 2),
                "close":  close_p,
                "volume": rng.randint(800_000, 6_000_000),
            })
            closes.append(close_p)
            price = close_p
    else:
        NUM_CANDLES = len(candles)"""

text = text.replace(old_chart, new_chart)

with open("/home/archsoney/leonardoprojeto/backend/app/api/endpoints/dashboard.py", "w") as f:
    f.write(text)
