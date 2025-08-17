"""
Data synchronization endpoints for ChatterFix CMMS PWA
Handles offline/online sync between IndexedDB and PostgreSQL
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime
import uuid
import logging
from contextlib import asynccontextmanager

from database.config import db_manager
from database.repositories import (
    WorkOrderRepository, CostEntryRepository, PMTaskRepository, 
    PMScheduleRepository, AssetRepository, UserRepository
)

logger = logging.getLogger(__name__)

# Create sync router
sync_router = APIRouter(prefix="/api/sync", tags=["synchronization"])

# Initialize repositories
work_order_repo = WorkOrderRepository(db_manager)
cost_entry_repo = CostEntryRepository(db_manager)
pm_task_repo = PMTaskRepository(db_manager)
pm_schedule_repo = PMScheduleRepository(db_manager)
asset_repo = AssetRepository(db_manager)
user_repo = UserRepository(db_manager)

# =============================================================================
# SYNC DATA MODELS
# =============================================================================

class SyncOperation(BaseModel):
    """Represents a single sync operation"""
    id: str
    operation: Literal["CREATE", "UPDATE", "DELETE"]
    table_name: str
    record_id: str
    data: Optional[Dict[str, Any]] = None
    client_timestamp: datetime
    retry_count: int = 0

class SyncRequest(BaseModel):
    """Batch sync request from client"""
    client_id: str
    operations: List[SyncOperation]
    last_sync_timestamp: Optional[datetime] = None

class SyncResponse(BaseModel):
    """Sync response to client"""
    success: bool
    processed_operations: List[str]  # IDs of successfully processed operations
    failed_operations: List[Dict[str, Any]]  # Failed operations with error details
    server_changes: List[Dict[str, Any]]  # Changes from server since last sync
    sync_timestamp: datetime

class ConflictResolution(BaseModel):
    """Conflict resolution strategy"""
    strategy: Literal["server_wins", "client_wins", "merge", "manual"]
    field_mappings: Optional[Dict[str, str]] = None

# =============================================================================
# SYNC UTILITIES
# =============================================================================

class SyncManager:
    """Manages data synchronization between client and server"""
    
    def __init__(self):
        self.repositories = {
            'work_orders': work_order_repo,
            'pm_tasks': pm_task_repo,
            'pm_schedule': pm_schedule_repo,
            'cost_entries': cost_entry_repo,
            'assets': asset_repo
        }
    
    async def process_client_operations(self, operations: List[SyncOperation]) -> Dict[str, Any]:
        """Process operations from client"""
        processed = []
        failed = []
        
        for operation in operations:
            try:
                result = await self._process_single_operation(operation)
                if result:
                    processed.append(operation.id)
                else:
                    failed.append({
                        "operation_id": operation.id,
                        "error": "Operation failed - no result returned"
                    })
            except Exception as e:
                logger.error(f"Sync operation failed: {operation.id} - {e}")
                failed.append({
                    "operation_id": operation.id,
                    "error": str(e)
                })
        
        return {"processed": processed, "failed": failed}
    
    async def _process_single_operation(self, operation: SyncOperation) -> bool:
        """Process a single sync operation"""
        repo = self.repositories.get(operation.table_name)
        if not repo:
            raise ValueError(f"Unknown table: {operation.table_name}")
        
        if operation.operation == "CREATE":
            return await self._handle_create(repo, operation)
        elif operation.operation == "UPDATE":
            return await self._handle_update(repo, operation)
        elif operation.operation == "DELETE":
            return await self._handle_delete(repo, operation)
        else:
            raise ValueError(f"Unknown operation: {operation.operation}")
    
    async def _handle_create(self, repo, operation: SyncOperation) -> bool:
        """Handle create operation with conflict detection"""
        # Check if record already exists
        existing = None
        if hasattr(repo, 'get_by_id'):
            existing = await repo.get_by_id(operation.record_id)
        
        if existing:
            # Record exists - convert to update operation
            logger.info(f"Converting CREATE to UPDATE for {operation.record_id}")
            return await self._handle_update(repo, operation)
        
        # Create new record
        data = operation.data.copy()
        data['id'] = operation.record_id
        
        result = await repo.create(data)
        return result is not None
    
    async def _handle_update(self, repo, operation: SyncOperation) -> bool:
        """Handle update operation with conflict resolution"""
        # Get current server version
        if hasattr(repo, 'get_by_id'):
            current = await repo.get_by_id(operation.record_id)
            if not current:
                # Record doesn't exist - convert to create
                logger.info(f"Converting UPDATE to CREATE for {operation.record_id}")
                return await self._handle_create(repo, operation)
            
            # Check for conflicts
            conflict_detected = await self._detect_conflicts(current, operation)
            if conflict_detected:
                # Apply conflict resolution (for now, server wins)
                logger.warning(f"Conflict detected for {operation.record_id}, server wins")
                return False
        
        # Update record
        if hasattr(repo, 'update'):
            result = await repo.update(operation.record_id, operation.data)
            return result is not None
        
        return False
    
    async def _handle_delete(self, repo, operation: SyncOperation) -> bool:
        """Handle delete operation"""
        if hasattr(repo, 'delete'):
            return await repo.delete(operation.record_id)
        return False
    
    async def _detect_conflicts(self, server_record: Dict[str, Any], operation: SyncOperation) -> bool:
        """Detect conflicts between server and client versions"""
        # Simple conflict detection based on updated_at timestamp
        server_updated = server_record.get('updated_at')
        client_timestamp = operation.client_timestamp
        
        if server_updated and client_timestamp:
            # If server was updated after client timestamp, there's a conflict
            return server_updated > client_timestamp
        
        return False
    
    async def get_server_changes(self, client_id: str, last_sync: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Get changes from server since last sync"""
        changes = []
        
        if not last_sync:
            # First sync - return all recent data
            last_sync = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        try:
            # Get recent work orders
            query = """
            SELECT 'work_orders' as table_name, 'UPDATE' as operation, 
                   id as record_id, row_to_json(work_orders.*) as data
            FROM work_orders 
            WHERE updated_at > $1
            ORDER BY updated_at DESC
            LIMIT 100
            """
            
            rows = await db_manager.fetch(query, last_sync)
            for row in rows:
                changes.append(dict(row))
            
            # Get recent PM tasks
            query = """
            SELECT 'pm_tasks' as table_name, 'UPDATE' as operation,
                   id as record_id, row_to_json(pm_tasks.*) as data
            FROM pm_tasks 
            WHERE updated_at > $1
            ORDER BY updated_at DESC
            LIMIT 50
            """
            
            rows = await db_manager.fetch(query, last_sync)
            for row in rows:
                changes.append(dict(row))
            
            # Get recent PM schedule changes
            query = """
            SELECT 'pm_schedule' as table_name, 'UPDATE' as operation,
                   id as record_id, row_to_json(pm_schedule.*) as data
            FROM pm_schedule 
            WHERE updated_at > $1
            ORDER BY updated_at DESC
            LIMIT 100
            """
            
            rows = await db_manager.fetch(query, last_sync)
            for row in rows:
                changes.append(dict(row))
        
        except Exception as e:
            logger.error(f"Error getting server changes: {e}")
        
        return changes

# Initialize sync manager
sync_manager = SyncManager()

# =============================================================================
# SYNC ENDPOINTS
# =============================================================================

@sync_router.post("/batch", response_model=SyncResponse)
async def sync_batch_operations(request: SyncRequest):
    """Process batch sync operations from client"""
    try:
        logger.info(f"Processing sync batch: {len(request.operations)} operations from {request.client_id}")
        
        # Process client operations
        results = await sync_manager.process_client_operations(request.operations)
        
        # Get server changes since last sync
        server_changes = await sync_manager.get_server_changes(
            request.client_id, 
            request.last_sync_timestamp
        )
        
        # Record successful sync in sync_status table
        for op_id in results["processed"]:
            await db_manager.execute(
                """
                INSERT INTO sync_status (id, table_name, record_id, operation, client_id, synced, synced_at)
                VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET synced = true, synced_at = CURRENT_TIMESTAMP
                """,
                str(uuid.uuid4()), "batch", "batch", "SYNC", request.client_id
            )
        
        return SyncResponse(
            success=len(results["failed"]) == 0,
            processed_operations=results["processed"],
            failed_operations=results["failed"],
            server_changes=server_changes,
            sync_timestamp=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Batch sync error: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {e}")

@sync_router.get("/status/{client_id}")
async def get_sync_status(client_id: str):
    """Get sync status for a specific client"""
    try:
        query = """
        SELECT table_name, COUNT(*) as pending_count
        FROM sync_status 
        WHERE client_id = $1 AND synced = false
        GROUP BY table_name
        """
        
        rows = await db_manager.fetch(query, client_id)
        pending_by_table = {row['table_name']: row['pending_count'] for row in rows}
        
        # Get last sync timestamp
        last_sync_query = """
        SELECT MAX(synced_at) as last_sync
        FROM sync_status 
        WHERE client_id = $1 AND synced = true
        """
        
        last_sync_row = await db_manager.fetchrow(last_sync_query, client_id)
        last_sync = last_sync_row['last_sync'] if last_sync_row else None
        
        return {
            "client_id": client_id,
            "last_sync": last_sync.isoformat() if last_sync else None,
            "pending_operations": pending_by_table,
            "total_pending": sum(pending_by_table.values()),
            "status": "up_to_date" if not pending_by_table else "pending_sync"
        }
        
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@sync_router.post("/resolve-conflicts")
async def resolve_sync_conflicts(
    conflicts: List[Dict[str, Any]], 
    resolution: ConflictResolution
):
    """Resolve sync conflicts using specified strategy"""
    try:
        resolved_conflicts = []
        
        for conflict in conflicts:
            record_id = conflict.get('record_id')
            table_name = conflict.get('table_name')
            
            if resolution.strategy == "server_wins":
                # Keep server version, mark client operation as resolved
                await db_manager.execute(
                    """
                    UPDATE sync_status 
                    SET synced = true, synced_at = CURRENT_TIMESTAMP,
                        error_message = 'Resolved: server_wins'
                    WHERE record_id = $1 AND table_name = $2
                    """,
                    record_id, table_name
                )
                
            elif resolution.strategy == "client_wins":
                # Apply client changes, overwrite server
                # This would require re-processing the client operation
                pass
                
            elif resolution.strategy == "merge":
                # Merge changes based on field mappings
                # This is more complex and would require field-level merge logic
                pass
            
            resolved_conflicts.append({
                "record_id": record_id,
                "table_name": table_name,
                "resolution": resolution.strategy
            })
        
        return {
            "resolved_conflicts": resolved_conflicts,
            "resolution_strategy": resolution.strategy,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error resolving conflicts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@sync_router.get("/changes/{client_id}")
async def get_server_changes_since_last_sync(
    client_id: str, 
    since: Optional[str] = None
):
    """Get server changes since specified timestamp"""
    try:
        last_sync = None
        if since:
            last_sync = datetime.fromisoformat(since.replace('Z', '+00:00'))
        
        changes = await sync_manager.get_server_changes(client_id, last_sync)
        
        return {
            "client_id": client_id,
            "since": since,
            "changes_count": len(changes),
            "changes": changes,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting server changes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@sync_router.post("/ping")
async def sync_ping(client_info: Dict[str, Any]):
    """Ping endpoint for clients to check connectivity and register"""
    try:
        client_id = client_info.get('client_id', str(uuid.uuid4()))
        
        # Update client info in database
        await db_manager.execute(
            """
            INSERT INTO sync_status (id, table_name, record_id, operation, client_id, synced, created_at)
            VALUES ($1, 'ping', 'ping', 'PING', $2, true, CURRENT_TIMESTAMP)
            """,
            str(uuid.uuid4()), client_id
        )
        
        return {
            "pong": True,
            "client_id": client_id,
            "server_time": datetime.now().isoformat(),
            "sync_available": True
        }
        
    except Exception as e:
        logger.error(f"Sync ping error: {e}")
        return {
            "pong": False,
            "error": str(e),
            "server_time": datetime.now().isoformat()
        }