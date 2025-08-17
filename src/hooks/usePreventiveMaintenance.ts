import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  api, 
  PMTask, 
  PMTaskCreate, 
  PMScheduleEntry, 
  MeterReading, 
  PMAnalytics,
  PMTaskStatus,
  PMTriggerType,
  PMFrequency,
  PMStatus
} from "../api/client";

// PM Task Management Hooks
export function usePMTasks() {
  return useQuery({
    queryKey: ["pm-tasks"],
    queryFn: () => api.get<PMTask[]>("/preventive-maintenance/tasks"),
  });
}

export function usePMTask(taskId: string) {
  return useQuery({
    queryKey: ["pm-task", taskId],
    queryFn: () => api.get<PMTask>(`/preventive-maintenance/tasks/${taskId}`),
    enabled: !!taskId,
  });
}

export function useCreatePMTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (task: PMTaskCreate) => api.post<PMTask>("/preventive-maintenance/tasks", task),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-tasks"] });
      qc.invalidateQueries({ queryKey: ["pm-schedule"] });
      qc.invalidateQueries({ queryKey: ["pm-analytics"] });
    },
  });
}

export function useUpdatePMTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, task }: { taskId: string; task: PMTaskCreate }) =>
      api.put<PMTask>(`/preventive-maintenance/tasks/${taskId}`, task),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["pm-tasks"] });
      qc.invalidateQueries({ queryKey: ["pm-task", variables.taskId] });
      qc.invalidateQueries({ queryKey: ["pm-schedule"] });
    },
  });
}

export function useDeletePMTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.delete(`/preventive-maintenance/tasks/${taskId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-tasks"] });
      qc.invalidateQueries({ queryKey: ["pm-schedule"] });
      qc.invalidateQueries({ queryKey: ["pm-analytics"] });
    },
  });
}

// PM Schedule Hooks
export function usePMSchedule(params?: {
  startDate?: string;
  endDate?: string;
  assetId?: string;
  status?: PMTaskStatus;
}) {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append("start_date", params.startDate);
  if (params?.endDate) queryParams.append("end_date", params.endDate);
  if (params?.assetId) queryParams.append("asset_id", params.assetId);
  if (params?.status) queryParams.append("status", params.status);

  return useQuery({
    queryKey: ["pm-schedule", params],
    queryFn: () => api.get<PMScheduleEntry[]>(`/preventive-maintenance/schedule?${queryParams.toString()}`),
  });
}

export function useCompletePMTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, workOrderId }: { scheduleId: string; workOrderId?: string }) =>
      api.post(`/preventive-maintenance/schedule/${scheduleId}/complete`, { workOrderId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-schedule"] });
      qc.invalidateQueries({ queryKey: ["pm-tasks"] });
      qc.invalidateQueries({ queryKey: ["pm-analytics"] });
    },
  });
}

// Meter Reading Hooks
export function useRecordMeterReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reading: MeterReading) => 
      api.post("/preventive-maintenance/meter-readings", reading),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["meter-readings", variables.assetId] });
      qc.invalidateQueries({ queryKey: ["pm-schedule"] });
    },
  });
}

export function useMeterReadings(assetId: string, meterType?: string) {
  const queryParams = new URLSearchParams();
  if (meterType) queryParams.append("meter_type", meterType);

  return useQuery({
    queryKey: ["meter-readings", assetId, meterType],
    queryFn: () => api.get(`/preventive-maintenance/meter-readings/${assetId}?${queryParams.toString()}`),
    enabled: !!assetId,
  });
}

// PM Analytics Hook
export function usePMAnalytics() {
  return useQuery({
    queryKey: ["pm-analytics"],
    queryFn: () => api.get<PMAnalytics>("/preventive-maintenance/analytics"),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

// Helper functions for PM status and formatting
export function getPMStatusColor(status: PMStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800";
    case "INACTIVE":
      return "bg-gray-100 text-gray-800";
    case "SUSPENDED":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getPMTaskStatusColor(status: PMTaskStatus): string {
  switch (status) {
    case "SCHEDULED":
      return "bg-blue-100 text-blue-800";
    case "DUE":
      return "bg-yellow-100 text-yellow-800";
    case "OVERDUE":
      return "bg-red-100 text-red-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "SKIPPED":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getPMTriggerTypeLabel(type: PMTriggerType): string {
  switch (type) {
    case "TIME_BASED":
      return "Time Based";
    case "METER_BASED":
      return "Meter Based";
    case "CONDITION_BASED":
      return "Condition Based";
    case "EVENT_BASED":
      return "Event Based";
    default:
      return type;
  }
}

export function getPMFrequencyLabel(frequency: PMFrequency): string {
  switch (frequency) {
    case "DAILY":
      return "Daily";
    case "WEEKLY":
      return "Weekly";
    case "MONTHLY":
      return "Monthly";
    case "QUARTERLY":
      return "Quarterly";
    case "SEMI_ANNUALLY":
      return "Semi-Annually";
    case "ANNUALLY":
      return "Annually";
    case "CUSTOM":
      return "Custom";
    default:
      return frequency;
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
}

export function isTaskOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

export function isDueSoon(dueDate: string, daysAhead: number = 3): boolean {
  const due = new Date(dueDate);
  const soon = new Date();
  soon.setDate(soon.getDate() + daysAhead);
  return due <= soon && due >= new Date();
}

// PM Task Templates
export const PM_TASK_TEMPLATES = [
  {
    name: "Oil Change",
    description: "Regular oil change maintenance",
    triggerType: "METER_BASED" as PMTriggerType,
    frequency: "CUSTOM" as PMFrequency,
    meterType: "hours",
    meterThreshold: 250,
    estimatedDuration: 30,
    instructions: "1. Drain old oil\n2. Replace oil filter\n3. Add new oil\n4. Check levels",
    requiredParts: ["Oil Filter", "Engine Oil"],
    requiredSkills: ["Basic Maintenance"],
    category: "routine"
  },
  {
    name: "Weekly Safety Inspection",
    description: "Weekly safety and operational check",
    triggerType: "TIME_BASED" as PMTriggerType,
    frequency: "WEEKLY" as PMFrequency,
    intervalValue: 1,
    estimatedDuration: 45,
    instructions: "1. Check safety systems\n2. Inspect for leaks\n3. Test emergency stops\n4. Document findings",
    requiredSkills: ["Safety Inspection"],
    category: "safety"
  },
  {
    name: "Monthly Calibration",
    description: "Monthly instrument calibration",
    triggerType: "TIME_BASED" as PMTriggerType,
    frequency: "MONTHLY" as PMFrequency,
    intervalValue: 1,
    estimatedDuration: 120,
    instructions: "1. Run calibration sequence\n2. Record readings\n3. Adjust if necessary\n4. Update calibration log",
    requiredSkills: ["Calibration", "Instrumentation"],
    category: "calibration"
  },
  {
    name: "Annual Overhaul",
    description: "Complete equipment overhaul and inspection",
    triggerType: "TIME_BASED" as PMTriggerType,
    frequency: "ANNUALLY" as PMFrequency,
    intervalValue: 1,
    estimatedDuration: 480,
    instructions: "1. Complete disassembly\n2. Inspect all components\n3. Replace worn parts\n4. Reassemble and test",
    requiredParts: ["Various replacement parts"],
    requiredSkills: ["Advanced Maintenance", "Mechanical"],
    category: "overhaul"
  }
];