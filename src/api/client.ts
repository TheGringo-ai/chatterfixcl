export const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: any) => request<T>(p, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(p: string, body?: any) => request<T>(p, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  delete: <T>(p: string) => request<T>(p, { method: "DELETE" }),
};

// Type definitions
export type CostType = "LABOR" | "PART" | "SERVICE" | "MISC";

export interface CostEntry {
  id: string;
  workOrderId: string;
  type: CostType;
  amount: number;
  meta?: Record<string, any>;
  createdAt: string;
}

export interface WorkOrderFinancials {
  workOrderId: string;
  total: number;
  entries: CostEntry[];
}

export interface FinancialSummary {
  total: number;
  byType: Record<string, number>;
}

export interface ApprovalRequest {
  approverIds: string[];
}

export interface ApprovalDecision {
  approverId: string;
  note?: string;
}

export interface SLACreate {
  name: string;
  respondMins: number;
  resolveMins: number;
}

export interface SLAStatus {
  firstResponseDueInMins: number;
  resolveDueInMins: number;
  escalations: Array<Record<string, any>>;
}

export interface AssignmentRule {
  id: string;
  name: string;
  jsonRule: Record<string, any>;
  active: boolean;
}

// Preventive Maintenance Types
export type PMTriggerType = "TIME_BASED" | "METER_BASED" | "CONDITION_BASED" | "EVENT_BASED";
export type PMFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMI_ANNUALLY" | "ANNUALLY" | "CUSTOM";
export type PMStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type PMTaskStatus = "SCHEDULED" | "DUE" | "OVERDUE" | "COMPLETED" | "SKIPPED";

export interface PMTaskCreate {
  name: string;
  description?: string;
  assetId: string;
  triggerType: PMTriggerType;
  frequency: PMFrequency;
  intervalValue?: number;
  meterType?: string;
  meterThreshold?: number;
  estimatedDuration?: number;
  instructions?: string;
  requiredParts?: string[];
  requiredSkills?: string[];
  priority?: string;
  category?: string;
}

export interface PMTask {
  id: string;
  name: string;
  description: string;
  assetId: string;
  assetName?: string;
  triggerType: PMTriggerType;
  frequency: PMFrequency;
  intervalValue: number;
  meterType?: string;
  meterThreshold?: number;
  estimatedDuration: number;
  instructions: string;
  requiredParts: string[];
  requiredSkills: string[];
  priority: string;
  category: string;
  status: PMStatus;
  lastCompleted?: string;
  nextDue?: string;
  createdAt: string;
  completionCount: number;
}

export interface PMScheduleEntry {
  id: string;
  pmTaskId: string;
  pmTaskName: string;
  assetId: string;
  assetName: string;
  scheduledDate: string;
  dueDate: string;
  status: PMTaskStatus;
  assignedTo?: string;
  workOrderId?: string;
  priority: string;
  estimatedDuration: number;
}

export interface MeterReading {
  assetId: string;
  meterType: string;
  reading: number;
  readingDate?: string;
  readBy?: string;
}

export interface PMAnalytics {
  totalTasks: number;
  activeTasks: number;
  dueTasks: number;
  overdueTasks: number;
  completedTasks: number;
  completionRate: number;
  frequencyDistribution: Record<string, number>;
  timestamp: string;
}