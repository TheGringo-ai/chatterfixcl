import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Eye, Trash2, Download, FileImage } from 'lucide-react';

interface PhotoAttachment {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  uploadedAt: string;
  uploadedBy: string;
  size: number;
  type: string;
  description?: string;
}

interface PhotoUploadProps {
  workOrderId: string;
  attachments?: PhotoAttachment[];
  onPhotosChange?: (attachments: PhotoAttachment[]) => void;
  maxPhotos?: number;
  maxFileSize?: number; // in MB
  readOnly?: boolean;
  currentUser?: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  workOrderId,
  attachments = [],
  onPhotosChange,
  maxPhotos = 10,
  maxFileSize = 10,
  readOnly = false,
  currentUser = 'Current Technician'
}) => {
  const [photos, setPhotos] = useState<PhotoAttachment[]>(attachments);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoAttachment | null>(null);
  const [photoDescription, setPhotoDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || readOnly) return;

    const newPhotos: PhotoAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file.`);
        continue;
      }

      // Validate file size
      if (file.size > maxFileSize * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is ${maxFileSize}MB.`);
        continue;
      }

      // Check if we've reached the max photos limit
      if (photos.length + newPhotos.length >= maxPhotos) {
        alert(`Maximum ${maxPhotos} photos allowed.`);
        break;
      }

      // Create photo object
      const photoId = `photo_${Date.now()}_${i}`;
      const photoUrl = URL.createObjectURL(file);
      
      const photo: PhotoAttachment = {
        id: photoId,
        name: file.name,
        url: photoUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser,
        size: file.size,
        type: file.type,
        description: ''
      };

      newPhotos.push(photo);
    }

    if (newPhotos.length > 0) {
      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      onPhotosChange?.(updatedPhotos);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removePhoto = (photoId: string) => {
    const updatedPhotos = photos.filter(photo => photo.id !== photoId);
    setPhotos(updatedPhotos);
    onPhotosChange?.(updatedPhotos);
    
    // Clean up object URL to prevent memory leaks
    const photo = photos.find(p => p.id === photoId);
    if (photo && photo.url.startsWith('blob:')) {
      URL.revokeObjectURL(photo.url);
    }
  };

  const updatePhotoDescription = (photoId: string, description: string) => {
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId ? { ...photo, description } : photo
    );
    setPhotos(updatedPhotos);
    onPhotosChange?.(updatedPhotos);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!readOnly && photos.length < maxPhotos && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="space-y-4">
            <div className="flex justify-center space-x-4">
              <Camera className="w-12 h-12 text-gray-400" />
              <Upload className="w-12 h-12 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">Add Photos to Work Order</p>
              <p className="text-sm text-gray-500">
                Drag and drop images here, or click to select files
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Max {maxPhotos} photos, {maxFileSize}MB per file
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Select Files</span>
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Attached Photos ({photos.length})
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                {/* Photo Preview */}
                <div className="relative aspect-video bg-gray-100">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedPhoto(photo)}
                  />
                  {!readOnly && (
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedPhoto(photo)}
                    className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                {/* Photo Details */}
                <div className="p-3 space-y-2">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {photo.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(photo.size)} • {formatDate(photo.uploadedAt)}
                  </div>
                  <div className="text-xs text-gray-500">
                    By: {photo.uploadedBy}
                  </div>
                  
                  {/* Description Input */}
                  {!readOnly && (
                    <textarea
                      placeholder="Add description..."
                      value={photo.description || ''}
                      onChange={(e) => updatePhotoDescription(photo.id, e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 resize-none"
                      rows={2}
                    />
                  )}
                  {readOnly && photo.description && (
                    <p className="text-xs text-gray-600">{photo.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full bg-white rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedPhoto.name}</h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedPhoto.size)} • {formatDate(selectedPhoto.uploadedAt)} • By: {selectedPhoto.uploadedBy}
                </p>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="max-h-96 overflow-auto">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.name}
                className="w-full h-auto"
              />
            </div>
            
            {selectedPhoto.description && (
              <div className="p-4 border-t bg-gray-50">
                <p className="text-sm text-gray-700">{selectedPhoto.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Uploading photos...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
