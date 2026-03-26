"""
Trading Bot API - Ponto de entrada principal
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api import router as api_router
from app.core.config import settings
from app.core.database import engine, Base
from app.services.bot_manager import BotManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação"""
    # Startup
    print("🚀 Iniciando Trading Bot API...")
    
    from sqlalchemy import text
    from app.core.database import AsyncSessionLocal
    
    # Criar tabelas no banco de dados
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # Inicializar seed de usuário basico para evitar ForeignKey violations no Azure
    async with AsyncSessionLocal() as session:
        await session.execute(text("INSERT INTO users (id, email, hashed_password, is_active) VALUES (1, 'admin@tradingbot.com', 'dummy', true) ON CONFLICT DO NOTHING"))
        await session.commit()
    
    # Inicializar o gerenciador do bot
    app.state.bot_manager = BotManager()
    
    yield
    
    # Shutdown
    print("🛑 Encerrando Trading Bot API...")
    if hasattr(app.state, 'bot_manager'):
        await app.state.bot_manager.stop()


app = FastAPI(
    title="Trading Bot API",
    description="API para gerenciamento de bot de trading automatizado",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar origens permitidas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rotas da API
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Endpoint raiz - Health check"""
    return {
        "status": "online",
        "message": "Trading Bot API está funcionando!",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Verificação de saúde da API"""
    return {
        "status": "healthy",
        "database": "connected",
        "bot_status": "ready"
    }
