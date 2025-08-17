/**
 * Firestore API Client for ChatterFix CMMS
 * Handles both online API calls and offline Firestore sync
 */

// API Base URL from environment
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080/api';

// Generic API client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const apiClient = new ApiClient(API_BASE);

// Asset API
export const assetApi = {
  getAll: () => apiClient.get<any[]>('/assets'),
  getById: (id: string) => apiClient.get<any>(`/assets/${id}`),
  create: (asset: any) => apiClient.post<any>('/assets', asset),
  update: (id: string, asset: any) => apiClient.put<any>(`/assets/${id}`, asset),
};

// Work Order API
export const workOrderApi = {
  getAll: () => apiClient.get<any[]>('/work-orders'),
  getById: (id: string) => apiClient.get<any>(`/work-orders/${id}`),
  create: (workOrder: any) => apiClient.post<any>('/work-orders', workOrder),
  update: (id: string, workOrder: any) => apiClient.put<any>(`/work-orders/${id}`, workOrder),
};

// PM Task API
export const pmTaskApi = {
  getAll: () => apiClient.get<any[]>('/pm-tasks'),
  getById: (id: string) => apiClient.get<any>(`/pm-tasks/${id}`),
  create: (pmTask: any) => apiClient.post<any>('/pm-tasks', pmTask),
  update: (id: string, pmTask: any) => apiClient.put<any>(`/pm-tasks/${id}`, pmTask),
};

// Financial API
export const financialApi = {
  getSummary: () => apiClient.get<any>('/financials/summary'),
};

// Health check
export const healthApi = {
  check: () => apiClient.get<{status: string, database: string}>('/health'),
};

export default apiClient;