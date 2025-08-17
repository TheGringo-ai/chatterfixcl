"""
Database backup and recovery system for ChatterFix CMMS
Handles automated backups, point-in-time recovery, and disaster recovery
"""

import asyncio
import asyncpg
import os
import subprocess
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
import json
import gzip
import tarfile

from .config import DatabaseConfig

logger = logging.getLogger(__name__)

class BackupManager:
    """Manages database backups and recovery operations"""
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        self.config = config or DatabaseConfig()
        self.backup_dir = Path(os.getenv('BACKUP_DIR', '/var/backups/chatterfix'))
        self.retention_days = int(os.getenv('BACKUP_RETENTION_DAYS', '30'))
        self.max_backups = int(os.getenv('MAX_BACKUPS', '100'))
        
        # Ensure backup directory exists
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    async def create_full_backup(self, backup_name: Optional[str] = None) -> Dict[str, Any]:
        """Create a full database backup using pg_dump"""
        if not backup_name:
            backup_name = f"chatterfix_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        backup_file = self.backup_dir / f"{backup_name}.sql.gz"
        
        try:
            logger.info(f"Starting full backup: {backup_name}")
            
            # Build pg_dump command
            pg_dump_cmd = [
                'pg_dump',
                '--host', self.config.host,
                '--port', str(self.config.port),
                '--username', self.config.username,
                '--dbname', self.config.database,
                '--verbose',
                '--clean',
                '--if-exists',
                '--create',
                '--format=plain'
            ]
            
            # Set password via environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = self.config.password
            
            # Run pg_dump and compress output
            with gzip.open(backup_file, 'wt') as f:
                process = subprocess.run(
                    pg_dump_cmd,
                    stdout=f,
                    stderr=subprocess.PIPE,
                    env=env,
                    check=True,
                    text=True
                )
            
            # Get backup file size
            backup_size = backup_file.stat().st_size
            
            # Create backup metadata
            metadata = {
                'backup_name': backup_name,
                'backup_file': str(backup_file),
                'backup_size': backup_size,
                'backup_size_mb': round(backup_size / 1024 / 1024, 2),
                'created_at': datetime.now().isoformat(),
                'database': self.config.database,
                'host': self.config.host,
                'backup_type': 'full',
                'compression': 'gzip'
            }
            
            # Save metadata
            metadata_file = self.backup_dir / f"{backup_name}.metadata.json"
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Backup completed: {backup_file} ({metadata['backup_size_mb']} MB)")
            
            return metadata
            
        except subprocess.CalledProcessError as e:
            error_msg = f"pg_dump failed: {e.stderr.decode() if e.stderr else str(e)}"
            logger.error(error_msg)
            
            # Clean up failed backup file
            if backup_file.exists():
                backup_file.unlink()
            
            raise Exception(error_msg)
        
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            raise
    
    async def create_schema_only_backup(self) -> Dict[str, Any]:
        """Create a schema-only backup for structure comparison"""
        backup_name = f"schema_only_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        backup_file = self.backup_dir / f"{backup_name}.sql"
        
        try:
            pg_dump_cmd = [
                'pg_dump',
                '--host', self.config.host,
                '--port', str(self.config.port),
                '--username', self.config.username,
                '--dbname', self.config.database,
                '--schema-only',
                '--clean',
                '--if-exists',
                '--create'
            ]
            
            env = os.environ.copy()
            env['PGPASSWORD'] = self.config.password
            
            with open(backup_file, 'w') as f:
                subprocess.run(
                    pg_dump_cmd,
                    stdout=f,
                    env=env,
                    check=True
                )
            
            return {
                'backup_name': backup_name,
                'backup_file': str(backup_file),
                'backup_type': 'schema_only',
                'created_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Schema backup failed: {e}")
            raise
    
    async def restore_backup(self, backup_name: str, target_db: Optional[str] = None) -> Dict[str, Any]:
        """Restore a database backup"""
        backup_file = self.backup_dir / f"{backup_name}.sql.gz"
        metadata_file = self.backup_dir / f"{backup_name}.metadata.json"
        
        if not backup_file.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_file}")
        
        target_database = target_db or self.config.database
        
        try:
            logger.info(f"Starting restore: {backup_name} to {target_database}")
            
            # Load metadata
            metadata = {}
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
            
            # Build psql command for restore
            psql_cmd = [
                'psql',
                '--host', self.config.host,
                '--port', str(self.config.port),
                '--username', self.config.username,
                '--dbname', target_database,
                '--quiet'
            ]
            
            env = os.environ.copy()
            env['PGPASSWORD'] = self.config.password
            
            # Restore from compressed backup
            with gzip.open(backup_file, 'rt') as f:
                process = subprocess.run(
                    psql_cmd,
                    stdin=f,
                    stderr=subprocess.PIPE,
                    env=env,
                    text=True
                )
            
            if process.returncode != 0:
                error_msg = f"psql restore failed: {process.stderr}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            restore_result = {
                'backup_name': backup_name,
                'target_database': target_database,
                'restored_at': datetime.now().isoformat(),
                'original_backup_date': metadata.get('created_at'),
                'success': True
            }
            
            logger.info(f"Restore completed: {backup_name}")
            return restore_result
            
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            raise
    
    async def list_backups(self) -> List[Dict[str, Any]]:
        """List all available backups"""
        backups = []
        
        for metadata_file in self.backup_dir.glob("*.metadata.json"):
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                # Check if backup file still exists
                backup_file = Path(metadata['backup_file'])
                if backup_file.exists():
                    metadata['exists'] = True
                    metadata['age_days'] = (datetime.now() - datetime.fromisoformat(metadata['created_at'])).days
                    backups.append(metadata)
                else:
                    metadata['exists'] = False
                    backups.append(metadata)
                    
            except Exception as e:
                logger.warning(f"Error reading backup metadata {metadata_file}: {e}")
        
        # Sort by creation date, newest first
        backups.sort(key=lambda x: x['created_at'], reverse=True)
        return backups
    
    async def cleanup_old_backups(self) -> Dict[str, Any]:
        """Remove old backups based on retention policy"""
        removed_backups = []
        total_size_freed = 0
        
        try:
            backups = await self.list_backups()
            
            # Remove backups older than retention period
            cutoff_date = datetime.now() - timedelta(days=self.retention_days)
            
            for backup in backups:
                backup_date = datetime.fromisoformat(backup['created_at'])
                
                # Remove if too old or if we have too many backups
                should_remove = (
                    backup_date < cutoff_date or 
                    len(backups) > self.max_backups
                )
                
                if should_remove and backup['exists']:
                    try:
                        backup_file = Path(backup['backup_file'])
                        metadata_file = self.backup_dir / f"{backup['backup_name']}.metadata.json"
                        
                        # Get file size before deletion
                        file_size = backup_file.stat().st_size if backup_file.exists() else 0
                        
                        # Remove files
                        if backup_file.exists():
                            backup_file.unlink()
                        if metadata_file.exists():
                            metadata_file.unlink()
                        
                        removed_backups.append({
                            'backup_name': backup['backup_name'],
                            'created_at': backup['created_at'],
                            'size_mb': round(file_size / 1024 / 1024, 2)
                        })
                        
                        total_size_freed += file_size
                        logger.info(f"Removed old backup: {backup['backup_name']}")
                        
                    except Exception as e:
                        logger.error(f"Error removing backup {backup['backup_name']}: {e}")
            
            return {
                'removed_backups': removed_backups,
                'total_removed': len(removed_backups),
                'total_size_freed_mb': round(total_size_freed / 1024 / 1024, 2),
                'cleanup_date': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Backup cleanup failed: {e}")
            return {'error': str(e)}
    
    async def verify_backup(self, backup_name: str) -> Dict[str, Any]:
        """Verify backup integrity by attempting to restore to a test database"""
        test_db_name = f"test_restore_{int(datetime.now().timestamp())}"
        
        try:
            # Create test database
            await self._create_test_database(test_db_name)
            
            # Attempt restore
            restore_result = await self.restore_backup(backup_name, test_db_name)
            
            # Verify basic table structure
            verification_results = await self._verify_restored_database(test_db_name)
            
            return {
                'backup_name': backup_name,
                'verification_status': 'passed',
                'restore_successful': True,
                'table_count': verification_results.get('table_count', 0),
                'verified_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Backup verification failed for {backup_name}: {e}")
            return {
                'backup_name': backup_name,
                'verification_status': 'failed',
                'error': str(e),
                'verified_at': datetime.now().isoformat()
            }
        
        finally:
            # Clean up test database
            try:
                await self._drop_test_database(test_db_name)
            except Exception as e:
                logger.warning(f"Failed to clean up test database {test_db_name}: {e}")
    
    async def _create_test_database(self, db_name: str):
        """Create a temporary database for testing"""
        admin_conn = await asyncpg.connect(
            host=self.config.host,
            port=self.config.port,
            database='postgres',
            user=self.config.username,
            password=self.config.password
        )
        
        try:
            await admin_conn.execute(f'CREATE DATABASE "{db_name}"')
        finally:
            await admin_conn.close()
    
    async def _drop_test_database(self, db_name: str):
        """Drop the temporary test database"""
        admin_conn = await asyncpg.connect(
            host=self.config.host,
            port=self.config.port,
            database='postgres',
            user=self.config.username,
            password=self.config.password
        )
        
        try:
            await admin_conn.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
        finally:
            await admin_conn.close()
    
    async def _verify_restored_database(self, db_name: str) -> Dict[str, Any]:
        """Verify the structure of a restored database"""
        test_conn = await asyncpg.connect(
            host=self.config.host,
            port=self.config.port,
            database=db_name,
            user=self.config.username,
            password=self.config.password
        )
        
        try:
            # Count tables
            table_count = await test_conn.fetchval(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"
            )
            
            # Check for critical tables
            critical_tables = ['users', 'work_orders', 'assets', 'pm_tasks']
            existing_tables = []
            
            for table in critical_tables:
                exists = await test_conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
                    table
                )
                if exists:
                    existing_tables.append(table)
            
            return {
                'table_count': table_count,
                'critical_tables_present': len(existing_tables),
                'critical_tables_total': len(critical_tables),
                'existing_critical_tables': existing_tables
            }
            
        finally:
            await test_conn.close()

class BackupScheduler:
    """Handles automated backup scheduling"""
    
    def __init__(self, backup_manager: BackupManager):
        self.backup_manager = backup_manager
        self.daily_backup_hour = int(os.getenv('DAILY_BACKUP_HOUR', '2'))  # 2 AM
    
    async def run_daily_backup(self):
        """Run daily backup routine"""
        try:
            logger.info("Starting daily backup routine...")
            
            # Create full backup
            backup_result = await self.backup_manager.create_full_backup()
            
            # Clean up old backups
            cleanup_result = await self.backup_manager.cleanup_old_backups()
            
            # Create schema-only backup (for quick structure comparison)
            schema_backup = await self.backup_manager.create_schema_only_backup()
            
            logger.info(f"Daily backup completed: {backup_result['backup_name']}")
            logger.info(f"Cleaned up {cleanup_result.get('total_removed', 0)} old backups")
            
            return {
                'backup_result': backup_result,
                'cleanup_result': cleanup_result,
                'schema_backup': schema_backup,
                'success': True
            }
            
        except Exception as e:
            logger.error(f"Daily backup routine failed: {e}")
            return {'success': False, 'error': str(e)}

# Initialize backup manager
backup_manager = BackupManager()
backup_scheduler = BackupScheduler(backup_manager)

# Utility functions
async def create_backup(backup_name: Optional[str] = None) -> Dict[str, Any]:
    """Create a database backup"""
    return await backup_manager.create_full_backup(backup_name)

async def list_available_backups() -> List[Dict[str, Any]]:
    """List all available backups"""
    return await backup_manager.list_backups()

async def restore_from_backup(backup_name: str, target_db: Optional[str] = None) -> Dict[str, Any]:
    """Restore from a specific backup"""
    return await backup_manager.restore_backup(backup_name, target_db)

if __name__ == "__main__":
    # CLI interface for backup operations
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python backup.py [create|list|cleanup|verify] [backup_name]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    async def run_command():
        if command == "create":
            backup_name = sys.argv[2] if len(sys.argv) > 2 else None
            result = await backup_manager.create_full_backup(backup_name)
            print(f"Backup created: {result['backup_name']}")
            
        elif command == "list":
            backups = await backup_manager.list_backups()
            print(f"Found {len(backups)} backups:")
            for backup in backups:
                print(f"  {backup['backup_name']} - {backup['created_at']} ({backup['backup_size_mb']} MB)")
                
        elif command == "cleanup":
            result = await backup_manager.cleanup_old_backups()
            print(f"Removed {result['total_removed']} old backups, freed {result['total_size_freed_mb']} MB")
            
        elif command == "verify":
            if len(sys.argv) < 3:
                print("Usage: python backup.py verify <backup_name>")
                sys.exit(1)
            backup_name = sys.argv[2]
            result = await backup_manager.verify_backup(backup_name)
            print(f"Verification result: {result['verification_status']}")
            
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
    
    asyncio.run(run_command())