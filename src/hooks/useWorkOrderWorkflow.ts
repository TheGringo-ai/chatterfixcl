import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApprovalRequest, ApprovalDecision, SLACreate, SLAStatus, AssignmentRule } from "../api/client";

// Workflow: Approval Hooks
export function useSubmitForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { workOrderId: string; approverIds: string[] }) =>
      api.post(`/work-orders/${payload.workOrderId}/submit-for-approval`, { approverIds: payload.approverIds }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["workOrder", vars.workOrderId] });
      qc.invalidateQueries({ queryKey: ["workOrders"] });
    },
  });
}

export function useApproveWO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { workOrderId: string; approverId: string; note?: string }) =>
      api.post(`/work-orders/${payload.workOrderId}/approve`, { 
        approverId: payload.approverId, 
        note: payload.note 
      }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["workOrder", v.workOrderId] });
      qc.invalidateQueries({ queryKey: ["workOrders"] });
    },
  });
}

export function useRejectWO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { workOrderId: string; approverId: string; note?: string }) =>
      api.post(`/work-orders/${payload.workOrderId}/reject`, { 
        approverId: payload.approverId, 
        note: payload.note 
      }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["workOrder", v.workOrderId] });
      qc.invalidateQueries({ queryKey: ["workOrders"] });
    },
  });
}

// Workflow: Auto-Assignment Hooks
export function useAutoAssignWO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workOrderId: string) => api.post(`/work-orders/${workOrderId}/auto-assign`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["workOrder", id] });
      qc.invalidateQueries({ queryKey: ["workOrders"] });
    },
  });
}

// SLA Hooks
export function useSetSLA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { workOrderId: string; name: string; respondMins: number; resolveMins: number }) =>
      api.post(`/work-orders/${payload.workOrderId}/sla`, payload),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["sla-status", v.workOrderId] });
      qc.invalidateQueries({ queryKey: ["workOrder", v.workOrderId] });
    },
  });
}

export function useSLAStatus(workOrderId: string) {
  return useQuery({
    queryKey: ["sla-status", workOrderId],
    queryFn: () => api.get<SLAStatus>(`/work-orders/${workOrderId}/sla/status`),
    enabled: !!workOrderId,
    refetchInterval: 30_000, // lightweight live SLA check every 30 seconds
    retry: false, // Don't retry if SLA is not set
  });
}

export function useSLAEscalate(workOrderId: string) {
  return useMutation({
    mutationFn: () => api.post(`/work-orders/${workOrderId}/sla/escalate-if-needed`),
  });
}

// Assignment Rules Hooks
export function useAssignmentRules() {
  return useQuery({
    queryKey: ["assignment-rules"],
    queryFn: () => api.get<AssignmentRule[]>("/assignment-rules"),
  });
}

export function useCreateAssignmentRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleData: { name: string; jsonRule: Record<string, any>; active?: boolean }) =>
      api.post<AssignmentRule>("/assignment-rules", ruleData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignment-rules"] });
    },
  });
}

// Helper functions for workflow status display
export function getApprovalStateColor(state: string): string {
  switch (state) {
    case "APPROVED":
      return "bg-green-100 text-green-800";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "REJECTED":
      return "bg-red-100 text-red-800";
    case "NOT_REQUIRED":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getWorkOrderStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    case "PENDING_APPROVAL":
      return "bg-yellow-100 text-yellow-800";
    case "APPROVED":
      return "bg-purple-100 text-purple-800";
    case "ON_HOLD":
      return "bg-orange-100 text-orange-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    case "OPEN":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getSLAUrgencyColor(minutesRemaining: number): string {
  if (minutesRemaining < 0) {
    return "text-red-600"; // Overdue
  } else if (minutesRemaining < 60) {
    return "text-orange-600"; // Less than 1 hour
  } else if (minutesRemaining < 240) {
    return "text-yellow-600"; // Less than 4 hours
  } else {
    return "text-green-600"; // Good
  }
}