from app.core.database import AsyncSessionLocal
import asyncio
from sqlalchemy import text
async def create_user():
    async with AsyncSessionLocal() as session:
        await session.execute(text("INSERT INTO users (id, email, hashed_password, is_active) VALUES (1, 'test@test.com', 'dummy', true) ON CONFLICT DO NOTHING"))
        await session.commit()
if __name__ == "__main__":
    asyncio.run(create_user())
