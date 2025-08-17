-- Migration 002: Financial Management
-- Add financial and workflow management tables

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

-- Create financial indexes
CREATE INDEX idx_cost_entries_work_order_id ON cost_entries(work_order_id);
CREATE INDEX idx_cost_entries_type ON cost_entries(type);
CREATE INDEX idx_cost_entries_created_at ON cost_entries(created_at);