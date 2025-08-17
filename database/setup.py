#!/usr/bin/env python3
"""
Database setup script for ChatterFix CMMS
Handles database creation, user setup, and initial migration
"""

import asyncio
import asyncpg
import os
import sys
from pathlib import Path
from typing import Optional
import logging
from dotenv import load_dotenv

# Add parent directory to path to import our modules
sys.path.append(str(Path(__file__).parent.parent))

from database.config import DatabaseConfig
from database.migrations import MigrationManager, DataMigrator

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseSetup:
    """Database setup and initialization"""
    
    def __init__(self):
        self.config = DatabaseConfig()
        self.admin_config = self._get_admin_config()
    
    def _get_admin_config(self) -> DatabaseConfig:
        """Get admin configuration for initial setup"""
        admin_config = DatabaseConfig()
        # Use postgres user for initial setup
        admin_config.username = os.getenv('DB_ADMIN_USER', 'postgres')
        admin_config.password = os.getenv('DB_ADMIN_PASSWORD', 'postgres')
        admin_config.database = 'postgres'  # Connect to default database
        return admin_config
    
    async def create_database(self):
        """Create the application database if it doesn't exist"""
        logger.info(f"Creating database: {self.config.database}")
        
        # Connect as admin user
        conn = await asyncpg.connect(
            host=self.admin_config.host,
            port=self.admin_config.port,
            database=self.admin_config.database,
            user=self.admin_config.username,
            password=self.admin_config.password
        )
        
        try:
            # Check if database exists
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_database WHERE datname = $1",
                self.config.database
            )
            
            if not exists:
                # Create database
                await conn.execute(f'CREATE DATABASE "{self.config.database}"')
                logger.info(f"Database {self.config.database} created successfully")
            else:
                logger.info(f"Database {self.config.database} already exists")
        
        finally:
            await conn.close()
    
    async def create_user(self):
        """Create the application database user"""
        logger.info(f"Creating user: {self.config.username}")
        
        # Connect as admin user
        conn = await asyncpg.connect(
            host=self.admin_config.host,
            port=self.admin_config.port,
            database=self.admin_config.database,
            user=self.admin_config.username,
            password=self.admin_config.password
        )
        
        try:
            # Check if user exists
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_user WHERE usename = $1",
                self.config.username
            )
            
            if not exists:
                # Create user
                await conn.execute(
                    f"""
                    CREATE USER "{self.config.username}" 
                    WITH PASSWORD '{self.config.password}'
                    """
                )
                logger.info(f"User {self.config.username} created successfully")
            else:
                logger.info(f"User {self.config.username} already exists")
                
                # Update password
                await conn.execute(
                    f"""
                    ALTER USER "{self.config.username}" 
                    WITH PASSWORD '{self.config.password}'
                    """
                )
                logger.info(f"Updated password for user {self.config.username}")
        
        finally:
            await conn.close()
    
    async def grant_permissions(self):
        """Grant necessary permissions to the application user"""
        logger.info("Granting database permissions")
        
        # Connect to the application database as admin
        conn = await asyncpg.connect(
            host=self.admin_config.host,
            port=self.admin_config.port,
            database=self.config.database,
            user=self.admin_config.username,
            password=self.admin_config.password
        )
        
        try:
            # Grant schema permissions
            await conn.execute(f'GRANT USAGE ON SCHEMA public TO "{self.config.username}"')
            await conn.execute(f'GRANT CREATE ON SCHEMA public TO "{self.config.username}"')
            
            # Grant table permissions (these will apply to future tables too)
            await conn.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "{self.config.username}"')
            await conn.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "{self.config.username}"')
            await conn.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "{self.config.username}"')
            
            logger.info("Database permissions granted successfully")
        
        finally:
            await conn.close()
    
    async def setup_complete_database(self):
        """Complete database setup process"""
        logger.info("Starting complete database setup...")
        
        try:
            # Step 1: Create database
            await self.create_database()
            
            # Step 2: Create user
            await self.create_user()
            
            # Step 3: Grant permissions
            await self.grant_permissions()
            
            # Step 4: Run migrations
            from database.config import db_manager
            await db_manager.initialize()
            
            migration_manager = MigrationManager(db_manager)
            await migration_manager.run_migrations()
            
            # Step 5: Migrate demo data
            data_migrator = DataMigrator(db_manager)
            await data_migrator.migrate_demo_data()
            
            await db_manager.close()
            
            logger.info("Database setup completed successfully!")
            
        except Exception as e:
            logger.error(f"Database setup failed: {e}")
            raise

async def main():
    """Main setup function"""
    setup = DatabaseSetup()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "create-db":
            await setup.create_database()
        elif command == "create-user":
            await setup.create_user()
        elif command == "grant-permissions":
            await setup.grant_permissions()
        elif command == "migrate":
            from database.config import db_manager
            await db_manager.initialize()
            migration_manager = MigrationManager(db_manager)
            await migration_manager.run_migrations()
            await db_manager.close()
        elif command == "seed-data":
            from database.config import db_manager
            await db_manager.initialize()
            data_migrator = DataMigrator(db_manager)
            await data_migrator.migrate_demo_data()
            await db_manager.close()
        elif command == "setup":
            await setup.setup_complete_database()
        else:
            print("Usage: python setup.py [create-db|create-user|grant-permissions|migrate|seed-data|setup]")
            sys.exit(1)
    else:
        # Run complete setup by default
        await setup.setup_complete_database()

if __name__ == "__main__":
    asyncio.run(main())