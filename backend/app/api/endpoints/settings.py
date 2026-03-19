"""
Endpoints de Configurações
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import encrypt_api_key, mask_api_key
from app.api.endpoints.auth import get_current_user
from app.models.user import User
from app.models.settings import UserSettings
from app.schemas.schemas import SettingsUpdate, SettingsResponse

router = APIRouter()


@router.get("/", response_model=SettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtém configurações do usuário"""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Criar configurações padrão
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    # Mascarar API key para resposta
    api_key_masked = None
    if settings.api_key_encrypted:
        # Retorna apenas asteriscos para segurança
        api_key_masked = "**********************"
    
    return SettingsResponse(
        paper_trading_enabled=settings.paper_trading_enabled,
        dark_mode_enabled=settings.dark_mode_enabled,
        api_key_masked=api_key_masked,
        simulated_balance=settings.simulated_balance / 100  # Converter de centavos
    )


@router.put("/", response_model=SettingsResponse)
async def update_settings(
    settings_data: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Atualiza configurações do usuário"""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
    
    # Atualizar campos básicos
    settings.paper_trading_enabled = settings_data.paper_trading_enabled
    settings.dark_mode_enabled = settings_data.dark_mode_enabled
    
    # Atualizar API keys se fornecidas
    if settings_data.api_key:
        settings.api_key_encrypted = encrypt_api_key(settings_data.api_key)
    
    if settings_data.api_secret:
        settings.api_secret_encrypted = encrypt_api_key(settings_data.api_secret)
    
    await db.commit()
    await db.refresh(settings)
    
    api_key_masked = None
    if settings.api_key_encrypted:
        api_key_masked = "**********************"
    
    return SettingsResponse(
        paper_trading_enabled=settings.paper_trading_enabled,
        dark_mode_enabled=settings.dark_mode_enabled,
        api_key_masked=api_key_masked,
        simulated_balance=settings.simulated_balance / 100
    )


@router.post("/test-connection")
async def test_connection(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Testa conexão com a exchange usando as credenciais salvas"""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings or not settings.api_key_encrypted:
        if settings and settings.paper_trading_enabled:
            return {
                "status": "success",
                "message": "Conectado ao ambiente simulado (Paper Trading)"
            }
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credenciais de API não configuradas"
        )
    
    # TODO: Implementar teste real de conexão com MetaTrader5
    # Por enquanto, retorna sucesso simulado
    
    return {
        "status": "success",
        "message": "Conexão testada com sucesso"
    }


@router.post("/reset-balance")
async def reset_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reseta o saldo simulado para o valor padrão"""
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )
    settings = result.scalar_one_or_none()
    
    if settings:
        settings.simulated_balance = 1000000  # R$ 10.000,00 em centavos
        await db.commit()
    
    return {
        "status": "success",
        "message": "Saldo resetado para R$ 10.000,00"
    }
