import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, CostType, WorkOrderFinancials, FinancialSummary, CostEntry } from "../api/client";

// Re-export types
export type { CostType } from "../api/client";

// Financial Hooks
export function useWorkOrderFinancials(workOrderId: string) {
  return useQuery({
    queryKey: ["financials", workOrderId],
    queryFn: () => api.get<WorkOrderFinancials>(`/financials/work-order/${workOrderId}`),
    enabled: !!workOrderId,
  });
}

export function useAddCostEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { workOrderId: string; type: CostType; amount: number; meta?: any }) =>
      api.post<CostEntry>("/financials/cost-entry", payload),
    onSuccess: (data: CostEntry) => {
      qc.invalidateQueries({ queryKey: ["financials", data.workOrderId] });
      qc.invalidateQueries({ queryKey: ["financials-summary"] });
    },
  });
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: ["financials-summary"],
    queryFn: () => api.get<FinancialSummary>("/financials/analytics/summary"),
  });
}

// Helper function for cost type display
export function getCostTypeLabel(type: CostType): string {
  switch (type) {
    case "LABOR":
      return "Labor";
    case "PART":
      return "Parts";
    case "SERVICE":
      return "Service";
    case "MISC":
      return "Miscellaneous";
    default:
      return type;
  }
}

// Helper function for cost type color
export function getCostTypeColor(type: CostType): string {
  switch (type) {
    case "LABOR":
      return "bg-blue-100 text-blue-800";
    case "PART":
      return "bg-green-100 text-green-800";
    case "SERVICE":
      return "bg-purple-100 text-purple-800";
    case "MISC":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}