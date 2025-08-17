-- ChatterFix CMMS Database Schema
-- Production-ready PostgreSQL schema for enterprise CMMS system
-- Generated: 2024-12-17

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- CORE ENTITIES
-- =============================================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'TECHNICIAN',
    phone VARCHAR(20),
    department VARCHAR(100),
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Companies/Organizations table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    setup_date DATE DEFAULT CURRENT_DATE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assets table
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    category VARCHAR(100),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    purchase_date DATE,
    warranty_end DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    last_maintenance TIMESTAMP WITH TIME ZONE,
    criticality VARCHAR(20) DEFAULT 'MEDIUM',
    company_id UUID REFERENCES companies(id),
    parent_asset_id UUID REFERENCES assets(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Work Orders table
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wo_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'OPEN',
    work_type VARCHAR(50) DEFAULT 'CORRECTIVE',
    asset_id UUID REFERENCES assets(id),
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    requested_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    started_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2),
    instructions TEXT,
    completion_notes TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- FINANCIAL MANAGEMENT
-- =============================================================================

-- Cost Types enum as constraint
CREATE TYPE cost_type AS ENUM ('LABOR', 'PART', 'SERVICE', 'MISC');

-- Cost Entries table
CREATE TABLE cost_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    type cost_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    meta JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Budgets table
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    budget_period VARCHAR(20) DEFAULT 'ANNUAL',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    category VARCHAR(100),
    department VARCHAR(100),
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- WORKFLOW MANAGEMENT
-- =============================================================================

-- Approval States enum
CREATE TYPE approval_state AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE decision_type AS ENUM ('APPROVE', 'REJECT');

-- Approvals table
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id),
    state approval_state DEFAULT 'PENDING',
    decision decision_type,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP WITH TIME ZONE
);

-- SLA Templates table
CREATE TABLE sla_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    respond_mins INTEGER NOT NULL,
    resolve_mins INTEGER NOT NULL,
    priority VARCHAR(20),
    work_type VARCHAR(50),
    active BOOLEAN DEFAULT true,
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignment Rules table
CREATE TABLE assignment_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    json_rule JSONB NOT NULL,
    active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- PREVENTIVE MAINTENANCE
-- =============================================================================

-- PM Types enums
CREATE TYPE pm_trigger_type AS ENUM ('TIME_BASED', 'METER_BASED', 'CONDITION_BASED', 'EVENT_BASED');
CREATE TYPE pm_frequency AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY', 'CUSTOM');
CREATE TYPE pm_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE pm_task_status AS ENUM ('SCHEDULED', 'DUE', 'OVERDUE', 'COMPLETED', 'SKIPPED');

-- PM Tasks table
CREATE TABLE pm_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    trigger_type pm_trigger_type NOT NULL,
    frequency pm_frequency NOT NULL,
    interval_value INTEGER DEFAULT 1,
    meter_type VARCHAR(50),
    meter_threshold INTEGER,
    estimated_duration INTEGER DEFAULT 60,
    instructions TEXT,
    required_parts TEXT[],
    required_skills TEXT[],
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    category VARCHAR(100),
    status pm_status DEFAULT 'ACTIVE',
    last_completed TIMESTAMP WITH TIME ZONE,
    next_due TIMESTAMP WITH TIME ZONE,
    completion_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PM Schedule table
CREATE TABLE pm_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pm_task_id UUID REFERENCES pm_tasks(id) ON DELETE CASCADE,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status pm_task_status DEFAULT 'SCHEDULED',
    assigned_to UUID REFERENCES users(id),
    work_order_id UUID REFERENCES work_orders(id),
    completion_date TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Meter Readings table
CREATE TABLE meter_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    meter_type VARCHAR(50) NOT NULL,
    reading DECIMAL(15,3) NOT NULL,
    reading_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INVENTORY MANAGEMENT
-- =============================================================================

-- Parts/Inventory table
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'EA',
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2),
    location VARCHAR(255),
    supplier VARCHAR(255),
    lead_time_days INTEGER,
    active BOOLEAN DEFAULT true,
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stock Movements table
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT'
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    reference_type VARCHAR(50), -- 'WORK_ORDER', 'PURCHASE', 'ADJUSTMENT'
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- DOCUMENTS & ATTACHMENTS
-- =============================================================================

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(500),
    cloud_url VARCHAR(1000),
    reference_type VARCHAR(50), -- 'WORK_ORDER', 'ASSET', 'PM_TASK'
    reference_id UUID,
    tags TEXT[],
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- OFFLINE SYNC & MOBILE
-- =============================================================================

-- Sync Status table for offline/online data synchronization
CREATE TABLE sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    client_id VARCHAR(100), -- For tracking mobile/offline clients
    sync_priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    synced BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- AUDIT & LOGGING
-- =============================================================================

-- Audit Log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    client_info JSONB
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Core entity indexes
CREATE INDEX idx_assets_company_id ON assets(company_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_location ON assets(location);

CREATE INDEX idx_work_orders_asset_id ON work_orders(asset_id);
CREATE INDEX idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_priority ON work_orders(priority);
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at);

-- Financial indexes
CREATE INDEX idx_cost_entries_work_order_id ON cost_entries(work_order_id);
CREATE INDEX idx_cost_entries_type ON cost_entries(type);
CREATE INDEX idx_cost_entries_created_at ON cost_entries(created_at);

-- PM indexes
CREATE INDEX idx_pm_tasks_asset_id ON pm_tasks(asset_id);
CREATE INDEX idx_pm_tasks_status ON pm_tasks(status);
CREATE INDEX idx_pm_tasks_next_due ON pm_tasks(next_due);

CREATE INDEX idx_pm_schedule_pm_task_id ON pm_schedule(pm_task_id);
CREATE INDEX idx_pm_schedule_assigned_to ON pm_schedule(assigned_to);
CREATE INDEX idx_pm_schedule_status ON pm_schedule(status);
CREATE INDEX idx_pm_schedule_due_date ON pm_schedule(due_date);

CREATE INDEX idx_meter_readings_asset_id ON meter_readings(asset_id);
CREATE INDEX idx_meter_readings_reading_date ON meter_readings(reading_date);

-- Inventory indexes
CREATE INDEX idx_inventory_items_part_number ON inventory_items(part_number);
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_stock_movements_inventory_item_id ON stock_movements(inventory_item_id);

-- Full-text search indexes
CREATE INDEX idx_work_orders_fts ON work_orders USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_assets_fts ON assets USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignment_rules_updated_at BEFORE UPDATE ON assignment_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_tasks_updated_at BEFORE UPDATE ON pm_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pm_schedule_updated_at BEFORE UPDATE ON pm_schedule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_values, changed_at)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_values, new_values, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_values, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create audit triggers for critical tables
CREATE TRIGGER audit_work_orders AFTER INSERT OR UPDATE OR DELETE ON work_orders FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_pm_tasks AFTER INSERT OR UPDATE OR DELETE ON pm_tasks FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_cost_entries AFTER INSERT OR UPDATE OR DELETE ON cost_entries FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- =============================================================================
-- VIEWS FOR REPORTING
-- =============================================================================

-- Work Order Summary View
CREATE VIEW work_order_summary AS
SELECT 
    wo.id,
    wo.wo_number,
    wo.title,
    wo.status,
    wo.priority,
    a.name as asset_name,
    a.location as asset_location,
    u.name as assigned_to_name,
    COALESCE(SUM(ce.amount), 0) as total_cost,
    wo.created_at,
    wo.completed_date
FROM work_orders wo
LEFT JOIN assets a ON wo.asset_id = a.id
LEFT JOIN users u ON wo.assigned_to = u.id
LEFT JOIN cost_entries ce ON wo.id = ce.work_order_id
GROUP BY wo.id, a.name, a.location, u.name;

-- PM Compliance View
CREATE VIEW pm_compliance AS
SELECT 
    pt.id,
    pt.name,
    a.name as asset_name,
    pt.frequency,
    pt.last_completed,
    pt.next_due,
    pt.completion_count,
    CASE 
        WHEN pt.next_due < CURRENT_TIMESTAMP THEN 'OVERDUE'
        WHEN pt.next_due < CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'DUE_SOON'
        ELSE 'ON_TRACK'
    END as compliance_status
FROM pm_tasks pt
JOIN assets a ON pt.asset_id = a.id
WHERE pt.status = 'ACTIVE';

-- Asset Utilization View
CREATE VIEW asset_utilization AS
SELECT 
    a.id,
    a.name,
    a.location,
    COUNT(wo.id) as total_work_orders,
    COUNT(CASE WHEN wo.status = 'COMPLETED' THEN 1 END) as completed_work_orders,
    AVG(wo.actual_hours) as avg_work_hours,
    COALESCE(SUM(ce.amount), 0) as total_maintenance_cost
FROM assets a
LEFT JOIN work_orders wo ON a.id = wo.asset_id
LEFT JOIN cost_entries ce ON wo.id = ce.work_order_id
GROUP BY a.id, a.name, a.location;

-- =============================================================================
-- INITIAL DATA SEEDING
-- =============================================================================

-- Insert default company
INSERT INTO companies (id, name, location) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Company', 'Demo Location');

-- Insert admin user
INSERT INTO users (id, email, name, role) 
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@demo.com', 'Admin User', 'ADMIN');

-- Insert sample asset categories
-- (Additional seed data can be added here)

-- Grant permissions (adjust as needed for your deployment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chatterfix_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chatterfix_app;