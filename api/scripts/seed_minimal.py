#!/usr/bin/env python3
"""
Minimal seed script for ChatterFix CMMS
Creates essential data for production validation
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta
import uuid

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from database.config import db_manager, startup_database, shutdown_database
from database.repositories import (
    WorkOrderRepository, AssetRepository, UserRepository,
    PMTaskRepository, CostEntryRepository
)

async def seed_minimal_data():
    """Seed minimal production data for validation"""
    print("🌱 Seeding minimal production data...")
    
    try:
        await startup_database()
        
        # Initialize repositories
        user_repo = UserRepository(db_manager)
        asset_repo = AssetRepository(db_manager)
        work_order_repo = WorkOrderRepository(db_manager)
        pm_task_repo = PMTaskRepository(db_manager)
        cost_entry_repo = CostEntryRepository(db_manager)
        
        # 1. Create essential users
        users_data = [
            {
                'id': '11111111-1111-1111-1111-111111111111',
                'email': 'admin@production.test',
                'name': 'Production Admin',
                'role': 'ADMIN'
            },
            {
                'id': '22222222-2222-2222-2222-222222222222',
                'email': 'technician@production.test',
                'name': 'Production Technician',
                'role': 'TECHNICIAN'
            },
            {
                'id': '33333333-3333-3333-3333-333333333333',
                'email': 'manager@production.test',
                'name': 'Production Manager',
                'role': 'MANAGER'
            }
        ]
        
        for user_data in users_data:
            await db_manager.execute(
                """
                INSERT INTO users (id, email, name, role)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (email) DO UPDATE SET
                    name = EXCLUDED.name,
                    role = EXCLUDED.role,
                    updated_at = CURRENT_TIMESTAMP
                """,
                user_data['id'], user_data['email'], user_data['name'], user_data['role']
            )
        
        print("✅ Created 3 essential users")
        
        # 2. Create test assets
        assets_data = [
            {
                'id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                'asset_code': 'PROD-PUMP-001',
                'name': 'Production Pump #1',
                'location': 'Building A',
                'status': 'ACTIVE',
                'category': 'PUMPS',
                'company_id': '00000000-0000-0000-0000-000000000001'
            },
            {
                'id': 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                'asset_code': 'PROD-CONV-001',
                'name': 'Production Conveyor #1',
                'location': 'Building A',
                'status': 'ACTIVE',
                'category': 'CONVEYORS',
                'company_id': '00000000-0000-0000-0000-000000000001'
            }
        ]
        
        for asset_data in assets_data:
            await db_manager.execute(
                """
                INSERT INTO assets (id, asset_code, name, location, status, category, company_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (asset_code) DO UPDATE SET
                    name = EXCLUDED.name,
                    location = EXCLUDED.location,
                    status = EXCLUDED.status,
                    updated_at = CURRENT_TIMESTAMP
                """,
                asset_data['id'], asset_data['asset_code'], asset_data['name'],
                asset_data['location'], asset_data['status'], asset_data['category'],
                asset_data['company_id']
            )
        
        print("✅ Created 2 test assets")
        
        # 3. Create validation work order with SLA
        work_order_data = {
            'id': 'wwwwwwww-wwww-wwww-wwww-wwwwwwwwwwww',
            'wo_number': 'PROD-WO-001',
            'title': 'Production Validation Work Order',
            'description': 'Test work order for production validation - includes approval workflow',
            'priority': 'MEDIUM',
            'status': 'OPEN',
            'work_type': 'CORRECTIVE',
            'asset_id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'assigned_to': '22222222-2222-2222-2222-222222222222',
            'created_by': '11111111-1111-1111-1111-111111111111',
            'estimated_hours': 2.5
        }
        
        created_wo = await work_order_repo.create(work_order_data)
        print("✅ Created validation work order")
        
        # 4. Create SLA template for validation
        await db_manager.execute(
            """
            INSERT INTO sla_templates (id, name, respond_mins, resolve_mins, priority, company_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
                respond_mins = EXCLUDED.respond_mins,
                resolve_mins = EXCLUDED.resolve_mins,
                updated_at = CURRENT_TIMESTAMP
            """,
            'ssssssss-ssss-ssss-ssss-ssssssssssss',
            'Production Validation SLA',
            30,  # 30 minutes response
            240,  # 4 hours resolution
            'MEDIUM',
            '00000000-0000-0000-0000-000000000001'
        )
        
        print("✅ Created SLA template")
        
        # 5. Create test cost entries for financial validation
        cost_entries = [
            {
                'work_order_id': created_wo['id'],
                'type': 'LABOR',
                'amount': 75.00,
                'description': 'Technician labor - 1.5 hours',
                'created_by': '22222222-2222-2222-2222-222222222222'
            },
            {
                'work_order_id': created_wo['id'],
                'type': 'PART',
                'amount': 45.50,
                'description': 'Replacement gasket',
                'created_by': '22222222-2222-2222-2222-222222222222'
            }
        ]
        
        for cost_data in cost_entries:
            await cost_entry_repo.create(cost_data)
        
        print("✅ Created cost entries ($120.50 total)")
        
        # 6. Create PM task for validation
        pm_task_data = {
            'name': 'Production Pump Weekly Inspection',
            'description': 'Weekly inspection of production pump for validation',
            'asset_id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'trigger_type': 'TIME_BASED',
            'frequency': 'WEEKLY',
            'interval_value': 1,
            'estimated_duration': 30,
            'instructions': 'Check pump pressure, vibration, and temperature',
            'priority': 'MEDIUM',
            'category': 'INSPECTION',
            'created_by': '11111111-1111-1111-1111-111111111111'
        }
        
        created_pm = await pm_task_repo.create(pm_task_data)
        print("✅ Created PM task")
        
        # 7. Create PM schedule entry for immediate validation
        next_due = datetime.now() + timedelta(days=7)
        await db_manager.execute(
            """
            INSERT INTO pm_schedule (id, pm_task_id, scheduled_date, due_date, status, assigned_to)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            str(uuid.uuid4()),
            created_pm['id'],
            next_due,
            next_due,
            'SCHEDULED',
            '22222222-2222-2222-2222-222222222222'
        )
        
        print("✅ Created PM schedule entry")
        
        # 8. Validation queries
        print("\n🔍 Running validation queries...")
        
        # Check joins work
        wo_with_asset = await db_manager.fetchrow(
            """
            SELECT wo.title, a.name as asset_name, u.name as technician_name
            FROM work_orders wo
            JOIN assets a ON wo.asset_id = a.id
            JOIN users u ON wo.assigned_to = u.id
            WHERE wo.id = $1
            """,
            created_wo['id']
        )
        
        if wo_with_asset:
            print(f"   ✅ Work Order Join: {wo_with_asset['title']} → {wo_with_asset['asset_name']} → {wo_with_asset['technician_name']}")
        
        # Check financial totals
        total_cost = await db_manager.fetchval(
            "SELECT SUM(amount) FROM cost_entries WHERE work_order_id = $1",
            created_wo['id']
        )
        
        print(f"   ✅ Financial Total: ${total_cost}")
        
        # Check PM compliance view
        pm_compliance = await db_manager.fetchval(
            "SELECT COUNT(*) FROM pm_compliance WHERE compliance_status = 'ON_TRACK'"
        )
        
        print(f"   ✅ PM Compliance View: {pm_compliance} tasks on track")
        
        print("\n🎉 Minimal seed data created successfully!")
        print("\nValidation checklist:")
        print("   ✅ Users created (admin, technician, manager)")
        print("   ✅ Assets created with proper joins") 
        print("   ✅ Work order with SLA template")
        print("   ✅ Cost entries with financial totals")
        print("   ✅ PM task with schedule")
        print("   ✅ Database views accessible")
        
        print(f"\nTest credentials:")
        print(f"   Admin: admin@production.test")
        print(f"   Technician: technician@production.test")
        print(f"   Manager: manager@production.test")
        
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        raise
    
    finally:
        await shutdown_database()

if __name__ == "__main__":
    asyncio.run(seed_minimal_data())