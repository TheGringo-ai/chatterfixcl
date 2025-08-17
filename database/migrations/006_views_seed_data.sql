-- Migration 006: Views and Seed Data
-- Add reporting views and initial seed data

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

-- Financial Summary View
CREATE VIEW financial_summary AS
SELECT 
    DATE_TRUNC('month', ce.created_at) as month,
    ce.type,
    COUNT(*) as entry_count,
    SUM(ce.amount) as total_amount,
    AVG(ce.amount) as avg_amount
FROM cost_entries ce
GROUP BY DATE_TRUNC('month', ce.created_at), ce.type
ORDER BY month DESC, ce.type;

-- =============================================================================
-- INITIAL SEED DATA
-- =============================================================================

-- Insert default company
INSERT INTO companies (id, name, location) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Company', 'Demo Location')
ON CONFLICT (id) DO NOTHING;

-- Insert demo users
INSERT INTO users (id, email, name, role) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@demo.com', 'Admin User', 'ADMIN'),
('00000000-0000-0000-0000-000000000002', 'tech@demo.com', 'Demo Technician', 'TECHNICIAN'),
('00000000-0000-0000-0000-000000000003', 'manager@demo.com', 'Demo Manager', 'MANAGER')
ON CONFLICT (email) DO NOTHING;

-- Insert demo assets
INSERT INTO assets (id, asset_code, name, location, status, category, company_id) VALUES
('00000000-0000-0000-0000-000000000001', 'MV-AIS-001', 'Multivac AIS Packaging Line', 'Production Floor A', 'ACTIVE', 'PACKAGING', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000002', 'CB-003', 'Conveyor Belt #3', 'Assembly Line B', 'WARNING', 'CONVEYOR', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000003', 'HVAC-001', 'Main HVAC System', 'Building Central', 'ACTIVE', 'HVAC', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (asset_code) DO NOTHING;

-- Insert demo inventory items
INSERT INTO inventory_items (id, part_number, name, category, current_stock, min_stock, unit_cost, location, company_id) VALUES
('00000000-0000-0000-0000-000000000001', 'VPS-001', 'Vacuum Pump Seal', 'SEALS', 5, 2, 45.50, 'Shelf A-12', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000002', 'HE-001', 'Heating Element', 'ELECTRICAL', 2, 1, 120.00, 'Shelf B-08', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000003', 'SB-001', 'Sealing Bar', 'MECHANICAL', 0, 1, 89.99, 'Shelf A-15', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000004', 'CR-001', 'Conveyor Roller', 'MECHANICAL', 8, 3, 25.30, 'Shelf C-03', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (part_number) DO NOTHING;

-- Insert demo PM tasks
INSERT INTO pm_tasks (id, name, description, asset_id, trigger_type, frequency, estimated_duration, priority, created_by) VALUES
('00000000-0000-0000-0000-000000000001', 'Monthly Packaging Line Inspection', 'Comprehensive inspection of packaging line components', '00000000-0000-0000-0000-000000000001', 'TIME_BASED', 'MONTHLY', 120, 'HIGH', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000002', 'Conveyor Belt Lubrication', 'Lubricate conveyor belt bearings and check tension', '00000000-0000-0000-0000-000000000002', 'TIME_BASED', 'WEEKLY', 30, 'MEDIUM', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000003', 'HVAC Filter Replacement', 'Replace air filters in main HVAC system', '00000000-0000-0000-0000-000000000003', 'TIME_BASED', 'QUARTERLY', 45, 'MEDIUM', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Insert demo SLA templates
INSERT INTO sla_templates (id, name, respond_mins, resolve_mins, priority, company_id) VALUES
('00000000-0000-0000-0000-000000000001', 'Critical Response SLA', 15, 240, 'HIGH', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000002', 'Standard Response SLA', 60, 480, 'MEDIUM', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000003', 'Low Priority SLA', 240, 1440, 'LOW', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Insert demo budget
INSERT INTO budgets (id, name, start_date, end_date, total_amount, category, company_id) VALUES
('00000000-0000-0000-0000-000000000001', 'Annual Maintenance Budget 2024', '2024-01-01', '2024-12-31', 50000.00, 'MAINTENANCE', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;