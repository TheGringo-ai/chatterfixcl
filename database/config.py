"""
Database configuration for ChatterFix CMMS
Production-ready PostgreSQL connection with pooling and async support
"""

import os
import asyncio
from typing import Optional, AsyncGenerator
import asyncpg
from asyncpg import Pool
import logging
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Database configuration class"""
    
    def __init__(self):
        # Database connection parameters
        self.host = os.getenv('DB_HOST', 'localhost')
        self.port = int(os.getenv('DB_PORT', '5432'))
        self.database = os.getenv('DB_NAME', 'chatterfix_cmms')
        self.username = os.getenv('DB_USER', 'chatterfix_app')
        self.password = os.getenv('DB_PASSWORD', 'your_secure_password')
        
        # Connection pool settings
        self.min_pool_size = int(os.getenv('DB_MIN_POOL_SIZE', '5'))
        self.max_pool_size = int(os.getenv('DB_MAX_POOL_SIZE', '20'))
        self.max_queries = int(os.getenv('DB_MAX_QUERIES', '50000'))
        self.max_inactive_time = int(os.getenv('DB_MAX_INACTIVE_TIME', '300'))
        
        # SSL settings
        self.ssl_mode = os.getenv('DB_SSL_MODE', 'prefer')  # 'require' for production
        
        # Connection URL
        self.database_url = self._build_database_url()
    
    def _build_database_url(self) -> str:
        """Build database URL from components"""
        return (
            f"postgresql://{self.username}:{self.password}"
            f"@{self.host}:{self.port}/{self.database}"
            f"?sslmode={self.ssl_mode}"
        )

class DatabaseManager:
    """Database connection manager with pooling"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self.pool: Optional[Pool] = None
        self._lock = asyncio.Lock()
    
    async def initialize(self) -> None:
        """Initialize database connection pool"""
        if self.pool is not None:
            return
            
        async with self._lock:
            if self.pool is not None:
                return
                
            try:
                logger.info("Initializing database connection pool...")
                
                self.pool = await asyncpg.create_pool(
                    host=self.config.host,
                    port=self.config.port,
                    database=self.config.database,
                    user=self.config.username,
                    password=self.config.password,
                    min_size=self.config.min_pool_size,
                    max_size=self.config.max_pool_size,
                    max_queries=self.config.max_queries,
                    max_inactive_connection_lifetime=self.config.max_inactive_time,
                    command_timeout=60,
                    server_settings={
                        'application_name': 'chatterfix_cmms',
                        'timezone': 'UTC'
                    }
                )
                
                # Test connection
                async with self.pool.acquire() as conn:
                    version = await conn.fetchval("SELECT version()")
                    logger.info(f"Connected to PostgreSQL: {version}")
                    
                logger.info(
                    f"Database pool initialized: {self.config.min_pool_size}-{self.config.max_pool_size} connections"
                )
                
            except Exception as e:
                logger.error(f"Failed to initialize database pool: {e}")
                raise
    
    async def close(self) -> None:
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            self.pool = None
            logger.info("Database connection pool closed")
    
    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[asyncpg.Connection, None]:
        """Get a database connection from the pool"""
        if not self.pool:
            await self.initialize()
            
        async with self.pool.acquire() as connection:
            yield connection
    
    @asynccontextmanager
    async def get_transaction(self) -> AsyncGenerator[asyncpg.Connection, None]:
        """Get a database connection with transaction"""
        async with self.get_connection() as conn:
            async with conn.transaction():
                yield conn
    
    async def execute(self, query: str, *args) -> str:
        """Execute a query without returning results"""
        async with self.get_connection() as conn:
            return await conn.execute(query, *args)
    
    async def fetch(self, query: str, *args) -> list:
        """Fetch multiple rows"""
        async with self.get_connection() as conn:
            return await conn.fetch(query, *args)
    
    async def fetchrow(self, query: str, *args) -> Optional[asyncpg.Record]:
        """Fetch a single row"""
        async with self.get_connection() as conn:
            return await conn.fetchrow(query, *args)
    
    async def fetchval(self, query: str, *args):
        """Fetch a single value"""
        async with self.get_connection() as conn:
            return await conn.fetchval(query, *args)
    
    async def health_check(self) -> bool:
        """Check database health"""
        try:
            async with self.get_connection() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False

# Global database manager instance
db_config = DatabaseConfig()
db_manager = DatabaseManager(db_config)

# Convenience functions for FastAPI dependency injection
async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """FastAPI dependency for database connection"""
    async with db_manager.get_connection() as conn:
        yield conn

async def get_db_transaction() -> AsyncGenerator[asyncpg.Connection, None]:
    """FastAPI dependency for database transaction"""
    async with db_manager.get_transaction() as conn:
        yield conn

# Startup and shutdown functions for FastAPI
async def startup_database():
    """Initialize database on application startup"""
    await db_manager.initialize()

async def shutdown_database():
    """Close database connections on application shutdown"""
    await db_manager.close()