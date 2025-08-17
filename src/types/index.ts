export interface Asset {
  id: string;
  name: string;
  location: string;
  status: string;
  lastMaintenance: string;
}

export interface WorkOrder {
  id: string;
  title?: string;
  description?: string;
  asset?: Asset | {
    id: string;
    name: string;
    location: string;
  };
  assetName?: string;
  location?: string;
  priority?: string;
  status: string;
  assignedTo?: string;
  createdBy?: string;
  createdAt?: string | Date;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  technician?: string;
  resolution?: string;
  downtime?: {
    started: string | null;
    ended: string | null;
    totalMinutes: number;
  };
  checkedInTechnician?: {
    name: string;
    checkedInAt: string;
  } | null;
  parts?: any[];
  attachments?: any[];
  notes?: any[];
  procedures?: string[];
  safetyNotes?: string[];
}

export interface ChatMessage {
  type: 'user' | 'ai' | 'system';
  message: string;
  timestamp: Date;
}

export interface InventoryItem {
  stock: number;
  location: string;
  cost: number;
  orderNeeded?: boolean;
}

export interface WorkOrderForm {
  assetId: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  category: string;
  requestedBy: string;
  estimatedDuration: number;
  requiredParts: string[];
  notes: string[];
}

export interface CompanyData {
  assets: Record<string, Asset>;
  inventory: Record<string, InventoryItem>;
  workOrders: WorkOrder[];
  companyInfo: {
    name: string;
    location: string;
    setupDate: string;
  };
}

export interface OcrResults {
  rawText?: string;
  extractedInfo?: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    partNumbers: string[];
    equipmentType: string;
    specifications?: {
      pressureRating: string;
      temperatureRange: string;
    };
  };
  confidence?: number;
  error?: string;
}

export interface AIConfig {
  provider: string;
  apiKey: string;
  endpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isConfigured: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'technician' | 'viewer';
  company?: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}