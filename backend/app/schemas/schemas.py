"""
Schemas Pydantic para validação de dados
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ================= ENUMS =================

class TimeframeEnum(str, Enum):
    M1 = "1M"
    M5 = "5M"
    H1 = "1H"
    D1 = "1D"


class OrderTypeEnum(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class LogLevelEnum(str, Enum):
    SUCCESS = "SUCCESS"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


# ================= USER SCHEMAS =================

class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ================= SETTINGS SCHEMAS =================

class SettingsBase(BaseModel):
    paper_trading_enabled: bool = True
    dark_mode_enabled: bool = True


class SettingsUpdate(SettingsBase):
    api_key: Optional[str] = None
    api_secret: Optional[str] = None


class SettingsResponse(SettingsBase):
    api_key_masked: Optional[str] = None
    simulated_balance: float
    
    class Config:
        from_attributes = True


# ================= STRATEGY SCHEMAS =================

class StrategyBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    asset: str = "PETR4"
    timeframe: TimeframeEnum = TimeframeEnum.D1


class StrategyCreate(StrategyBase):
    ma_short_period: int = Field(default=9, ge=2, le=50)
    ma_long_period: int = Field(default=21, ge=5, le=200)
    stop_loss_percent: float = Field(default=2.0, ge=0.5, le=10.0)
    take_profit_percent: float = Field(default=4.0, ge=1.0, le=20.0)
    position_size: int = Field(default=100, ge=1)


class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    asset: Optional[str] = None
    timeframe: Optional[TimeframeEnum] = None
    ma_short_period: Optional[int] = None
    ma_long_period: Optional[int] = None
    is_active: Optional[bool] = None


class StrategyResponse(StrategyBase):
    id: int
    ma_short_period: int
    ma_long_period: int
    stop_loss_percent: float
    take_profit_percent: float
    position_size: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ================= TRADE SCHEMAS =================

class TradeCreate(BaseModel):
    asset: str
    order_type: OrderTypeEnum
    quantity: int = Field(..., ge=1)
    price: float = Field(..., gt=0)


class TradeResponse(BaseModel):
    id: int
    asset: str
    order_type: OrderTypeEnum
    quantity: int
    price: float
    total_value: float
    status: str
    executed_at: datetime
    
    class Config:
        from_attributes = True


# ================= BACKTEST SCHEMAS =================

class BacktestRequest(BaseModel):
    strategy_id: int
    period: str = "1Y"  # 3M, 6M, 1Y


class BacktestResponse(BaseModel):
    id: int
    strategy_id: int
    start_date: datetime
    end_date: datetime
    total_return: float
    win_rate: float
    max_drawdown: float
    sharpe_ratio: float
    total_trades: int
    avg_win: Optional[float] = None
    avg_loss: Optional[float] = None
    chart_data: Optional[dict] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ================= LOG SCHEMAS =================

class LogResponse(BaseModel):
    id: int
    level: LogLevelEnum
    message: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ================= DASHBOARD SCHEMAS =================

class BotStatus(BaseModel):
    is_running: bool
    status_text: str


class DashboardResponse(BaseModel):
    bot_status: BotStatus
    todays_pnl: float
    last_trade: Optional[TradeResponse] = None
    current_price: float
    asset: str


# ================= CHART DATA SCHEMAS =================

class CandleData(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class ChartResponse(BaseModel):
    asset: str
    timeframe: str
    candles: List[CandleData]
    ma_short: List[float]
    ma_long: List[float]
