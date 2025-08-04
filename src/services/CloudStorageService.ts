// Cloud Storage Service for ChatterFix Document Management
// This service handles file uploads to Google Cloud Storage

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadOptions {
  assetIds: string[];
  type: string;
  category: string;
  tags: string[];
  description: string;
  onProgress?: (progress: UploadProgress) => void;
}

interface CloudDocument {
  id: string;
  name: string;
  type: string;
  category: string;
  fileType: string;
  size: number;
  url: string;
  cloudPath: string;
  uploadedBy: string;
  uploadedAt: Date;
  assetIds: string[];
  tags: string[];
  description: string;
  metadata?: Record<string, any>;
}

class CloudStorageService {
  private baseUrl: string;
  private projectId: string;
  private bucketName: string;

  constructor() {
    // Configuration for Google Cloud Storage
    this.baseUrl = process.env.REACT_APP_STORAGE_API_URL || 'http://localhost:8080';
    this.projectId = process.env.REACT_APP_GCP_PROJECT_ID || 'your-project-id';
    this.bucketName = process.env.REACT_APP_STORAGE_BUCKET || 'chatterfix-documents';
  }

  /**
   * Upload a file to cloud storage
   */
  async uploadFile(file: File, options: UploadOptions): Promise<CloudDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify({
      assetIds: options.assetIds,
      type: options.type,
      category: options.category,
      tags: options.tags,
      description: options.description,
      originalName: file.name,
      uploadedBy: 'current-user', // Get from auth context
      uploadedAt: new Date().toISOString()
    }));

    try {
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
        // Add authorization headers here if needed
        headers: {
          'X-Project-ID': this.projectId,
          'X-Bucket': this.bucketName
        }
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        id: result.id,
        name: file.name,
        type: options.type,
        category: options.category,
        fileType: file.type,
        size: file.size,
        url: result.publicUrl,
        cloudPath: result.cloudPath,
        uploadedBy: 'current-user',
        uploadedAt: new Date(),
        assetIds: options.assetIds,
        tags: options.tags,
        description: options.description,
        metadata: result.metadata
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files: File[], options: UploadOptions): Promise<CloudDocument[]> {
    const uploadPromises = Array.from(files).map(file => 
      this.uploadFile(file, options)
    );
    
    return Promise.all(uploadPromises);
  }

  /**
   * Get documents for specific assets
   */
  async getDocumentsForAssets(assetIds: string[]): Promise<CloudDocument[]> {
    try {
      const queryParams = new URLSearchParams({
        assetIds: assetIds.join(','),
        limit: '100'
      });

      const response = await fetch(`${this.baseUrl}/documents?${queryParams}`, {
        headers: {
          'X-Project-ID': this.projectId,
          'X-Bucket': this.bucketName
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(query: {
    search?: string;
    type?: string;
    category?: string;
    assetIds?: string[];
    tags?: string[];
  }): Promise<CloudDocument[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (query.search) queryParams.append('search', query.search);
      if (query.type) queryParams.append('type', query.type);
      if (query.category) queryParams.append('category', query.category);
      if (query.assetIds?.length) queryParams.append('assetIds', query.assetIds.join(','));
      if (query.tags?.length) queryParams.append('tags', query.tags.join(','));

      const response = await fetch(`${this.baseUrl}/search?${queryParams}`, {
        headers: {
          'X-Project-ID': this.projectId,
          'X-Bucket': this.bucketName
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'X-Project-ID': this.projectId,
          'X-Bucket': this.bucketName
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }

  /**
   * Generate a signed URL for secure file access
   */
  async getSignedUrl(documentId: string, expiresInMinutes: number = 60): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}/signed-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': this.projectId,
          'X-Bucket': this.bucketName
        },
        body: JSON.stringify({ expiresInMinutes })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate signed URL: ${response.status}`);
      }

      const result = await response.json();
      return result.signedUrl;
    } catch (error) {
      console.error('Signed URL error:', error);
      throw error;
    }
  }

  /**
   * Extract text content from documents (PDFs, Word docs) for search
   */
  async extractTextContent(documentId: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}/extract-text`, {
        method: 'POST',
        headers: {
          'X-Project-ID': this.projectId,
          'X-Bucket': this.bucketName
        }
      });

      if (!response.ok) {
        throw new Error(`Text extraction failed: ${response.status}`);
      }

      const result = await response.json();
      return result.extractedText;
    } catch (error) {
      console.error('Text extraction error:', error);
      return '';
    }
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(documentId: string, updates: Partial<CloudDocument>): Promise<CloudDocument> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-ID': this.projectId,
          'X-Bucket': this.bucketName
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Update error:', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byCategory: Record<string, { count: number; size: number }>;
    byType: Record<string, { count: number; size: number }>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        headers: {
          'X-Project-ID': this.projectId,
          'X-Bucket': this.bucketName
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Stats error:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        byCategory: {},
        byType: {}
      };
    }
  }
}

// Singleton instance
export const cloudStorageService = new CloudStorageService();

// Utility functions for file handling
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv'
  ];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 50MB limit' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not supported' };
  }

  return { valid: true };
};

export const getFileTypeIcon = (mimeType: string): string => {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('text')) return '📃';
  return '📁';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default CloudStorageService;
