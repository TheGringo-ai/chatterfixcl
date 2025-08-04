import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Image, Download, Eye, Tag, Search, Filter, Plus, X, File, BookOpen, Wrench, AlertTriangle } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: 'manual' | 'procedure' | 'schematic' | 'photo' | 'inspection' | 'other';
  category: 'maintenance' | 'safety' | 'operation' | 'troubleshooting' | 'parts' | 'compliance';
  fileType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  assetIds: string[];
  tags: string[];
  description: string;
  version?: string;
  isPublic: boolean;
}

interface Asset {
  id: string;
  name: string;
  model?: string;
  manufacturer?: string;
}

interface DocumentManagerProps {
  assets: Record<string, Asset>;
  onDocumentUploaded?: (document: Document) => void;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ assets, onDocumentUploaded }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [newDocTags, setNewDocTags] = useState<string>('');
  const [newDocDescription, setNewDocDescription] = useState<string>('');
  const [newDocType, setNewDocType] = useState<Document['type']>('manual');
  const [newDocCategory, setNewDocCategory] = useState<Document['category']>('maintenance');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load existing documents from API on mount
  useEffect(() => {
    const loadDocuments = async () => {
      const storageApiUrl = process.env.REACT_APP_STORAGE_API_URL || process.env.REACT_APP_LLAMA_API_URL;
      
      if (storageApiUrl) {
        try {
          const response = await fetch(`${storageApiUrl}/documents`);
          if (response.ok) {
            const docs = await response.json();
            const formattedDocs: Document[] = docs.map((doc: any) => ({
              id: doc.id,
              name: doc.name,
              type: doc.type,
              category: doc.category,
              fileType: doc.file_type,
              size: doc.size,
              url: doc.public_url,
              uploadedBy: doc.uploaded_by,
              uploadedAt: new Date(doc.uploaded_at),
              assetIds: doc.asset_ids || [],
              tags: doc.tags || [],
              description: doc.description || '',
              isPublic: true
            }));
            setDocuments(formattedDocs);
          }
        } catch (error) {
          console.error('Failed to load documents:', error);
        }
      }
    };

    loadDocuments();
  }, []);

  const documentTypes = [
    { value: 'manual', label: 'User Manual', icon: BookOpen },
    { value: 'procedure', label: 'Procedure', icon: FileText },
    { value: 'schematic', label: 'Schematic/Diagram', icon: File },
    { value: 'photo', label: 'Photo/Image', icon: Image },
    { value: 'inspection', label: 'Inspection Report', icon: Eye },
    { value: 'other', label: 'Other', icon: FileText }
  ];

  const documentCategories = [
    { value: 'maintenance', label: 'Maintenance', icon: Wrench },
    { value: 'safety', label: 'Safety', icon: AlertTriangle },
    { value: 'operation', label: 'Operation', icon: FileText },
    { value: 'troubleshooting', label: 'Troubleshooting', icon: AlertTriangle },
    { value: 'parts', label: 'Parts & Components', icon: FileText },
    { value: 'compliance', label: 'Compliance', icon: FileText }
  ];

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files.length) return;
    
    setUploadingFiles(true);
    
    try {
      const storageApiUrl = process.env.REACT_APP_STORAGE_API_URL || process.env.REACT_APP_LLAMA_API_URL;
      
      for (const file of Array.from(files)) {
        // Create FormData for upload to your existing Llama API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('metadata', JSON.stringify({
          assetIds: selectedAssets,
          type: newDocType,
          category: newDocCategory,
          tags: newDocTags.split(',').map(t => t.trim()).filter(t => t),
          description: newDocDescription,
          uploadedBy: 'Current User'
        }));

        // Upload to your existing Llama API with storage endpoints
        if (storageApiUrl) {
          try {
            const response = await fetch(`${storageApiUrl}/upload`, {
              method: 'POST',
              body: formData
            });

            if (response.ok) {
              const result = await response.json();
              const newDocument: Document = {
                id: result.id,
                name: file.name,
                type: newDocType,
                category: newDocCategory,
                fileType: file.type || 'application/octet-stream',
                size: file.size,
                url: result.publicUrl,
                uploadedBy: 'Current User',
                uploadedAt: new Date(),
                assetIds: [...selectedAssets],
                tags: newDocTags.split(',').map(t => t.trim()).filter(t => t),
                description: newDocDescription,
                isPublic: true
              };
              
              setDocuments(prev => [newDocument, ...prev]);
              onDocumentUploaded?.(newDocument);
              continue;
            }
          } catch (apiError) {
            console.warn('API upload failed, using local storage:', apiError);
          }
        }

        // Fallback to local storage for demo (when API isn't available)
        const newDocument: Document = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: newDocType,
          category: newDocCategory,
          fileType: file.type || 'application/octet-stream',
          size: file.size,
          url: URL.createObjectURL(file), // Local URL for demo
          uploadedBy: 'Current User',
          uploadedAt: new Date(),
          assetIds: [...selectedAssets],
          tags: newDocTags.split(',').map(t => t.trim()).filter(t => t),
          description: newDocDescription,
          isPublic: true
        };

        setDocuments(prev => [newDocument, ...prev]);
        onDocumentUploaded?.(newDocument);
      }

      // Reset form
      setSelectedAssets([]);
      setNewDocTags('');
      setNewDocDescription('');
      setShowUploadModal(false);
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    }
    
    setUploadingFiles(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setShowUploadModal(true);
      // Store files for when modal is configured
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || doc.type === filterType;
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    return '📁';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getLinkedAssetNames = (assetIds: string[]) => {
    return assetIds.map(id => {
      const asset = Object.values(assets).find(a => a.id === id);
      return asset?.name || id;
    }).join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Asset Documentation</h2>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Upload Documents
        </button>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Types</option>
          {documentTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Categories</option>
          {documentCategories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map(doc => (
          <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getFileIcon(doc.fileType)}</span>
                <div>
                  <h3 className="font-semibold text-gray-800 truncate">{doc.name}</h3>
                  <p className="text-sm text-gray-500">{formatFileSize(doc.size)}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedDocument(doc)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                  title="View Details"
                >
                  <Eye size={16} />
                </button>
                <a
                  href={doc.url}
                  download={doc.name}
                  className="p-1 text-gray-400 hover:text-green-600"
                  title="Download"
                >
                  <Download size={16} />
                </a>
              </div>
            </div>
            
            <div className="mb-2">
              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                doc.type === 'manual' ? 'bg-blue-100 text-blue-800' :
                doc.type === 'procedure' ? 'bg-green-100 text-green-800' :
                doc.type === 'schematic' ? 'bg-purple-100 text-purple-800' :
                doc.type === 'photo' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {documentTypes.find(t => t.value === doc.type)?.label}
              </span>
            </div>
            
            {doc.description && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{doc.description}</p>
            )}
            
            {doc.assetIds.length > 0 && (
              <p className="text-xs text-gray-500 mb-2">
                <strong>Assets:</strong> {getLinkedAssetNames(doc.assetIds)}
              </p>
            )}
            
            {doc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {doc.tags.map(tag => (
                  <span key={tag} className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-500 mb-4">Upload some documents to get started</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Upload First Document
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Upload Documents</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4 hover:border-blue-400 transition-colors"
            >
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-lg mb-2">Drag and drop files here</p>
              <p className="text-gray-500 mb-4">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                disabled={uploadingFiles}
              >
                {uploadingFiles ? 'Uploading...' : 'Browse Files'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value as Document['type'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value as Document['category'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {documentCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Link to Assets</label>
              <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                {Object.values(assets).map(asset => (
                  <label key={asset.id} className="flex items-center gap-2 p-1">
                    <input
                      type="checkbox"
                      checked={selectedAssets.includes(asset.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAssets(prev => [...prev, asset.id]);
                        } else {
                          setSelectedAssets(prev => prev.filter(id => id !== asset.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{asset.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={newDocDescription}
                onChange={(e) => setNewDocDescription(e.target.value)}
                placeholder="Brief description of the document..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
              <input
                type="text"
                value={newDocTags}
                onChange={(e) => setNewDocTags(e.target.value)}
                placeholder="maintenance, safety, installation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={uploadingFiles}
              >
                Cancel
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                disabled={uploadingFiles}
              >
                {uploadingFiles ? 'Uploading...' : 'Select Files'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{selectedDocument.name}</h3>
              <button
                onClick={() => setSelectedDocument(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Type:</strong> {documentTypes.find(t => t.value === selectedDocument.type)?.label}
                </div>
                <div>
                  <strong>Category:</strong> {documentCategories.find(c => c.value === selectedDocument.category)?.label}
                </div>
                <div>
                  <strong>Size:</strong> {formatFileSize(selectedDocument.size)}
                </div>
                <div>
                  <strong>Uploaded:</strong> {selectedDocument.uploadedAt.toLocaleDateString()}
                </div>
              </div>

              {selectedDocument.description && (
                <div>
                  <strong>Description:</strong>
                  <p className="mt-1 text-gray-600">{selectedDocument.description}</p>
                </div>
              )}

              {selectedDocument.assetIds.length > 0 && (
                <div>
                  <strong>Linked Assets:</strong>
                  <p className="mt-1 text-gray-600">{getLinkedAssetNames(selectedDocument.assetIds)}</p>
                </div>
              )}

              {selectedDocument.tags.length > 0 && (
                <div>
                  <strong>Tags:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedDocument.tags.map(tag => (
                      <span key={tag} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <a
                  href={selectedDocument.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Eye size={16} />
                  View Document
                </a>
                <a
                  href={selectedDocument.url}
                  download={selectedDocument.name}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Download size={16} />
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;
