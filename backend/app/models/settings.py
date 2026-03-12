"""
Modelo de Configurações do Usuário
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class UserSettings(Base):
    """Configurações do usuário - API Keys e preferências"""
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Chaves de API criptografadas
    api_key_encrypted = Column(String(500), nullable=True)
    api_secret_encrypted = Column(String(500), nullable=True)
    
    # Preferências
    paper_trading_enabled = Column(Boolean, default=True)
    dark_mode_enabled = Column(Boolean, default=True)
    
    # Saldo simulado para paper trading
    simulated_balance = Column(Integer, default=1000000)  # Em centavos (R$ 10.000,00)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamento
    user = relationship("User", back_populates="settings")
