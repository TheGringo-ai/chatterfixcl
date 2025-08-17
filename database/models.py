"""
SQLAlchemy models for ChatterFix CMMS
Used by Alembic for migrations and schema management
"""

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text, 
    Numeric, Date, UUID, ForeignKey, Index, CheckConstraint,
    ARRAY, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ENUM
import uuid

Base = declarative_base()

# Define custom enums
cost_type_enum = ENUM('LABOR', 'PART', 'SERVICE', 'MISC', name='cost_type')
approval_state_enum = ENUM('PENDING', 'APPROVED', 'REJECTED', name='approval_state')
decision_type_enum = ENUM('APPROVE', 'REJECT', name='decision_type')
pm_trigger_type_enum = ENUM('TIME_BASED', 'METER_BASED', 'CONDITION_BASED', 'EVENT_BASED', name='pm_trigger_type')
pm_frequency_enum = ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY', 'CUSTOM', name='pm_frequency')
pm_status_enum = ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', name='pm_status')
pm_task_status_enum = ENUM('SCHEDULED', 'DUE', 'OVERDUE', 'COMPLETED', 'SKIPPED', name='pm_task_status')

class Company(Base):
    __tablename__ = 'companies'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    location = Column(String(255))
    setup_date = Column(Date, default=func.current_date())
    settings = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class User(Base):
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default='TECHNICIAN')
    phone = Column(String(20))
    department = Column(String(100))
    active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Asset(Base):
    __tablename__ = 'assets'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_code = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    location = Column(String(255))
    category = Column(String(100))
    manufacturer = Column(String(100))
    model = Column(String(100))
    serial_number = Column(String(100))
    purchase_date = Column(Date)
    warranty_end = Column(Date)
    status = Column(String(50), default='ACTIVE')
    last_maintenance = Column(DateTime(timezone=True))
    criticality = Column(String(20), default='MEDIUM')
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'))
    parent_asset_id = Column(UUID(as_uuid=True), ForeignKey('assets.id'))
    meta = Column('metadata', JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class WorkOrder(Base):
    __tablename__ = 'work_orders'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wo_number = Column(String(50), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    priority = Column(String(20), default='MEDIUM')
    status = Column(String(50), default='OPEN')
    work_type = Column(String(50), default='CORRECTIVE')
    asset_id = Column(UUID(as_uuid=True), ForeignKey('assets.id'))
    assigned_to = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    requested_date = Column(DateTime(timezone=True), server_default=func.now())
    scheduled_date = Column(DateTime(timezone=True))
    started_date = Column(DateTime(timezone=True))
    completed_date = Column(DateTime(timezone=True))
    estimated_hours = Column(Numeric(10, 2))
    actual_hours = Column(Numeric(10, 2))
    instructions = Column(Text)
    completion_notes = Column(Text)
    tags = Column(ARRAY(Text))
    meta = Column('metadata', JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class CostEntry(Base):
    __tablename__ = 'cost_entries'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id = Column(UUID(as_uuid=True), ForeignKey('work_orders.id', ondelete='CASCADE'))
    type = Column(cost_type_enum, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(Text)
    meta = Column(JSON, default={})
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Budget(Base):
    __tablename__ = 'budgets'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    budget_period = Column(String(20), default='ANNUAL')
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False)
    spent_amount = Column(Numeric(15, 2), default=0)
    category = Column(String(100))
    department = Column(String(100))
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Approval(Base):
    __tablename__ = 'approvals'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id = Column(UUID(as_uuid=True), ForeignKey('work_orders.id', ondelete='CASCADE'))
    approver_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    state = Column(approval_state_enum, default='PENDING')
    decision = Column(decision_type_enum)
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    decided_at = Column(DateTime(timezone=True))

class SLATemplate(Base):
    __tablename__ = 'sla_templates'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    respond_mins = Column(Integer, nullable=False)
    resolve_mins = Column(Integer, nullable=False)
    priority = Column(String(20))
    work_type = Column(String(50))
    active = Column(Boolean, default=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AssignmentRule(Base):
    __tablename__ = 'assignment_rules'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    json_rule = Column(JSON, nullable=False)
    active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class PMTask(Base):
    __tablename__ = 'pm_tasks'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    asset_id = Column(UUID(as_uuid=True), ForeignKey('assets.id', ondelete='CASCADE'))
    trigger_type = Column(pm_trigger_type_enum, nullable=False)
    frequency = Column(pm_frequency_enum, nullable=False)
    interval_value = Column(Integer, default=1)
    meter_type = Column(String(50))
    meter_threshold = Column(Integer)
    estimated_duration = Column(Integer, default=60)
    instructions = Column(Text)
    required_parts = Column(ARRAY(Text))
    required_skills = Column(ARRAY(Text))
    priority = Column(String(20), default='MEDIUM')
    category = Column(String(100))
    status = Column(pm_status_enum, default='ACTIVE')
    last_completed = Column(DateTime(timezone=True))
    next_due = Column(DateTime(timezone=True))
    completion_count = Column(Integer, default=0)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class PMSchedule(Base):
    __tablename__ = 'pm_schedule'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pm_task_id = Column(UUID(as_uuid=True), ForeignKey('pm_tasks.id', ondelete='CASCADE'))
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(pm_task_status_enum, default='SCHEDULED')
    assigned_to = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    work_order_id = Column(UUID(as_uuid=True), ForeignKey('work_orders.id'))
    completion_date = Column(DateTime(timezone=True))
    completion_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class MeterReading(Base):
    __tablename__ = 'meter_readings'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey('assets.id', ondelete='CASCADE'))
    meter_type = Column(String(50), nullable=False)
    reading = Column(Numeric(15, 3), nullable=False)
    reading_date = Column(DateTime(timezone=True), server_default=func.now())
    read_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class InventoryItem(Base):
    __tablename__ = 'inventory_items'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    part_number = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    unit_of_measure = Column(String(20), default='EA')
    current_stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=0)
    max_stock = Column(Integer, default=0)
    unit_cost = Column(Numeric(10, 2))
    location = Column(String(255))
    supplier = Column(String(255))
    lead_time_days = Column(Integer)
    active = Column(Boolean, default=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class StockMovement(Base):
    __tablename__ = 'stock_movements'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inventory_item_id = Column(UUID(as_uuid=True), ForeignKey('inventory_items.id', ondelete='CASCADE'))
    movement_type = Column(String(20), nullable=False)  # 'IN', 'OUT', 'ADJUSTMENT'
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(10, 2))
    reference_type = Column(String(50))  # 'WORK_ORDER', 'PURCHASE', 'ADJUSTMENT'
    reference_id = Column(UUID(as_uuid=True))
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Document(Base):
    __tablename__ = 'documents'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String(500))
    cloud_url = Column(String(1000))
    reference_type = Column(String(50))  # 'WORK_ORDER', 'ASSET', 'PM_TASK'
    reference_id = Column(UUID(as_uuid=True))
    tags = Column(ARRAY(Text))
    description = Column(Text)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SyncStatus(Base):
    __tablename__ = 'sync_status'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    table_name = Column(String(100), nullable=False)
    record_id = Column(UUID(as_uuid=True), nullable=False)
    operation = Column(String(20), nullable=False)  # 'CREATE', 'UPDATE', 'DELETE'
    client_id = Column(String(100))
    sync_priority = Column(Integer, default=0)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    synced = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    synced_at = Column(DateTime(timezone=True))

class AuditLog(Base):
    __tablename__ = 'audit_log'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    table_name = Column(String(100), nullable=False)
    record_id = Column(UUID(as_uuid=True), nullable=False)
    operation = Column(String(20), nullable=False)
    old_values = Column(JSON)
    new_values = Column(JSON)
    changed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    client_info = Column(JSON)

# Indexes for performance
Index('idx_assets_company_id', Asset.company_id)
Index('idx_assets_status', Asset.status)
Index('idx_work_orders_asset_id', WorkOrder.asset_id)
Index('idx_work_orders_assigned_to', WorkOrder.assigned_to)
Index('idx_work_orders_status', WorkOrder.status)
Index('idx_cost_entries_work_order_id', CostEntry.work_order_id)
Index('idx_pm_tasks_asset_id', PMTask.asset_id)
Index('idx_pm_schedule_due_date', PMSchedule.due_date)
Index('idx_sync_status_client_id', SyncStatus.client_id)