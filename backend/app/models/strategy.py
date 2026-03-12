"""
Modelo de Estratégia de Trading
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class TimeframeEnum(str, enum.Enum):
    """Intervalos de tempo disponíveis"""
    M1 = "1M"
    M5 = "5M"
    H1 = "1H"
    D1 = "1D"


class StrategyTypeEnum(str, enum.Enum):
    """Tipos de estratégia disponíveis"""
    MA_CROSSOVER = "ma_crossover"
    RSI = "rsi"
    MACD = "macd"
    CUSTOM = "custom"


class Strategy(Base):
    """Modelo de estratégia de trading"""
    __tablename__ = "strategies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Identificação
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    
    # Configuração do ativo
    asset = Column(String(20), nullable=False, default="PETR4")
    timeframe = Column(Enum(TimeframeEnum), default=TimeframeEnum.D1)
    
    # Tipo de estratégia
    strategy_type = Column(Enum(StrategyTypeEnum), default=StrategyTypeEnum.MA_CROSSOVER)
    
    # Parâmetros para Médias Móveis
    ma_short_period = Column(Integer, default=9)
    ma_long_period = Column(Integer, default=21)
    
    # Parâmetros para RSI
    rsi_period = Column(Integer, default=14)
    rsi_overbought = Column(Integer, default=70)
    rsi_oversold = Column(Integer, default=30)
    
    # Parâmetros para MACD
    macd_fast = Column(Integer, default=12)
    macd_slow = Column(Integer, default=26)
    macd_signal = Column(Integer, default=9)
    
    # Gerenciamento de Risco
    stop_loss_percent = Column(Float, default=2.0)
    take_profit_percent = Column(Float, default=4.0)
    position_size = Column(Integer, default=100)  # Quantidade de ações
    
    # Estado
    is_active = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    user = relationship("User", back_populates="strategies")
    backtests = relationship("Backtest", back_populates="strategy")
    trades = relationship("Trade", back_populates="strategy")
