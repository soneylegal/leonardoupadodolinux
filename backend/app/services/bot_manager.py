"""
Gerenciador do Bot de Trading — Paper Trading Simulado
"""
import asyncio
import random
from typing import Optional
from datetime import datetime

from app.services.metatrader_service import MetaTrader5Service
from app.services.technical_analysis_service import TechnicalAnalysisService
from app.core.database import AsyncSessionLocal
from app.models.log import Log, LogLevelEnum, LogTypeEnum


async def write_log(user_id: int, level: LogLevelEnum, message: str, log_type: LogTypeEnum = LogTypeEnum.BOT_STATUS):
    """Escreve um log no banco de dados de forma assíncrona"""
    try:
        async with AsyncSessionLocal() as session:
            log = Log(user_id=user_id, level=level, log_type=log_type, message=message)
            session.add(log)
            await session.commit()
    except Exception as e:
        print(f"Erro ao escrever log: {e}")


class BotManager:
    """Gerencia o ciclo de vida e execução do bot de trading"""

    def __init__(self):
        self.is_running = False
        self.user_id: Optional[int] = None
        self.mt5_service = MetaTrader5Service()
        self.ta_service = TechnicalAnalysisService()
        self._task: Optional[asyncio.Task] = None

    async def start(self, user_id: int):
        """Inicia o bot de trading"""
        if self.is_running:
            return

        self.user_id = user_id
        self.is_running = True

        await self.mt5_service.connect()
        await write_log(user_id, LogLevelEnum.SUCCESS, "✅ Bot iniciado com sucesso", LogTypeEnum.BOT_STATUS)
        self._task = asyncio.create_task(self._trading_loop())
        print(f"🤖 Bot iniciado para usuário {user_id}")

    async def stop(self):
        """Para o bot de trading"""
        if not self.is_running:
            return

        self.is_running = False

        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        if self.user_id:
            await write_log(self.user_id, LogLevelEnum.INFO, "🛑 Bot parado pelo usuário", LogTypeEnum.BOT_STATUS)

        await self.mt5_service.disconnect()
        print("🛑 Bot parado")

    async def _trading_loop(self):
        """Loop principal de paper trading simulado com MA crossover"""
        from sqlalchemy import select, and_
        from app.models.trade import Trade as TradeModel, OrderTypeEnum as TradeOrderEnum, OrderStatusEnum, TradeTypeEnum
        from app.models.strategy import Strategy
        from app.models.settings import UserSettings

        tick = 0
        price = 25.50
        price_history: list[float] = []
        position_open = False
        position_type: Optional[str] = None
        entry_price = 0.0

        while self.is_running:
            try:
                tick += 1
                await asyncio.sleep(30)

                # Buscar estratégia ativa do usuário
                async with AsyncSessionLocal() as db:
                    result = await db.execute(
                        select(Strategy).where(
                            and_(Strategy.user_id == self.user_id, Strategy.is_active == True)
                        )
                    )
                    strategy = result.scalar_one_or_none()

                if not strategy:
                    if tick % 10 == 0:
                        await write_log(
                            self.user_id, LogLevelEnum.WARNING,
                            "⚠️ Nenhuma estratégia ativa encontrada. Configure uma em Estratégia.",
                            LogTypeEnum.SYSTEM
                        )
                    continue

                # --- Simulação de preço (random walk com leve tendência de alta) ---
                # Volatilidade realista para ações brasileiras (~0.5% ao dia)
                drift = 0.005          # leve tendência de alta
                volatility = 0.008     # volatilidade por ciclo
                shock = random.gauss(drift, volatility)
                price = round(price * (1 + shock), 2)
                price = max(price, 1.0)
                price_history.append(price)

                short_p = strategy.ma_short_period
                long_p = strategy.ma_long_period
                needed = long_p + 2

                # Manter buffer com o necessário para calcular MAs
                if len(price_history) > needed + 10:
                    price_history = price_history[-(needed + 10):]

                if len(price_history) < needed:
                    continue

                # --- Calcular MAs atuais e anteriores ---
                ma_short_now  = sum(price_history[-short_p:]) / short_p
                ma_long_now   = sum(price_history[-long_p:]) / long_p
                ma_short_prev = sum(price_history[-short_p - 1:-1]) / short_p
                ma_long_prev  = sum(price_history[-long_p - 1:-1]) / long_p

                signal: Optional[str] = None

                # Crossover: MA curta cruza ACIMA da longa → COMPRA
                if ma_short_prev <= ma_long_prev and ma_short_now > ma_long_now:
                    signal = "BUY"

                # Crossover: MA curta cruza ABAIXO da longa → VENDA
                elif ma_short_prev >= ma_long_prev and ma_short_now < ma_long_now:
                    signal = "SELL"

                # --- Stop Loss / Take Profit (só se tiver posição aberta) ---
                if position_open and position_type == "BUY" and signal is None:
                    pct = (price - entry_price) / entry_price * 100
                    if pct <= -strategy.stop_loss_percent:
                        signal = "SELL"  # stop loss
                    elif pct >= strategy.take_profit_percent:
                        signal = "SELL"  # take profit

                # --- Evitar sinal desnecessário ---
                if signal == "BUY" and position_open:
                    signal = None
                if signal == "SELL" and not position_open:
                    signal = None

                if signal:
                    qty = strategy.position_size
                    total = round(price * qty, 2)

                    profit_loss: Optional[float] = None
                    if signal == "SELL" and position_open:
                        profit_loss = round((price - entry_price) * qty, 2)

                    async with AsyncSessionLocal() as db:
                        # Registrar trade
                        trade = TradeModel(
                            user_id=self.user_id,
                            strategy_id=strategy.id,
                            asset=strategy.asset,
                            order_type=TradeOrderEnum(signal),
                            trade_type=TradeTypeEnum.PAPER,
                            quantity=qty,
                            price=price,
                            total_value=total,
                            status=OrderStatusEnum.EXECUTED,
                            profit_loss=profit_loss,
                        )
                        db.add(trade)

                        # Atualizar saldo simulado
                        if profit_loss is not None:
                            settings_result = await db.execute(
                                select(UserSettings).where(UserSettings.user_id == self.user_id)
                            )
                            settings = settings_result.scalar_one_or_none()
                            if settings:
                                settings.simulated_balance += int(profit_loss * 100)

                        await db.commit()

                    # Atualizar estado da posição
                    if signal == "BUY":
                        position_open = True
                        position_type = "BUY"
                        entry_price = price
                        msg = (
                            f"📈 COMPRA {strategy.asset} @ R$ {price:.2f} "
                            f"| {qty} ações | Total: R$ {total:,.2f}"
                        )
                        level = LogLevelEnum.INFO
                    else:
                        position_open = False
                        position_type = None
                        pl_str = ""
                        if profit_loss is not None:
                            pl_str = f" | P/L: {'+' if profit_loss >= 0 else ''}R$ {profit_loss:,.2f}"
                        msg = f"📉 VENDA {strategy.asset} @ R$ {price:.2f} | {qty} ações{pl_str}"
                        level = LogLevelEnum.SUCCESS if (profit_loss or 0) >= 0 else LogLevelEnum.WARNING

                    await write_log(self.user_id, level, msg, LogTypeEnum.TRADE)

                # --- Log de monitoramento periódico ---
                if tick % 10 == 0:
                    pos_str = f"Posição: {'COMPRADO @ R$ ' + str(entry_price) if position_open else 'FORA'}"
                    await write_log(
                        self.user_id,
                        LogLevelEnum.INFO,
                        f"🔍 {strategy.asset} @ R$ {price:.2f} | MA{short_p}={ma_short_now:.2f} MA{long_p}={ma_long_now:.2f} | {pos_str}",
                        LogTypeEnum.SYSTEM
                    )

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"❌ Erro no loop de trading: {e}")
                if self.user_id:
                    await write_log(self.user_id, LogLevelEnum.ERROR, f"❌ Erro no loop: {e}", LogTypeEnum.SYSTEM)
                await asyncio.sleep(5)

    @property
    def status(self) -> str:
        """Retorna status atual do bot"""
        return "Running" if self.is_running else "Stopped"

import asyncio
from typing import Optional
from datetime import datetime

from app.services.metatrader_service import MetaTrader5Service
