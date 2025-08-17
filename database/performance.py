"""
Database performance monitoring and optimization for ChatterFix CMMS
Handles query optimization, index management, and performance analytics
"""

import asyncio
import asyncpg
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging
import json

from .config import db_manager

logger = logging.getLogger(__name__)

class DatabasePerformanceMonitor:
    """Monitor and optimize database performance"""
    
    def __init__(self):
        self.slow_query_threshold = 1000  # 1 second in milliseconds
        
    async def analyze_query_performance(self) -> Dict[str, Any]:
        """Analyze query performance and identify slow queries"""
        try:
            # Enable query statistics if not already enabled
            await self._ensure_query_stats_enabled()
            
            # Get slow queries
            slow_queries = await self._get_slow_queries()
            
            # Get index usage statistics
            index_stats = await self._get_index_usage_stats()
            
            # Get table statistics
            table_stats = await self._get_table_stats()
            
            # Get database size information
            db_size = await self._get_database_size_info()
            
            return {
                'timestamp': datetime.now().isoformat(),
                'slow_queries': slow_queries,
                'index_usage': index_stats,
                'table_statistics': table_stats,
                'database_size': db_size,
                'performance_recommendations': await self._generate_recommendations(
                    slow_queries, index_stats, table_stats
                )
            }
            
        except Exception as e:
            logger.error(f"Error analyzing query performance: {e}")
            return {'error': str(e)}
    
    async def _ensure_query_stats_enabled(self):
        """Ensure pg_stat_statements extension is enabled"""
        try:
            # Check if pg_stat_statements is available
            exists = await db_manager.fetchval(
                "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements')"
            )
            
            if not exists:
                logger.warning("pg_stat_statements extension not available - some performance metrics will be limited")
                return False
                
            return True
            
        except Exception as e:
            logger.warning(f"Could not check pg_stat_statements: {e}")
            return False
    
    async def _get_slow_queries(self) -> List[Dict[str, Any]]:
        """Get slow-running queries from pg_stat_statements"""
        try:
            query = """
            SELECT 
                query,
                calls,
                total_exec_time,
                mean_exec_time,
                max_exec_time,
                rows,
                100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
            FROM pg_stat_statements 
            WHERE mean_exec_time > $1
            ORDER BY mean_exec_time DESC 
            LIMIT 20
            """
            
            rows = await db_manager.fetch(query, self.slow_query_threshold)
            return [dict(row) for row in rows]
            
        except Exception as e:
            logger.warning(f"Could not fetch slow queries: {e}")
            return []
    
    async def _get_index_usage_stats(self) -> List[Dict[str, Any]]:
        """Get index usage statistics"""
        try:
            query = """
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_tup_read,
                idx_tup_fetch,
                idx_scan,
                CASE 
                    WHEN idx_scan = 0 THEN 'Unused'
                    WHEN idx_scan < 10 THEN 'Low Usage'
                    WHEN idx_scan < 100 THEN 'Medium Usage'
                    ELSE 'High Usage'
                END as usage_category
            FROM pg_stat_user_indexes
            ORDER BY idx_scan DESC
            """
            
            rows = await db_manager.fetch(query)
            return [dict(row) for row in rows]
            
        except Exception as e:
            logger.error(f"Error getting index usage stats: {e}")
            return []
    
    async def _get_table_stats(self) -> List[Dict[str, Any]]:
        """Get table statistics including size and access patterns"""
        try:
            query = """
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as live_tuples,
                n_dead_tup as dead_tuples,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
            FROM pg_stat_user_tables
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            """
            
            rows = await db_manager.fetch(query)
            return [dict(row) for row in rows]
            
        except Exception as e:
            logger.error(f"Error getting table stats: {e}")
            return []
    
    async def _get_database_size_info(self) -> Dict[str, Any]:
        """Get database size and space usage information"""
        try:
            # Total database size
            db_size = await db_manager.fetchval(
                "SELECT pg_size_pretty(pg_database_size(current_database()))"
            )
            
            # Table sizes
            table_sizes_query = """
            SELECT 
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 10
            """
            
            table_sizes = await db_manager.fetch(table_sizes_query)
            
            return {
                'total_database_size': db_size,
                'largest_tables': [dict(row) for row in table_sizes]
            }
            
        except Exception as e:
            logger.error(f"Error getting database size info: {e}")
            return {}
    
    async def _generate_recommendations(
        self, 
        slow_queries: List[Dict], 
        index_stats: List[Dict], 
        table_stats: List[Dict]
    ) -> List[str]:
        """Generate performance optimization recommendations"""
        recommendations = []
        
        # Check for slow queries
        if slow_queries:
            recommendations.append(f"Found {len(slow_queries)} slow queries - consider query optimization")
        
        # Check for unused indexes
        unused_indexes = [idx for idx in index_stats if idx.get('usage_category') == 'Unused']
        if unused_indexes:
            recommendations.append(f"Found {len(unused_indexes)} unused indexes - consider dropping them")
        
        # Check for tables with high dead tuple ratio
        for table in table_stats:
            if table.get('dead_tuples', 0) > table.get('live_tuples', 0) * 0.1:
                recommendations.append(f"Table {table['tablename']} has high dead tuple ratio - consider VACUUM")
        
        # Check for tables that haven't been analyzed recently
        week_ago = datetime.now() - timedelta(days=7)
        for table in table_stats:
            last_analyze = table.get('last_analyze') or table.get('last_autoanalyze')
            if not last_analyze or last_analyze < week_ago:
                recommendations.append(f"Table {table['tablename']} needs ANALYZE for query planning")
        
        return recommendations
    
    async def create_missing_indexes(self) -> List[str]:
        """Create recommended indexes based on query patterns"""
        created_indexes = []
        
        try:
            # Analyze common query patterns and suggest indexes
            recommendations = await self._analyze_missing_indexes()
            
            for rec in recommendations:
                try:
                    await db_manager.execute(rec['create_sql'])
                    created_indexes.append(rec['index_name'])
                    logger.info(f"Created index: {rec['index_name']}")
                except Exception as e:
                    logger.error(f"Failed to create index {rec['index_name']}: {e}")
            
        except Exception as e:
            logger.error(f"Error creating missing indexes: {e}")
        
        return created_indexes
    
    async def _analyze_missing_indexes(self) -> List[Dict[str, str]]:
        """Analyze potentially missing indexes"""
        recommendations = []
        
        # Common index patterns for CMMS systems
        index_recommendations = [
            {
                'table': 'work_orders',
                'columns': '(status, priority)',
                'name': 'idx_work_orders_status_priority',
                'reason': 'Common filtering by status and priority'
            },
            {
                'table': 'work_orders',
                'columns': '(assigned_to, status)',
                'name': 'idx_work_orders_assigned_status',
                'reason': 'Technician dashboard queries'
            },
            {
                'table': 'pm_schedule',
                'columns': '(status, due_date)',
                'name': 'idx_pm_schedule_status_due',
                'reason': 'PM compliance and overdue queries'
            },
            {
                'table': 'cost_entries',
                'columns': '(work_order_id, type)',
                'name': 'idx_cost_entries_wo_type',
                'reason': 'Financial reporting by work order and cost type'
            },
            {
                'table': 'audit_log',
                'columns': '(table_name, changed_at)',
                'name': 'idx_audit_log_table_date',
                'reason': 'Audit trail queries by table and date'
            }
        ]
        
        for rec in index_recommendations:
            # Check if index already exists
            exists = await db_manager.fetchval(
                "SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = $1)",
                rec['name']
            )
            
            if not exists:
                recommendations.append({
                    'index_name': rec['name'],
                    'create_sql': f"CREATE INDEX CONCURRENTLY {rec['name']} ON {rec['table']} {rec['columns']}",
                    'reason': rec['reason']
                })
        
        return recommendations
    
    async def vacuum_analyze_all_tables(self) -> Dict[str, Any]:
        """Run VACUUM ANALYZE on all tables"""
        results = {'vacuumed_tables': [], 'errors': []}
        
        try:
            # Get all user tables
            tables = await db_manager.fetch(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            )
            
            for table_row in tables:
                table_name = table_row['tablename']
                try:
                    # Use VACUUM ANALYZE which combines both operations
                    await db_manager.execute(f'VACUUM ANALYZE "{table_name}"')
                    results['vacuumed_tables'].append(table_name)
                    logger.info(f"VACUUM ANALYZE completed for table: {table_name}")
                    
                except Exception as e:
                    error_msg = f"VACUUM ANALYZE failed for {table_name}: {e}"
                    results['errors'].append(error_msg)
                    logger.error(error_msg)
            
        except Exception as e:
            logger.error(f"Error during VACUUM ANALYZE operation: {e}")
            results['errors'].append(str(e))
        
        return results

class QueryOptimizer:
    """Optimize specific queries for better performance"""
    
    @staticmethod
    async def optimize_work_order_queries():
        """Optimize common work order queries"""
        optimizations = []
        
        # Create materialized view for work order summary if it doesn't exist
        try:
            view_exists = await db_manager.fetchval(
                """
                SELECT EXISTS(
                    SELECT 1 FROM pg_matviews 
                    WHERE matviewname = 'work_order_summary_mv'
                )
                """
            )
            
            if not view_exists:
                create_mv_sql = """
                CREATE MATERIALIZED VIEW work_order_summary_mv AS
                SELECT 
                    wo.id,
                    wo.wo_number,
                    wo.title,
                    wo.status,
                    wo.priority,
                    wo.created_at,
                    wo.completed_date,
                    a.name as asset_name,
                    a.location as asset_location,
                    u.name as assigned_to_name,
                    COALESCE(ce_summary.total_cost, 0) as total_cost
                FROM work_orders wo
                LEFT JOIN assets a ON wo.asset_id = a.id
                LEFT JOIN users u ON wo.assigned_to = u.id
                LEFT JOIN (
                    SELECT work_order_id, SUM(amount) as total_cost
                    FROM cost_entries
                    GROUP BY work_order_id
                ) ce_summary ON wo.id = ce_summary.work_order_id;
                
                CREATE UNIQUE INDEX ON work_order_summary_mv (id);
                CREATE INDEX ON work_order_summary_mv (status);
                CREATE INDEX ON work_order_summary_mv (assigned_to_name);
                """
                
                await db_manager.execute(create_mv_sql)
                optimizations.append("Created work_order_summary materialized view")
        
        except Exception as e:
            logger.error(f"Error creating work order summary view: {e}")
        
        return optimizations
    
    @staticmethod
    async def refresh_materialized_views():
        """Refresh all materialized views"""
        try:
            # Get all materialized views
            views = await db_manager.fetch(
                "SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'"
            )
            
            refreshed = []
            for view_row in views:
                view_name = view_row['matviewname']
                try:
                    await db_manager.execute(f'REFRESH MATERIALIZED VIEW CONCURRENTLY "{view_name}"')
                    refreshed.append(view_name)
                except Exception as e:
                    logger.error(f"Error refreshing materialized view {view_name}: {e}")
            
            return refreshed
            
        except Exception as e:
            logger.error(f"Error refreshing materialized views: {e}")
            return []

# Performance monitoring instance
performance_monitor = DatabasePerformanceMonitor()
query_optimizer = QueryOptimizer()

# Utility functions for FastAPI endpoints
async def get_performance_report() -> Dict[str, Any]:
    """Get comprehensive performance report"""
    return await performance_monitor.analyze_query_performance()

async def optimize_database() -> Dict[str, Any]:
    """Run database optimization tasks"""
    results = {
        'timestamp': datetime.now().isoformat(),
        'vacuum_results': await performance_monitor.vacuum_analyze_all_tables(),
        'created_indexes': await performance_monitor.create_missing_indexes(),
        'query_optimizations': await query_optimizer.optimize_work_order_queries(),
        'refreshed_views': await query_optimizer.refresh_materialized_views()
    }
    
    return results

# Scheduled maintenance function
async def run_maintenance_tasks():
    """Run regular database maintenance tasks"""
    logger.info("Starting scheduled database maintenance...")
    
    try:
        # Run VACUUM ANALYZE on all tables
        vacuum_results = await performance_monitor.vacuum_analyze_all_tables()
        logger.info(f"VACUUM completed for {len(vacuum_results['vacuumed_tables'])} tables")
        
        # Refresh materialized views
        refreshed_views = await query_optimizer.refresh_materialized_views()
        logger.info(f"Refreshed {len(refreshed_views)} materialized views")
        
        # Generate performance report
        perf_report = await performance_monitor.analyze_query_performance()
        
        # Log any recommendations
        if perf_report.get('performance_recommendations'):
            logger.info("Performance recommendations:")
            for rec in perf_report['performance_recommendations']:
                logger.info(f"  - {rec}")
        
        logger.info("Database maintenance completed successfully")
        
    except Exception as e:
        logger.error(f"Database maintenance failed: {e}")

if __name__ == "__main__":
    # CLI interface for running maintenance
    asyncio.run(run_maintenance_tasks())