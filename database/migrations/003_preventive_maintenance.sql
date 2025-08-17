-- Migration 003: Preventive Maintenance
-- Add preventive maintenance system tables

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