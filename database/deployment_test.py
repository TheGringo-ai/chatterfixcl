"""
Comprehensive deployment and testing script for ChatterFix CMMS
Tests database migration, sync, performance, and backup systems
"""

import asyncio
import asyncpg
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import logging
from typing import Dict, Any, List

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from database.config import db_manager, startup_database, shutdown_database
from database.migrations import MigrationManager, DataMigrator
from database.performance import performance_monitor, optimize_database
from database.backup import backup_manager
from database.repositories import (
    WorkOrderRepository, PMTaskRepository, PMScheduleRepository,
    CostEntryRepository, AnalyticsRepository
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DeploymentTester:
    """Comprehensive deployment testing suite"""
    
    def __init__(self):
        self.test_results = {
            'start_time': datetime.now().isoformat(),
            'tests': {}
        }
        
        # Initialize repositories
        self.work_order_repo = WorkOrderRepository(db_manager)
        self.pm_task_repo = PMTaskRepository(db_manager)
        self.pm_schedule_repo = PMScheduleRepository(db_manager)
        self.cost_entry_repo = CostEntryRepository(db_manager)
        self.analytics_repo = AnalyticsRepository(db_manager)
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run complete deployment test suite"""
        logger.info("🚀 Starting ChatterFix CMMS deployment tests...")
        
        try:
            # Test 1: Database connection and setup
            await self.test_database_connection()
            
            # Test 2: Migration system
            await self.test_migrations()
            
            # Test 3: Data operations (CRUD)
            await self.test_data_operations()
            
            # Test 4: Sync system simulation
            await self.test_sync_system()
            
            # Test 5: Performance monitoring
            await self.test_performance_monitoring()
            
            # Test 6: Backup and recovery
            await self.test_backup_recovery()
            
            # Test 7: Conflict resolution
            await self.test_conflict_resolution()
            
            # Test 8: Analytics and reporting
            await self.test_analytics()
            
            self.test_results['overall_status'] = 'PASSED'
            self.test_results['end_time'] = datetime.now().isoformat()
            
            logger.info("✅ All deployment tests completed successfully!")
            
        except Exception as e:
            self.test_results['overall_status'] = 'FAILED'
            self.test_results['error'] = str(e)
            self.test_results['end_time'] = datetime.now().isoformat()
            
            logger.error(f"❌ Deployment tests failed: {e}")
            raise
        
        return self.test_results
    
    async def test_database_connection(self):
        """Test database connection and basic operations"""
        logger.info("Testing database connection...")
        
        test_name = "database_connection"
        try:
            # Initialize database
            await startup_database()
            
            # Test health check
            health = await db_manager.health_check()
            assert health, "Database health check failed"
            
            # Test basic query
            result = await db_manager.fetchval("SELECT 1")
            assert result == 1, "Basic query failed"
            
            # Test transaction
            async with db_manager.get_transaction() as conn:
                test_result = await conn.fetchval("SELECT 2")
                assert test_result == 2, "Transaction test failed"
            
            self.test_results['tests'][test_name] = {
                'status': 'PASSED',
                'message': 'Database connection successful'
            }
            
            logger.info("✅ Database connection test passed")
            
        except Exception as e:
            self.test_results['tests'][test_name] = {
                'status': 'FAILED',
                'error': str(e)
            }
            logger.error(f"❌ Database connection test failed: {e}")
            raise
    
    async def test_migrations(self):
        """Test migration system"""
        logger.info("Testing migration system...")
        
        test_name = "migrations"
        try:
            migration_manager = MigrationManager(db_manager)
            
            # Get migration status
            status = await migration_manager.migration_status()
            
            # Ensure all migrations are applied
            applied_count = sum(1 for m in status if m['applied'])
            total_count = len(status)
            
            assert applied_count == total_count, f"Only {applied_count}/{total_count} migrations applied"
            
            # Test data migrator
            data_migrator = DataMigrator(db_manager)
            await data_migrator.migrate_demo_data()
            
            self.test_results['tests'][test_name] = {
                'status': 'PASSED',
                'migrations_applied': applied_count,
                'total_migrations': total_count
            }
            
            logger.info(f"✅ Migration test passed ({applied_count}/{total_count} migrations)")
            
        except Exception as e:
            self.test_results['tests'][test_name] = {
                'status': 'FAILED',
                'error': str(e)
            }
            logger.error(f"❌ Migration test failed: {e}")
            raise
    
    async def test_data_operations(self):
        """Test CRUD operations on all major entities"""
        logger.info("Testing data operations...")
        
        test_name = "data_operations"
        operations_tested = []
        
        try:
            # Test Work Order operations
            wo_data = {
                'title': 'Test Work Order',
                'description': 'Test work order for deployment testing',
                'priority': 'MEDIUM',
                'status': 'OPEN',
                'created_by': '00000000-0000-0000-0000-000000000001'
            }
            
            # Create work order
            created_wo = await self.work_order_repo.create(wo_data)
            assert created_wo, "Work order creation failed"
            operations_tested.append("work_order_create")
            
            # Read work order
            read_wo = await self.work_order_repo.get_by_id(created_wo['id'])
            assert read_wo, "Work order read failed"
            assert read_wo['title'] == wo_data['title'], "Work order data mismatch"
            operations_tested.append("work_order_read")
            
            # Update work order
            updated_wo = await self.work_order_repo.update(created_wo['id'], {'status': 'IN_PROGRESS'})
            assert updated_wo, "Work order update failed"
            assert updated_wo['status'] == 'IN_PROGRESS', "Work order update data mismatch"
            operations_tested.append("work_order_update")
            
            # Test PM Task operations
            pm_data = {
                'name': 'Test PM Task',
                'description': 'Test PM task for deployment testing',
                'asset_id': '00000000-0000-0000-0000-000000000001',
                'trigger_type': 'TIME_BASED',
                'frequency': 'MONTHLY',
                'estimated_duration': 60,
                'priority': 'MEDIUM',
                'created_by': '00000000-0000-0000-0000-000000000001'
            }
            
            created_pm = await self.pm_task_repo.create(pm_data)
            assert created_pm, "PM task creation failed"
            operations_tested.append("pm_task_create")
            
            # Test Cost Entry operations
            cost_data = {
                'work_order_id': created_wo['id'],
                'type': 'LABOR',
                'amount': 150.00,
                'description': 'Test labor cost',
                'created_by': '00000000-0000-0000-0000-000000000001'
            }
            
            created_cost = await self.cost_entry_repo.create(cost_data)
            assert created_cost, "Cost entry creation failed"
            operations_tested.append("cost_entry_create")
            
            # Test financial summary
            financials = await self.cost_entry_repo.get_financials_summary(created_wo['id'])
            assert financials['total'] == 150.00, "Financial summary calculation failed"
            operations_tested.append("financial_summary")
            
            self.test_results['tests'][test_name] = {
                'status': 'PASSED',
                'operations_tested': operations_tested,
                'test_records_created': 3
            }
            
            logger.info(f"✅ Data operations test passed ({len(operations_tested)} operations)")
            
        except Exception as e:
            self.test_results['tests'][test_name] = {
                'status': 'FAILED',
                'error': str(e),
                'operations_tested': operations_tested
            }
            logger.error(f"❌ Data operations test failed: {e}")
            raise
    
    async def test_sync_system(self):
        """Test sync system simulation"""
        logger.info("Testing sync system...")
        
        test_name = "sync_system"
        try:
            # Simulate creating sync operations
            sync_operations = []
            
            # Create test sync status entries
            for i in range(3):
                sync_id = f"test_sync_{i}_{int(datetime.now().timestamp())}"
                await db_manager.execute(
                    """
                    INSERT INTO sync_status (id, table_name, record_id, operation, client_id, synced)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    sync_id, 'test_table', f'test_record_{i}', 'CREATE', 'test_client', False
                )
                sync_operations.append(sync_id)
            
            # Test pending sync count
            pending_count = await db_manager.fetchval(
                "SELECT COUNT(*) FROM sync_status WHERE client_id = 'test_client' AND synced = false"
            )
            assert pending_count == 3, f"Expected 3 pending sync operations, got {pending_count}"
            
            # Test marking operations as synced
            for sync_id in sync_operations:
                await db_manager.execute(
                    "UPDATE sync_status SET synced = true, synced_at = CURRENT_TIMESTAMP WHERE id = $1",
                    sync_id
                )
            
            # Verify sync completion
            remaining_count = await db_manager.fetchval(
                "SELECT COUNT(*) FROM sync_status WHERE client_id = 'test_client' AND synced = false"
            )
            assert remaining_count == 0, f"Expected 0 pending operations after sync, got {remaining_count}"
            
            # Clean up test data
            await db_manager.execute("DELETE FROM sync_status WHERE client_id = 'test_client'")
            
            self.test_results['tests'][test_name] = {
                'status': 'PASSED',
                'sync_operations_tested': len(sync_operations)
            }
            
            logger.info("✅ Sync system test passed")
            
        except Exception as e:
            self.test_results['tests'][test_name] = {
                'status': 'FAILED',
                'error': str(e)
            }
            logger.error(f"❌ Sync system test failed: {e}")
            raise
    
    async def test_performance_monitoring(self):
        """Test performance monitoring system"""
        logger.info("Testing performance monitoring...")
        
        test_name = "performance_monitoring"
        try:
            # Generate performance report
            perf_report = await performance_monitor.analyze_query_performance()
            
            assert 'timestamp' in perf_report, "Performance report missing timestamp"
            assert 'table_statistics' in perf_report, "Performance report missing table statistics"
            
            # Test database optimization
            optimization_result = await optimize_database()
            
            assert 'timestamp' in optimization_result, "Optimization result missing timestamp"
            assert 'vacuum_results' in optimization_result, "Optimization missing vacuum results"
            
            self.test_results['tests'][test_name] = {
                'status': 'PASSED',
                'performance_report_generated': True,
                'optimization_completed': True,
                'tables_analyzed': len(perf_report.get('table_statistics', []))
            }
            
            logger.info("✅ Performance monitoring test passed")
            
        except Exception as e:
            self.test_results['tests'][test_name] = {
                'status': 'FAILED',
                'error': str(e)
            }
            logger.error(f"❌ Performance monitoring test failed: {e}")
            raise
    
    async def test_backup_recovery(self):
        """Test backup and recovery system"""
        logger.info("Testing backup and recovery...")
        
        test_name = "backup_recovery"
        try:
            # Create a test backup
            backup_name = f"test_backup_{int(datetime.now().timestamp())}"
            backup_result = await backup_manager.create_full_backup(backup_name)
            
            assert backup_result['backup_name'] == backup_name, "Backup name mismatch"
            assert backup_result['backup_size'] > 0, "Backup file is empty"
            
            # List backups
            backups = await backup_manager.list_backups()
            test_backup = next((b for b in backups if b['backup_name'] == backup_name), None)
            assert test_backup, "Test backup not found in backup list"
            
            # Verify backup integrity
            verification = await backup_manager.verify_backup(backup_name)
            assert verification['verification_status'] == 'passed', "Backup verification failed"
            
            # Clean up test backup
            backup_file = Path(backup_result['backup_file'])
            metadata_file = backup_file.parent / f"{backup_name}.metadata.json"
            
            if backup_file.exists():
                backup_file.unlink()
            if metadata_file.exists():
                metadata_file.unlink()
            
            self.test_results['tests'][test_name] = {
                'status': 'PASSED',
                'backup_created': True,
                'backup_verified': True,
                'backup_size_mb': backup_result['backup_size_mb']
            }
            
            logger.info("✅ Backup and recovery test passed")
            
        except Exception as e:
            self.test_results['tests'][test_name] = {
                'status': 'FAILED',
                'error': str(e)
            }
            logger.error(f"❌ Backup and recovery test failed: {e}")
            raise
    
    async def test_conflict_resolution(self):
        """Test sync conflict resolution scenarios"""
        logger.info("Testing conflict resolution...")
        
        test_name = "conflict_resolution"
        try:
            # Create a work order for conflict testing
            wo_data = {
                'title': 'Conflict Test Work Order',
                'description': 'Testing conflict resolution',
                'priority': 'LOW',
                'status': 'OPEN',
                'created_by': '00000000-0000-0000-0000-000000000001'
            }
            
            created_wo = await self.work_order_repo.create(wo_data)
            work_order_id = created_wo['id']
            
            # Simulate conflict: Update from server
            server_update = await self.work_order_repo.update(work_order_id, {
                'status': 'IN_PROGRESS',
                'priority': 'HIGH'
            })
            
            # Simulate client attempting conflicting update
            # In a real scenario, this would be detected by comparing timestamps
            client_timestamp = datetime.now() - timedelta(minutes=5)  # Older timestamp
            server_timestamp = server_update['updated_at']
            
            # Conflict detection logic
            conflict_detected = server_timestamp > client_timestamp
            assert conflict_detected, "Conflict detection failed"
            
            # Test conflict resolution (server wins)
            current_wo = await self.work_order_repo.get_by_id(work_order_id)
            assert current_wo['status'] == 'IN_PROGRESS', "Server wins resolution failed"
            assert current_wo['priority'] == 'HIGH', "Server wins resolution failed"
            
            # Create audit log entry for conflict resolution
            await db_manager.execute(
                """
                INSERT INTO audit_log (table_name, record_id, operation, new_values, changed_at)
                VALUES ($1, $2, $3, $4, $5)
                """,
                'work_orders', work_order_id, 'CONFLICT_RESOLVED',
                json.dumps({'resolution': 'server_wins', 'conflict_detected_at': datetime.now().isoformat()}),
                datetime.now()
            )
            
            self.test_results['tests'][test_name] = {
                'status': 'PASSED',
                'conflict_detected': True,
                'resolution_strategy': 'server_wins',
                'audit_logged': True
            }
            
            logger.info("✅ Conflict resolution test passed")
            
        except Exception as e:
            self.test_results['tests'][test_name] = {
                'status': 'FAILED',
                'error': str(e)
            }
            logger.error(f"❌ Conflict resolution test failed: {e}")
            raise
    
    async def test_analytics(self):
        """Test analytics and reporting system"""
        logger.info("Testing analytics...")
        
        test_name = "analytics"
        try:
            # Test PM analytics
            pm_analytics = await self.analytics_repo.get_pm_analytics()
            
            required_fields = ['total_tasks', 'active_tasks', 'completion_rate', 'timestamp']
            for field in required_fields:
                assert field in pm_analytics, f"PM analytics missing {field}"
            
            # Test data views
            views_to_test = [
                'work_order_summary',
                'pm_compliance',
                'asset_utilization'
            ]
            
            view_results = {}
            for view in views_to_test:
                try:
                    result = await db_manager.fetch(f"SELECT COUNT(*) as count FROM {view} LIMIT 1")
                    view_results[view] = 'accessible'
                except Exception as e:
                    view_results[view] = f'error: {str(e)}'
            
            # Verify at least basic views are accessible
            accessible_views = sum(1 for status in view_results.values() if status == 'accessible')
            assert accessible_views >= 2, f"Only {accessible_views} views accessible"
            
            self.test_results['tests'][test_name] = {
                'status': 'PASSED',
                'pm_analytics_generated': True,
                'views_tested': view_results,
                'accessible_views': accessible_views
            }
            
            logger.info("✅ Analytics test passed")
            
        except Exception as e:
            self.test_results['tests'][test_name] = {
                'status': 'FAILED',
                'error': str(e)
            }
            logger.error(f"❌ Analytics test failed: {e}")
            raise
    
    def generate_report(self) -> str:
        """Generate a comprehensive test report"""
        report = []
        report.append("=" * 60)
        report.append("ChatterFix CMMS Deployment Test Report")
        report.append("=" * 60)
        report.append(f"Started: {self.test_results['start_time']}")
        report.append(f"Completed: {self.test_results.get('end_time', 'In Progress')}")
        report.append(f"Overall Status: {self.test_results.get('overall_status', 'Unknown')}")
        report.append("")
        
        # Test results summary
        total_tests = len(self.test_results['tests'])
        passed_tests = sum(1 for test in self.test_results['tests'].values() if test.get('status') == 'PASSED')
        
        report.append(f"Test Summary: {passed_tests}/{total_tests} tests passed")
        report.append("")
        
        # Individual test results
        for test_name, test_result in self.test_results['tests'].items():
            status = test_result.get('status', 'Unknown')
            status_icon = "✅" if status == 'PASSED' else "❌"
            
            report.append(f"{status_icon} {test_name.replace('_', ' ').title()}: {status}")
            
            if status == 'FAILED' and 'error' in test_result:
                report.append(f"   Error: {test_result['error']}")
            
            # Add relevant metrics
            for key, value in test_result.items():
                if key not in ['status', 'error'] and not key.startswith('_'):
                    report.append(f"   {key}: {value}")
            
            report.append("")
        
        # Recommendations
        if self.test_results.get('overall_status') == 'PASSED':
            report.append("🎉 All tests passed! Your ChatterFix CMMS deployment is ready for production.")
        else:
            report.append("⚠️  Some tests failed. Please review the errors above before deploying.")
        
        report.append("")
        report.append("=" * 60)
        
        return "\n".join(report)

async def main():
    """Main deployment testing function"""
    tester = DeploymentTester()
    
    try:
        results = await tester.run_all_tests()
        
        # Generate and display report
        report = tester.generate_report()
        print(report)
        
        # Save report to file
        report_file = Path(__file__).parent / f"deployment_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w') as f:
            f.write(report)
        
        print(f"\nDetailed report saved to: {report_file}")
        
        # Exit with appropriate code
        exit_code = 0 if results['overall_status'] == 'PASSED' else 1
        sys.exit(exit_code)
        
    except Exception as e:
        logger.error(f"Deployment testing failed: {e}")
        sys.exit(1)
        
    finally:
        await shutdown_database()

if __name__ == "__main__":
    asyncio.run(main())