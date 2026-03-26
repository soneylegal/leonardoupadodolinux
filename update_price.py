import re

with open("/home/archsoney/leonardoprojeto/backend/app/api/endpoints/dashboard.py", "r") as f:
    text = f.read()

# Add httpx to imports
text = text.replace("from datetime import datetime, timedelta", "from datetime import datetime, timedelta\nimport httpx")

# Replace fake price gen in get_dashboard
old_sim = """    # Preço atual — simulado com seed determinística do ativo (consistente com o gráfico)
    import random as _rnd
    import time
    
    _base_prices = {
        "PETR4": 37.80, "VALE3": 68.50, "ITUB4": 32.40,
        "BBDC4": 15.20, "ABEV3": 12.90, "WEGE3": 42.10,
        "MGLU3": 2.50,  "RENT3": 55.80,
    }

    # Generate prices using a fixed seed, then walk forward based on time
    _rng = _rnd.Random(sum(ord(c) for c in asset.upper()))
    _p = _base_prices.get(asset.upper(), 25.00)
    
    # Base history length + forward steps
    forward_steps = int(time.time() / 5) % 1000
    for _ in range(100 + forward_steps):
        _p = _p * (1 + _rng.gauss(0.0003, 0.008))
    current_price = round(max(_p, 0.50), 2)"""

new_sim = """    # Preço atual — Busca preço real da brapi.dev, fallback para simulação se falhar
    current_price = None
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"https://brapi.dev/api/quote/{asset}")
            if resp.status_code == 200:
                data = resp.json()
                if "results" in data and len(data["results"]) > 0:
                    current_price = float(data["results"][0].get("regularMarketPrice", 0))
    except Exception as e:
        print(f"Erro ao buscar preço real do {asset}: {e}")
        pass
        
    if not current_price:
        import random as _rnd
        import time
        _base_prices = {"PETR4": 37.80, "VALE3": 68.50, "ITUB4": 32.40, "BBDC4": 15.20, "ABEV3": 12.90, "WEGE3": 42.10, "MGLU3": 2.50, "RENT3": 55.80}
        _rng = _rnd.Random(sum(ord(c) for c in asset.upper()))
        _p = _base_prices.get(asset.upper(), 25.00)
        forward_steps = int(time.time() / 5) % 1000
        for _ in range(100 + forward_steps):
            _p = _p * (1 + _rng.gauss(0.0003, 0.008))
        current_price = round(max(_p, 0.50), 2)"""

text = text.replace(old_sim, new_sim)

with open("/home/archsoney/leonardoprojeto/backend/app/api/endpoints/dashboard.py", "w") as f:
    f.write(text)
