"""
Endpoints de Estratégias
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List

from app.core.database import get_db
from app.api.endpoints.auth import get_current_user
from app.models.user import User
from app.models.strategy import Strategy
from app.schemas.schemas import StrategyCreate, StrategyUpdate, StrategyResponse

router = APIRouter()


@router.get("/", response_model=List[StrategyResponse])
async def list_strategies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista todas as estratégias do usuário"""
    result = await db.execute(
        select(Strategy).where(Strategy.user_id == current_user.id)
    )
    strategies = result.scalars().all()
    return strategies


@router.post("/", response_model=StrategyResponse)
async def create_strategy(
    strategy_data: StrategyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cria uma nova estratégia"""
    # Desativa todas as outras estratégias do usuário
    await db.execute(
        update(Strategy).where(Strategy.user_id == current_user.id).values(is_active=False)
    )
    
    strategy = Strategy(
        user_id=current_user.id,
        is_active=True,
        **strategy_data.model_dump()
    )
    db.add(strategy)
    await db.commit()
    await db.refresh(strategy)

    return strategy
@router.get("/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(
    strategy_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtém uma estratégia específica"""
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id
        )
    )
    strategy = result.scalar_one_or_none()
    
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estratégia não encontrada"
        )
    
    return strategy


@router.put("/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: int,
    strategy_data: StrategyUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma estratégia"""
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id
        )
    )
    strategy = result.scalar_one_or_none()
    
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estratégia não encontrada"
        )
    
    # Atualizar campos
    update_data = strategy_data.model_dump(exclude_unset=True)
    
    if update_data.get("is_active"):
        # Se ativando esta, desativa as outras
        await db.execute(
            update(Strategy).where(Strategy.user_id == current_user.id).values(is_active=False)
        )
        
    for field, value in update_data.items():
        setattr(strategy, field, value)
    
    await db.commit()
    await db.refresh(strategy)
    
    return strategy


@router.delete("/{strategy_id}")
async def delete_strategy(
    strategy_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deleta uma estratégia"""
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id
        )
    )
    strategy = result.scalar_one_or_none()
    
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Estratégia não encontrada"
        )
    
    await db.delete(strategy)
    await db.commit()
    
    return {"message": "Estratégia deletada com sucesso"}


@router.get("/assets/available")
async def get_available_assets(
    current_user: User = Depends(get_current_user)
):
    """Lista ativos disponíveis para negociação"""
    # Lista de ativos B3 populares
    assets = [
        {"symbol": "PETR4", "name": "Petrobras PN"},
        {"symbol": "VALE3", "name": "Vale ON"},
        {"symbol": "ITUB4", "name": "Itaú Unibanco PN"},
        {"symbol": "BBDC4", "name": "Bradesco PN"},
        {"symbol": "ABEV3", "name": "Ambev ON"},
        {"symbol": "WEGE3", "name": "WEG ON"},
        {"symbol": "RENT3", "name": "Localiza ON"},
        {"symbol": "SUZB3", "name": "Suzano ON"},
        {"symbol": "GGBR4", "name": "Gerdau PN"},
        {"symbol": "LREN3", "name": "Lojas Renner ON"},
    ]
    return assets
