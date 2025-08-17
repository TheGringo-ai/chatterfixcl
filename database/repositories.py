"""
Database repositories for ChatterFix CMMS
Data access layer for all database operations
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncpg
import uuid
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class BaseRepository(ABC):
    """Base repository class with common database operations"""
    
    def __init__(self, db_manager):
        self.db_manager = db_manager
    
    async def _execute(self, query: str, *args) -> str:
        """Execute a query without returning results"""
        return await self.db_manager.execute(query, *args)
    
    async def _fetch(self, query: str, *args) -> List[asyncpg.Record]:
        """Fetch multiple rows"""
        return await self.db_manager.fetch(query, *args)
    
    async def _fetchrow(self, query: str, *args) -> Optional[asyncpg.Record]:
        """Fetch a single row"""
        return await self.db_manager.fetchrow(query, *args)
    
    async def _fetchval(self, query: str, *args):
        """Fetch a single value"""
        return await self.db_manager.fetchval(query, *args)

class WorkOrderRepository(BaseRepository):
    """Repository for work order operations"""
    
    async def create(self, work_order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new work order"""
        query = """
        INSERT INTO work_orders (
            id, wo_number, title, description, priority, status, work_type,
            asset_id, assigned_to, created_by, estimated_hours, instructions, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
        """
        
        wo_id = str(uuid.uuid4())
        wo_number = work_order_data.get('wo_number') or f"WO-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        row = await self._fetchrow(
            query,
            wo_id,
            wo_number,
            work_order_data['title'],
            work_order_data.get('description'),
            work_order_data.get('priority', 'MEDIUM'),
            work_order_data.get('status', 'OPEN'),
            work_order_data.get('work_type', 'CORRECTIVE'),
            work_order_data.get('asset_id'),
            work_order_data.get('assigned_to'),
            work_order_data.get('created_by'),
            work_order_data.get('estimated_hours'),
            work_order_data.get('instructions'),
            work_order_data.get('tags', [])
        )
        
        return dict(row) if row else None
    
    async def get_by_id(self, work_order_id: str) -> Optional[Dict[str, Any]]:
        """Get work order by ID"""
        query = """
        SELECT wo.*, a.name as asset_name, u.name as assigned_to_name
        FROM work_orders wo
        LEFT JOIN assets a ON wo.asset_id = a.id
        LEFT JOIN users u ON wo.assigned_to = u.id
        WHERE wo.id = $1
        """
        
        row = await self._fetchrow(query, work_order_id)
        return dict(row) if row else None
    
    async def get_all(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get all work orders with pagination"""
        query = """
        SELECT wo.*, a.name as asset_name, u.name as assigned_to_name
        FROM work_orders wo
        LEFT JOIN assets a ON wo.asset_id = a.id
        LEFT JOIN users u ON wo.assigned_to = u.id
        ORDER BY wo.created_at DESC
        LIMIT $1 OFFSET $2
        """
        
        rows = await self._fetch(query, limit, offset)
        return [dict(row) for row in rows]
    
    async def update(self, work_order_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update work order"""
        # Build dynamic update query
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in update_data.items():
            if key not in ['id', 'created_at']:  # Skip immutable fields
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
                param_count += 1
        
        if not set_clauses:
            return None
        
        query = f"""
        UPDATE work_orders 
        SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${param_count}
        RETURNING *
        """
        values.append(work_order_id)
        
        row = await self._fetchrow(query, *values)
        return dict(row) if row else None
    
    async def delete(self, work_order_id: str) -> bool:
        """Delete work order"""
        query = "DELETE FROM work_orders WHERE id = $1"
        result = await self._execute(query, work_order_id)
        return result == "DELETE 1"

class CostEntryRepository(BaseRepository):
    """Repository for cost entry operations"""
    
    async def create(self, cost_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new cost entry"""
        query = """
        INSERT INTO cost_entries (id, work_order_id, type, amount, description, meta, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        """
        
        cost_id = str(uuid.uuid4())
        row = await self._fetchrow(
            query,
            cost_id,
            cost_data['work_order_id'],
            cost_data['type'],
            cost_data['amount'],
            cost_data.get('description'),
            cost_data.get('meta', {}),
            cost_data.get('created_by')
        )
        
        return dict(row) if row else None
    
    async def get_by_work_order(self, work_order_id: str) -> List[Dict[str, Any]]:
        """Get all cost entries for a work order"""
        query = """
        SELECT * FROM cost_entries 
        WHERE work_order_id = $1 
        ORDER BY created_at DESC
        """
        
        rows = await self._fetch(query, work_order_id)
        return [dict(row) for row in rows]
    
    async def get_financials_summary(self, work_order_id: str) -> Dict[str, Any]:
        """Get financial summary for a work order"""
        query = """
        SELECT 
            SUM(amount) as total,
            jsonb_object_agg(type, type_total) as by_type
        FROM (
            SELECT type, SUM(amount) as type_total
            FROM cost_entries 
            WHERE work_order_id = $1
            GROUP BY type
        ) type_totals
        """
        
        row = await self._fetchrow(query, work_order_id)
        if row and row['total']:
            return {
                'total': float(row['total']),
                'by_type': dict(row['by_type'])
            }
        return {'total': 0.0, 'by_type': {}}

class PMTaskRepository(BaseRepository):
    """Repository for preventive maintenance tasks"""
    
    async def create(self, pm_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new PM task"""
        query = """
        INSERT INTO pm_tasks (
            id, name, description, asset_id, trigger_type, frequency, 
            interval_value, meter_type, meter_threshold, estimated_duration,
            instructions, required_parts, required_skills, priority, category, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
        """
        
        pm_id = str(uuid.uuid4())
        row = await self._fetchrow(
            query,
            pm_id,
            pm_data['name'],
            pm_data.get('description'),
            pm_data['asset_id'],
            pm_data['trigger_type'],
            pm_data['frequency'],
            pm_data.get('interval_value', 1),
            pm_data.get('meter_type'),
            pm_data.get('meter_threshold'),
            pm_data.get('estimated_duration', 60),
            pm_data.get('instructions'),
            pm_data.get('required_parts', []),
            pm_data.get('required_skills', []),
            pm_data.get('priority', 'MEDIUM'),
            pm_data.get('category'),
            pm_data.get('created_by')
        )
        
        return dict(row) if row else None
    
    async def get_all(self) -> List[Dict[str, Any]]:
        """Get all PM tasks"""
        query = """
        SELECT pt.*, a.name as asset_name
        FROM pm_tasks pt
        LEFT JOIN assets a ON pt.asset_id = a.id
        WHERE pt.status = 'ACTIVE'
        ORDER BY pt.name
        """
        
        rows = await self._fetch(query)
        return [dict(row) for row in rows]
    
    async def get_by_id(self, pm_task_id: str) -> Optional[Dict[str, Any]]:
        """Get PM task by ID"""
        query = """
        SELECT pt.*, a.name as asset_name
        FROM pm_tasks pt
        LEFT JOIN assets a ON pt.asset_id = a.id
        WHERE pt.id = $1
        """
        
        row = await self._fetchrow(query, pm_task_id)
        return dict(row) if row else None

class PMScheduleRepository(BaseRepository):
    """Repository for PM schedule operations"""
    
    async def get_schedule(self, start_date: str = None, end_date: str = None) -> List[Dict[str, Any]]:
        """Get PM schedule entries"""
        if start_date and end_date:
            query = """
            SELECT ps.*, pt.name as pm_task_name, a.name as asset_name
            FROM pm_schedule ps
            JOIN pm_tasks pt ON ps.pm_task_id = pt.id
            JOIN assets a ON pt.asset_id = a.id
            WHERE ps.scheduled_date >= $1 AND ps.scheduled_date <= $2
            ORDER BY ps.scheduled_date
            """
            rows = await self._fetch(query, start_date, end_date)
        else:
            query = """
            SELECT ps.*, pt.name as pm_task_name, a.name as asset_name
            FROM pm_schedule ps
            JOIN pm_tasks pt ON ps.pm_task_id = pt.id
            JOIN assets a ON pt.asset_id = a.id
            ORDER BY ps.scheduled_date
            LIMIT 100
            """
            rows = await self._fetch(query)
        
        return [dict(row) for row in rows]
    
    async def complete_scheduled_task(self, schedule_id: str) -> Optional[Dict[str, Any]]:
        """Mark a scheduled PM task as completed"""
        query = """
        UPDATE pm_schedule 
        SET status = 'COMPLETED', 
            completion_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        """
        
        row = await self._fetchrow(query, schedule_id)
        return dict(row) if row else None

class AssetRepository(BaseRepository):
    """Repository for asset operations"""
    
    async def get_all(self) -> List[Dict[str, Any]]:
        """Get all assets"""
        query = """
        SELECT * FROM assets 
        WHERE status != 'DELETED'
        ORDER BY name
        """
        
        rows = await self._fetch(query)
        return [dict(row) for row in rows]
    
    async def get_by_id(self, asset_id: str) -> Optional[Dict[str, Any]]:
        """Get asset by ID"""
        query = "SELECT * FROM assets WHERE id = $1"
        row = await self._fetchrow(query, asset_id)
        return dict(row) if row else None

class UserRepository(BaseRepository):
    """Repository for user operations"""
    
    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        query = "SELECT * FROM users WHERE email = $1 AND active = true"
        row = await self._fetchrow(query, email)
        return dict(row) if row else None
    
    async def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        query = "SELECT * FROM users WHERE id = $1 AND active = true"
        row = await self._fetchrow(query, user_id)
        return dict(row) if row else None

class AnalyticsRepository(BaseRepository):
    """Repository for analytics and reporting"""
    
    async def get_pm_analytics(self) -> Dict[str, Any]:
        """Get PM analytics"""
        queries = {
            'total_tasks': "SELECT COUNT(*) FROM pm_tasks WHERE status = 'ACTIVE'",
            'active_tasks': "SELECT COUNT(*) FROM pm_tasks WHERE status = 'ACTIVE'",
            'due_tasks': """
                SELECT COUNT(*) FROM pm_schedule 
                WHERE status IN ('DUE', 'SCHEDULED') 
                AND due_date <= CURRENT_TIMESTAMP + INTERVAL '7 days'
            """,
            'overdue_tasks': """
                SELECT COUNT(*) FROM pm_schedule 
                WHERE status IN ('DUE', 'SCHEDULED') 
                AND due_date < CURRENT_TIMESTAMP
            """,
            'completed_tasks': """
                SELECT COUNT(*) FROM pm_schedule 
                WHERE status = 'COMPLETED' 
                AND completion_date >= CURRENT_TIMESTAMP - INTERVAL '30 days'
            """
        }
        
        results = {}
        for key, query in queries.items():
            results[key] = await self._fetchval(query) or 0
        
        # Calculate completion rate
        total_scheduled = await self._fetchval("""
            SELECT COUNT(*) FROM pm_schedule 
            WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        """) or 0
        
        if total_scheduled > 0:
            results['completion_rate'] = round((results['completed_tasks'] / total_scheduled) * 100, 1)
        else:
            results['completion_rate'] = 0
        
        results['timestamp'] = datetime.now().isoformat()
        
        return results