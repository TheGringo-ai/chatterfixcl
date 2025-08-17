"""
Database migration system for ChatterFix CMMS
Handles schema migrations and data migrations
"""

import os
import asyncio
from pathlib import Path
from typing import List, Dict, Optional
import asyncpg
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)

class Migration:
    """Represents a single database migration"""
    
    def __init__(self, version: str, name: str, sql_path: str, rollback_path: Optional[str] = None):
        self.version = version
        self.name = name
        self.sql_path = sql_path
        self.rollback_path = rollback_path
        self.applied_at: Optional[datetime] = None
    
    def __str__(self):
        return f"Migration {self.version}: {self.name}"
    
    def __repr__(self):
        return f"Migration(version='{self.version}', name='{self.name}')"

class MigrationManager:
    """Manages database migrations"""
    
    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.migrations_dir = Path(__file__).parent / "migrations"
        self.migrations: List[Migration] = []
        self._load_migrations()
    
    def _load_migrations(self):
        """Load all migration files from the migrations directory"""
        if not self.migrations_dir.exists():
            self.migrations_dir.mkdir(exist_ok=True)
            logger.warning(f"Created migrations directory: {self.migrations_dir}")
            return
        
        migration_files = sorted(self.migrations_dir.glob("*.sql"))
        
        for file_path in migration_files:
            # Parse migration filename: 001_initial_schema.sql
            filename = file_path.stem
            parts = filename.split('_', 1)
            
            if len(parts) != 2:
                logger.warning(f"Skipping invalid migration filename: {filename}")
                continue
            
            version, name = parts
            rollback_path = self.migrations_dir / f"{filename}_rollback.sql"
            
            migration = Migration(
                version=version,
                name=name.replace('_', ' ').title(),
                sql_path=str(file_path),
                rollback_path=str(rollback_path) if rollback_path.exists() else None
            )
            
            self.migrations.append(migration)
        
        logger.info(f"Loaded {len(self.migrations)} migration files")
    
    async def ensure_migration_table(self):
        """Create the migration tracking table if it doesn't exist"""
        query = """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            checksum VARCHAR(64)
        );
        """
        
        async with self.db_manager.get_connection() as conn:
            await conn.execute(query)
            logger.info("Migration tracking table ensured")
    
    async def get_applied_migrations(self) -> Dict[str, datetime]:
        """Get list of applied migrations from the database"""
        query = "SELECT version, applied_at FROM schema_migrations ORDER BY version"
        
        try:
            async with self.db_manager.get_connection() as conn:
                rows = await conn.fetch(query)
                return {row['version']: row['applied_at'] for row in rows}
        except asyncpg.UndefinedTableError:
            # Migration table doesn't exist yet
            return {}
    
    async def run_migrations(self, target_version: Optional[str] = None):
        """Run all pending migrations up to target version"""
        await self.ensure_migration_table()
        applied_migrations = await self.get_applied_migrations()
        
        pending_migrations = [
            m for m in self.migrations 
            if m.version not in applied_migrations
        ]
        
        if target_version:
            pending_migrations = [
                m for m in pending_migrations 
                if m.version <= target_version
            ]
        
        if not pending_migrations:
            logger.info("No pending migrations to run")
            return
        
        logger.info(f"Running {len(pending_migrations)} pending migrations...")
        
        for migration in pending_migrations:
            await self._apply_migration(migration)
        
        logger.info("All migrations completed successfully")
    
    async def _apply_migration(self, migration: Migration):
        """Apply a single migration"""
        logger.info(f"Applying {migration}")
        
        # Read migration SQL
        with open(migration.sql_path, 'r') as f:
            sql_content = f.read()
        
        # Calculate checksum
        import hashlib
        checksum = hashlib.sha256(sql_content.encode()).hexdigest()
        
        async with self.db_manager.get_transaction() as conn:
            try:
                # Execute migration SQL
                await conn.execute(sql_content)
                
                # Record migration as applied
                await conn.execute(
                    """
                    INSERT INTO schema_migrations (version, name, checksum)
                    VALUES ($1, $2, $3)
                    """,
                    migration.version, migration.name, checksum
                )
                
                logger.info(f"Successfully applied {migration}")
                
            except Exception as e:
                logger.error(f"Failed to apply {migration}: {e}")
                raise
    
    async def rollback_migration(self, version: str):
        """Rollback a specific migration"""
        migration = next((m for m in self.migrations if m.version == version), None)
        
        if not migration:
            raise ValueError(f"Migration version {version} not found")
        
        if not migration.rollback_path:
            raise ValueError(f"No rollback script available for migration {version}")
        
        logger.info(f"Rolling back {migration}")
        
        # Read rollback SQL
        with open(migration.rollback_path, 'r') as f:
            rollback_sql = f.read()
        
        async with self.db_manager.get_transaction() as conn:
            try:
                # Execute rollback SQL
                await conn.execute(rollback_sql)
                
                # Remove migration record
                await conn.execute(
                    "DELETE FROM schema_migrations WHERE version = $1",
                    version
                )
                
                logger.info(f"Successfully rolled back {migration}")
                
            except Exception as e:
                logger.error(f"Failed to rollback {migration}: {e}")
                raise
    
    async def migration_status(self) -> List[Dict]:
        """Get status of all migrations"""
        applied_migrations = await self.get_applied_migrations()
        
        status = []
        for migration in self.migrations:
            applied_at = applied_migrations.get(migration.version)
            status.append({
                'version': migration.version,
                'name': migration.name,
                'applied': applied_at is not None,
                'applied_at': applied_at.isoformat() if applied_at else None
            })
        
        return status

class DataMigrator:
    """Handles data migration from current system to PostgreSQL"""
    
    def __init__(self, db_manager):
        self.db_manager = db_manager
    
    async def migrate_demo_data(self):
        """Migrate demo data from current system to PostgreSQL"""
        logger.info("Starting demo data migration...")
        
        # Demo company
        await self._migrate_company()
        
        # Demo users
        await self._migrate_users()
        
        # Demo assets
        await self._migrate_assets()
        
        # Demo work orders (if any exist in localStorage format)
        await self._migrate_work_orders()
        
        logger.info("Demo data migration completed")
    
    async def _migrate_company(self):
        """Migrate company data"""
        company_data = {
            'id': '00000000-0000-0000-0000-000000000001',
            'name': 'Demo Company',
            'location': 'Demo Location'
        }
        
        query = """
        INSERT INTO companies (id, name, location)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            location = EXCLUDED.location,
            updated_at = CURRENT_TIMESTAMP
        """
        
        async with self.db_manager.get_connection() as conn:
            await conn.execute(query, company_data['id'], company_data['name'], company_data['location'])
        
        logger.info("Migrated company data")
    
    async def _migrate_users(self):
        """Migrate user data"""
        users = [
            {
                'id': '00000000-0000-0000-0000-000000000001',
                'email': 'admin@demo.com',
                'name': 'Admin User',
                'role': 'ADMIN'
            },
            {
                'id': '00000000-0000-0000-0000-000000000002',
                'email': 'tech@demo.com',
                'name': 'Demo Technician',
                'role': 'TECHNICIAN'
            },
            {
                'id': '00000000-0000-0000-0000-000000000003',
                'email': 'manager@demo.com',
                'name': 'Demo Manager',
                'role': 'MANAGER'
            }
        ]
        
        query = """
        INSERT INTO users (id, email, name, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            updated_at = CURRENT_TIMESTAMP
        """
        
        async with self.db_manager.get_connection() as conn:
            for user in users:
                await conn.execute(query, user['id'], user['email'], user['name'], user['role'])
        
        logger.info(f"Migrated {len(users)} users")
    
    async def _migrate_assets(self):
        """Migrate asset data"""
        assets = [
            {
                'id': '00000000-0000-0000-0000-000000000001',
                'asset_code': 'MV-AIS-001',
                'name': 'Multivac AIS Packaging Line',
                'location': 'Production Floor A',
                'status': 'ACTIVE',
                'category': 'PACKAGING'
            },
            {
                'id': '00000000-0000-0000-0000-000000000002',
                'asset_code': 'CB-003',
                'name': 'Conveyor Belt #3',
                'location': 'Assembly Line B',
                'status': 'WARNING',
                'category': 'CONVEYOR'
            }
        ]
        
        query = """
        INSERT INTO assets (id, asset_code, name, location, status, category, company_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (asset_code) DO UPDATE SET
            name = EXCLUDED.name,
            location = EXCLUDED.location,
            status = EXCLUDED.status,
            category = EXCLUDED.category,
            updated_at = CURRENT_TIMESTAMP
        """
        
        company_id = '00000000-0000-0000-0000-000000000001'
        
        async with self.db_manager.get_connection() as conn:
            for asset in assets:
                await conn.execute(
                    query,
                    asset['id'], asset['asset_code'], asset['name'],
                    asset['location'], asset['status'], asset['category'],
                    company_id
                )
        
        logger.info(f"Migrated {len(assets)} assets")
    
    async def _migrate_work_orders(self):
        """Migrate any existing work order data"""
        # This would read from localStorage/IndexedDB format if available
        # For now, just create a sample work order
        
        work_order = {
            'id': '00000000-0000-0000-0000-000000000001',
            'wo_number': 'WO-2024-001',
            'title': 'Maintenance on Conveyor Belt #3',
            'description': 'Investigate loud noise from conveyor belt',
            'priority': 'MEDIUM',
            'status': 'OPEN',
            'asset_id': '00000000-0000-0000-0000-000000000002',
            'assigned_to': '00000000-0000-0000-0000-000000000002',
            'created_by': '00000000-0000-0000-0000-000000000001'
        }
        
        query = """
        INSERT INTO work_orders (id, wo_number, title, description, priority, status, asset_id, assigned_to, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (wo_number) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
        """
        
        async with self.db_manager.get_connection() as conn:
            await conn.execute(
                query,
                work_order['id'], work_order['wo_number'], work_order['title'],
                work_order['description'], work_order['priority'], work_order['status'],
                work_order['asset_id'], work_order['assigned_to'], work_order['created_by']
            )
        
        logger.info("Migrated sample work order")

# CLI interface for migrations
async def run_migrations_cli():
    """CLI interface for running migrations"""
    from .config import db_manager
    
    migration_manager = MigrationManager(db_manager)
    
    try:
        await db_manager.initialize()
        await migration_manager.run_migrations()
        
        # Optionally run data migration
        data_migrator = DataMigrator(db_manager)
        await data_migrator.migrate_demo_data()
        
    finally:
        await db_manager.close()

if __name__ == "__main__":
    asyncio.run(run_migrations_cli())