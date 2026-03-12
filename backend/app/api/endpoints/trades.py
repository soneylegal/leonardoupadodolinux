"""
Endpoints de Trades
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, cast, String
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.api.endpoints.auth import get_current_user
from app.models.user import User
from app.models.trade import Trade, OrderTypeEnum, OrderStatusEnum, TradeTypeEnum
from app.models.settings import UserSettings
from app.schemas.schemas import TradeCreate, TradeResponse

router = APIRouter()


@router.get("/", response_model=List[TradeResponse])
async def list_trades(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista trades do usuário"""
    result = await db.execute(
        select(Trade)
        .where(Trade.user_id == current_user.id)
        .order_by(Trade.executed_at.desc())
        .limit(limit)
    )
    trades = result.scalars().all()
    return trades


@router.post("/paper", response_model=TradeResponse)
async def execute_paper_trade(
    trade_data: TradeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Executa um trade em modo paper trading"""
    
    # Obter configurações do usuário
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings or not settings.paper_trading_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paper trading não está habilitado"
        )
    
    total_value = trade_data.quantity * trade_data.price
    
    # Verificar saldo para compra
    if trade_data.order_type == OrderTypeEnum.BUY:
        if settings.simulated_balance < total_value * 100:  # Convertendo para centavos
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Saldo simulado insuficiente"
            )
        settings.simulated_balance -= int(total_value * 100)
    else:
        settings.simulated_balance += int(total_value * 100)
    
    # Criar trade
    trade = Trade(
        user_id=current_user.id,
        asset=trade_data.asset,
        order_type=trade_data.order_type,
        trade_type=TradeTypeEnum.PAPER,
        quantity=trade_data.quantity,
        price=trade_data.price,
        total_value=total_value,
        status=OrderStatusEnum.EXECUTED
    )
    db.add(trade)
    await db.commit()
    await db.refresh(trade)
    
    return trade


@router.get("/positions")
async def get_open_positions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retorna posições abertas (simplificado)"""
    # Agrupa trades por ativo para calcular posição líquida
    result = await db.execute(
        select(Trade)
        .where(
            and_(
                Trade.user_id == current_user.id,
                cast(Trade.status, String) == OrderStatusEnum.EXECUTED.value
            )
        )
        .order_by(Trade.executed_at.desc())
    )
    trades = result.scalars().all()
    
    positions = {}
    for trade in trades:
        if trade.asset not in positions:
            positions[trade.asset] = {"quantity": 0, "avg_price": 0, "total_cost": 0}
        
        if trade.order_type == OrderTypeEnum.BUY:
            positions[trade.asset]["quantity"] += trade.quantity
            positions[trade.asset]["total_cost"] += trade.total_value
        else:
            positions[trade.asset]["quantity"] -= trade.quantity
            positions[trade.asset]["total_cost"] -= trade.total_value
    
    # Calcular preço médio
    result = []
    for asset, pos in positions.items():
        if pos["quantity"] > 0:
            avg_price = pos["total_cost"] / pos["quantity"] if pos["quantity"] > 0 else 0
            result.append({
                "asset": asset,
                "quantity": pos["quantity"],
                "avg_price": round(avg_price, 2)
            })
    
    return result


@router.get("/balance")
async def get_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retorna saldo simulado"""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()
    
    balance = settings.simulated_balance / 100 if settings else 10000.0
    
    return {
        "simulated_balance": balance,
        "currency": "BRL"
    }
