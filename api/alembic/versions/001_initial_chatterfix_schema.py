"""Initial ChatterFix CMMS schema

Revision ID: 001
Revises: 
Create Date: 2024-12-17 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create UUID extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')
    
    # Create custom enums
    cost_type_enum = postgresql.ENUM('LABOR', 'PART', 'SERVICE', 'MISC', name='cost_type')
    approval_state_enum = postgresql.ENUM('PENDING', 'APPROVED', 'REJECTED', name='approval_state')
    decision_type_enum = postgresql.ENUM('APPROVE', 'REJECT', name='decision_type')
    pm_trigger_type_enum = postgresql.ENUM('TIME_BASED', 'METER_BASED', 'CONDITION_BASED', 'EVENT_BASED', name='pm_trigger_type')
    pm_frequency_enum = postgresql.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY', 'CUSTOM', name='pm_frequency')
    pm_status_enum = postgresql.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', name='pm_status')
    pm_task_status_enum = postgresql.ENUM('SCHEDULED', 'DUE', 'OVERDUE', 'COMPLETED', 'SKIPPED', name='pm_task_status')
    
    cost_type_enum.create(op.get_bind())
    approval_state_enum.create(op.get_bind())
    decision_type_enum.create(op.get_bind())
    pm_trigger_type_enum.create(op.get_bind())
    pm_frequency_enum.create(op.get_bind())
    pm_status_enum.create(op.get_bind())
    pm_task_status_enum.create(op.get_bind())
    
    # Create companies table
    op.create_table('companies',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('setup_date', sa.Date(), nullable=True, server_default=sa.text('CURRENT_DATE')),
        sa.Column('settings', postgresql.JSON(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, server_default='TECHNICIAN'),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('department', sa.String(100), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    
    # Create assets table
    op.create_table('assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('asset_code', sa.String(100), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('manufacturer', sa.String(100), nullable=True),
        sa.Column('model', sa.String(100), nullable=True),
        sa.Column('serial_number', sa.String(100), nullable=True),
        sa.Column('purchase_date', sa.Date(), nullable=True),
        sa.Column('warranty_end', sa.Date(), nullable=True),
        sa.Column('status', sa.String(50), nullable=True, server_default='ACTIVE'),
        sa.Column('last_maintenance', sa.DateTime(timezone=True), nullable=True),
        sa.Column('criticality', sa.String(20), nullable=True, server_default='MEDIUM'),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('parent_asset_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['parent_asset_id'], ['assets.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('asset_code')
    )
    
    # Create work_orders table
    op.create_table('work_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('wo_number', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('priority', sa.String(20), nullable=True, server_default='MEDIUM'),
        sa.Column('status', sa.String(50), nullable=True, server_default='OPEN'),
        sa.Column('work_type', sa.String(50), nullable=True, server_default='CORRECTIVE'),
        sa.Column('asset_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('requested_date', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('scheduled_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('estimated_hours', sa.Numeric(10, 2), nullable=True),
        sa.Column('actual_hours', sa.Numeric(10, 2), nullable=True),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('completion_notes', sa.Text(), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('wo_number')
    )
    
    # Create cost_entries table
    op.create_table('cost_entries',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('work_order_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('type', cost_type_enum, nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('meta', postgresql.JSON(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create budgets table
    op.create_table('budgets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('budget_period', sa.String(20), nullable=True, server_default='ANNUAL'),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('total_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('spent_amount', sa.Numeric(15, 2), nullable=True, server_default='0'),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('department', sa.String(100), nullable=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create approvals table
    op.create_table('approvals',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('work_order_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('approver_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('state', approval_state_enum, nullable=True, server_default='PENDING'),
        sa.Column('decision', decision_type_enum, nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['approver_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create sla_templates table
    op.create_table('sla_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('respond_mins', sa.Integer(), nullable=False),
        sa.Column('resolve_mins', sa.Integer(), nullable=False),
        sa.Column('priority', sa.String(20), nullable=True),
        sa.Column('work_type', sa.String(50), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create assignment_rules table
    op.create_table('assignment_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('json_rule', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('priority', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create PM tasks table
    op.create_table('pm_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('asset_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('trigger_type', pm_trigger_type_enum, nullable=False),
        sa.Column('frequency', pm_frequency_enum, nullable=False),
        sa.Column('interval_value', sa.Integer(), nullable=True, server_default='1'),
        sa.Column('meter_type', sa.String(50), nullable=True),
        sa.Column('meter_threshold', sa.Integer(), nullable=True),
        sa.Column('estimated_duration', sa.Integer(), nullable=True, server_default='60'),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.Column('required_parts', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('required_skills', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('priority', sa.String(20), nullable=True, server_default='MEDIUM'),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('status', pm_status_enum, nullable=True, server_default='ACTIVE'),
        sa.Column('last_completed', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_due', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completion_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create pm_schedule table
    op.create_table('pm_schedule',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('pm_task_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('scheduled_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', pm_task_status_enum, nullable=True, server_default='SCHEDULED'),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('work_order_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('completion_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completion_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.ForeignKeyConstraint(['pm_task_id'], ['pm_tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create meter_readings table
    op.create_table('meter_readings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('asset_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('meter_type', sa.String(50), nullable=False),
        sa.Column('reading', sa.Numeric(15, 3), nullable=False),
        sa.Column('reading_date', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('read_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['read_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create inventory_items table
    op.create_table('inventory_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('part_number', sa.String(100), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('unit_of_measure', sa.String(20), nullable=True, server_default='EA'),
        sa.Column('current_stock', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('min_stock', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('max_stock', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('unit_cost', sa.Numeric(10, 2), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('supplier', sa.String(255), nullable=True),
        sa.Column('lead_time_days', sa.Integer(), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('part_number')
    )
    
    # Create stock_movements table
    op.create_table('stock_movements',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('inventory_item_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('movement_type', sa.String(20), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_cost', sa.Numeric(10, 2), nullable=True),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['inventory_item_id'], ['inventory_items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create documents table
    op.create_table('documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('file_type', sa.String(50), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('storage_path', sa.String(500), nullable=True),
        sa.Column('cloud_url', sa.String(1000), nullable=True),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create sync_status table
    op.create_table('sync_status',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('table_name', sa.String(100), nullable=False),
        sa.Column('record_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('operation', sa.String(20), nullable=False),
        sa.Column('client_id', sa.String(100), nullable=True),
        sa.Column('sync_priority', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('retry_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('synced', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create audit_log table
    op.create_table('audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('table_name', sa.String(100), nullable=False),
        sa.Column('record_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('operation', sa.String(20), nullable=False),
        sa.Column('old_values', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('new_values', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('changed_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('client_info', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_assets_company_id', 'assets', ['company_id'])
    op.create_index('idx_assets_status', 'assets', ['status'])
    op.create_index('idx_work_orders_asset_id', 'work_orders', ['asset_id'])
    op.create_index('idx_work_orders_assigned_to', 'work_orders', ['assigned_to'])
    op.create_index('idx_work_orders_status', 'work_orders', ['status'])
    op.create_index('idx_cost_entries_work_order_id', 'cost_entries', ['work_order_id'])
    op.create_index('idx_pm_tasks_asset_id', 'pm_tasks', ['asset_id'])
    op.create_index('idx_pm_schedule_due_date', 'pm_schedule', ['due_date'])
    op.create_index('idx_sync_status_client_id', 'sync_status', ['client_id'])
    
    # Insert seed data
    op.execute("""
        INSERT INTO companies (id, name, location) 
        VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Company', 'Demo Location')
        ON CONFLICT (id) DO NOTHING
    """)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_sync_status_client_id')
    op.drop_index('idx_pm_schedule_due_date')
    op.drop_index('idx_pm_tasks_asset_id')
    op.drop_index('idx_cost_entries_work_order_id')
    op.drop_index('idx_work_orders_status')
    op.drop_index('idx_work_orders_assigned_to')
    op.drop_index('idx_work_orders_asset_id')
    op.drop_index('idx_assets_status')
    op.drop_index('idx_assets_company_id')
    
    # Drop tables in reverse dependency order
    op.drop_table('audit_log')
    op.drop_table('sync_status')
    op.drop_table('documents')
    op.drop_table('stock_movements')
    op.drop_table('inventory_items')
    op.drop_table('meter_readings')
    op.drop_table('pm_schedule')
    op.drop_table('pm_tasks')
    op.drop_table('assignment_rules')
    op.drop_table('sla_templates')
    op.drop_table('approvals')
    op.drop_table('budgets')
    op.drop_table('cost_entries')
    op.drop_table('work_orders')
    op.drop_table('assets')
    op.drop_table('users')
    op.drop_table('companies')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS pm_task_status')
    op.execute('DROP TYPE IF EXISTS pm_status')
    op.execute('DROP TYPE IF EXISTS pm_frequency')
    op.execute('DROP TYPE IF EXISTS pm_trigger_type')
    op.execute('DROP TYPE IF EXISTS decision_type')
    op.execute('DROP TYPE IF EXISTS approval_state')
    op.execute('DROP TYPE IF EXISTS cost_type')