"""
Script para semear logs de demonstração no banco de dados
"""
import asyncio
from datetime import datetime, timedelta
from app.core.database import AsyncSessionLocal
# Importar todos os modelos para que o SQLAlchemy registre os relacionamentos
import app.models.user
import app.models.strategy
import app.models.trade
import app.models.backtest
import app.models.settings
from app.models.log import Log, LogLevelEnum, LogTypeEnum


DEMO_LOGS = [
    (LogLevelEnum.SUCCESS, LogTypeEnum.BOT_STATUS,  "✅ Bot iniciado com sucesso"),
    (LogLevelEnum.INFO,    LogTypeEnum.SYSTEM,       "🔍 Monitorando mercado... (ciclo 1)"),
    (LogLevelEnum.INFO,    LogTypeEnum.STRATEGY_UPDATED, "⚙️ Parâmetros da estratégia atualizados: MA 9/21 em PETR4"),
    (LogLevelEnum.SUCCESS, LogTypeEnum.ORDER_EXECUTED,   "🟢 BUY executado: PETR4 @ R$ 25.50 (100 ações)"),
    (LogLevelEnum.INFO,    LogTypeEnum.SYSTEM,       "🔍 Monitorando mercado... (ciclo 2)"),
    (LogLevelEnum.SUCCESS, LogTypeEnum.ORDER_EXECUTED,   "🔴 SELL executado: PETR4 @ R$ 26.10 | P/L: +R$ 60,00"),
    (LogLevelEnum.INFO,    LogTypeEnum.SYSTEM,       "🔍 Monitorando mercado... (ciclo 3)"),
    (LogLevelEnum.WARNING, LogTypeEnum.SYSTEM,       "⚠️ MT5 não disponível — usando modo simulado"),
    (LogLevelEnum.SUCCESS, LogTypeEnum.ORDER_EXECUTED,   "🟢 BUY executado: ITUB4 @ R$ 32.80 (100 ações)"),
    (LogLevelEnum.INFO,    LogTypeEnum.SYSTEM,       "🔍 Monitorando mercado... (ciclo 4)"),
    (LogLevelEnum.ERROR,   LogTypeEnum.CONNECTION_ERROR, "❌ Timeout ao consultar dados — tentando novamente"),
    (LogLevelEnum.INFO,    LogTypeEnum.SYSTEM,       "🔁 Reconectado após falha temporária"),
    (LogLevelEnum.SUCCESS, LogTypeEnum.ORDER_EXECUTED,   "🔴 SELL executado: ITUB4 @ R$ 33.40 | P/L: +R$ 60,00"),
    (LogLevelEnum.INFO,    LogTypeEnum.BOT_STATUS,   "🛑 Bot parado pelo usuário"),
]


async def seed():
    async with AsyncSessionLocal() as session:
        # Checar se já existem logs
        from sqlalchemy import select, func
        result = await session.execute(select(func.count()).select_from(Log).where(Log.user_id == 1))
        count = result.scalar()
        if count > 0:
            print(f"Já existem {count} logs. Pulando seed.")
            return

        base_time = datetime.now() - timedelta(minutes=len(DEMO_LOGS) * 5)
        for i, (level, log_type, message) in enumerate(DEMO_LOGS):
            log = Log(
                user_id=1,
                level=level,
                log_type=log_type,
                message=message,
            )
            session.add(log)

        await session.commit()
        print(f"✅ {len(DEMO_LOGS)} logs de demonstração inseridos!")


if __name__ == "__main__":
    asyncio.run(seed())
