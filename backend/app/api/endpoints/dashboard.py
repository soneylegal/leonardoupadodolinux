"""
Endpoints do Dashboard
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
import httpx
import httpx

from app.core.database import get_db
from app.api.endpoints.auth import get_current_user
from app.models.user import User
from app.models.trade import Trade
from app.models.strategy import Strategy
from app.models.settings import UserSettings
from app.schemas.schemas import DashboardResponse, BotStatus, TradeResponse, ChartResponse

router = APIRouter()


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retorna dados do dashboard principal"""
    
    # Verificar status do bot
    bot_manager = request.app.state.bot_manager
    is_running = bot_manager.is_running if bot_manager else False
    
    # Calcular P/L do dia
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(Trade).where(
            and_(
                Trade.user_id == current_user.id,
                Trade.executed_at >= today
            )
        ).order_by(Trade.executed_at.desc())
    )
    todays_trades = result.scalars().all()
    
    todays_pnl = sum(t.profit_loss or 0 for t in todays_trades)
    
    # Último trade
    last_trade = todays_trades[0] if todays_trades else None
    
    # Obter estratégia ativa para saber o ativo atual
    result = await db.execute(
        select(Strategy).where(
            and_(
                Strategy.user_id == current_user.id,
                Strategy.is_active == True
            )
        ).limit(1)
    )
    active_strategy = result.scalar_one_or_none()
    asset = active_strategy.asset if active_strategy else "PETR4"
    
    # Preço atual — Busca preço real da brapi.dev, fallback para simulação se falhar
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
        current_price = round(max(_p, 0.50), 2)
    
    # Obter saldo simulado
    settings_result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )
    user_settings = settings_result.scalar_one_or_none()
    simulated_balance = (user_settings.simulated_balance / 100) if user_settings else 10000.0

    return DashboardResponse(
        bot_status=BotStatus(
            is_running=is_running,
            status_text="Running" if is_running else "Stopped"
        ),
        todays_pnl=todays_pnl,
        last_trade=TradeResponse.model_validate(last_trade) if last_trade else None,
        current_price=current_price,
        asset=asset,
        simulated_balance=simulated_balance
    )


@router.post("/bot/start")
async def start_bot(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Inicia o bot de trading"""
    bot_manager = request.app.state.bot_manager
    await bot_manager.start(current_user.id)
    
    return {"status": "started", "message": "Bot iniciado com sucesso"}


@router.post("/bot/stop")
async def stop_bot(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Para o bot de trading"""
    bot_manager = request.app.state.bot_manager
    await bot_manager.stop()
    
    return {"status": "stopped", "message": "Bot parado com sucesso"}


@router.get("/chart/{asset}", response_model=ChartResponse)
async def get_chart_data(
    asset: str,
    timeframe: str = "1D",
    current_user: User = Depends(get_current_user)
):
    """Retorna dados do gráfico para um ativo (simulado com seed determinística)"""
    import random as _rnd
    from datetime import datetime as _dt
    import time

    # Seed determinística baseada no ativo — o gráfico é sempre o mesmo para o mesmo ativo
    seed = sum(ord(c) for c in asset.upper())
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
        drift = rng.gauss(0.0003, 0.008)        # leve tendência de alta + volatilidade
        price = round(price * (1 + drift), 2)
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
        price = close_p  # próximo candle abre perto do fechamento anterior

    # MAs como SMA real das closes — nulas quando não há dados suficientes
    def sma(values: list[float], period: int, idx: int) -> float | None:
        if idx + 1 < period:
            return None
        window = values[max(0, idx + 1 - period): idx + 1]
        return round(sum(window) / len(window), 2)

    ma_short_list: list[float | None] = [sma(closes, SHORT_P, i) for i in range(NUM_CANDLES)]
    ma_long_list:  list[float | None] = [sma(closes, LONG_P,  i) for i in range(NUM_CANDLES)]

    # Remove Nones da frente (frontend espera mesma length que candles mas tolera nulos)
    ma_short_clean = [v if v is not None else 0.0 for v in ma_short_list]
    ma_long_clean  = [v if v is not None else 0.0 for v in ma_long_list]

    return ChartResponse(
        asset=asset,
        timeframe=timeframe,
        candles=candles,
        ma_short=ma_short_clean,
        ma_long=ma_long_clean,
    )
