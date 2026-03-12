"""
Endpoints de Backtesting
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.endpoints.auth import get_current_user
from app.models.user import User
from app.models.strategy import Strategy
from app.models.backtest import Backtest
from app.schemas.schemas import BacktestRequest, BacktestResponse
from app.services.backtesting_service import BacktestingService

router = APIRouter()


@router.post("/run", response_model=BacktestResponse)
async def run_backtest(
    backtest_data: BacktestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Executa um backtest para uma estratégia"""
    
    # Verificar se estratégia existe
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == backtest_data.strategy_id,
            Strategy.user_id == current_user.id
        )
    )
    strategy = result.scalar_one_or_none()
    
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estratégia não encontrada"
        )
    
    # Definir período
    period_map = {
        "3M": 90,
        "6M": 180,
        "1Y": 365
    }
    days = period_map.get(backtest_data.period, 365)
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Executar backtest
    backtesting_service = BacktestingService()
    results = await backtesting_service.run_backtest(
        strategy=strategy,
        start_date=start_date,
        end_date=end_date,
        db=db
    )
    
    # Salvar resultados
    backtest = Backtest(
        strategy_id=strategy.id,
        start_date=start_date,
        end_date=end_date,
        total_return=results["total_return"],
        win_rate=results["win_rate"],
        max_drawdown=results["max_drawdown"],
        sharpe_ratio=results["sharpe_ratio"],
        total_trades=results["total_trades"],
        winning_trades=results["winning_trades"],
        losing_trades=results["losing_trades"],
        initial_balance=results["initial_balance"],
        final_balance=results["final_balance"],
        chart_data=results["chart_data"]
    )
    db.add(backtest)
    await db.commit()
    await db.refresh(backtest)
    
    return backtest


@router.get("/history", response_model=List[BacktestResponse])
async def get_backtest_history(
    strategy_id: int = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista histórico de backtests"""
    query = select(Backtest).join(Strategy).where(
        Strategy.user_id == current_user.id
    )
    
    if strategy_id:
        query = query.where(Backtest.strategy_id == strategy_id)
    
    query = query.order_by(Backtest.created_at.desc())
    
    result = await db.execute(query)
    backtests = result.scalars().all()
    
    return backtests


@router.get("/{backtest_id}", response_model=BacktestResponse)
async def get_backtest(
    backtest_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtém detalhes de um backtest específico"""
    result = await db.execute(
        select(Backtest).join(Strategy).where(
            Backtest.id == backtest_id,
            Strategy.user_id == current_user.id
        )
    )
    backtest = result.scalar_one_or_none()
    
    if not backtest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backtest não encontrado"
        )
    
    return backtest
