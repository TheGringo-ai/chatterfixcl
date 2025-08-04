# Document Storage API for ChatterFix
# Add this to your existing FastAPI application (main.py)

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage
from google.cloud import firestore
import uuid
import json
import mimetypes
from datetime import datetime, timedelta
from typing import List, Optional
import os
import PyPDF2
import docx
from PIL import Image
import io

# Add to your existing main.py imports and setup

app = FastAPI()

# Google Cloud Storage setup
storage_client = storage.Client()
firestore_client = firestore.Client()
BUCKET_NAME = os.getenv('STORAGE_BUCKET', 'chatterfix-documents')

def get_bucket():
    return storage_client.bucket(BUCKET_NAME)

def get_firestore_collection():
    return firestore_client.collection('documents')

# Document model
class DocumentMetadata:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', str(uuid.uuid4()))
        self.name = kwargs.get('name', '')
        self.type = kwargs.get('type', 'other')
        self.category = kwargs.get('category', 'maintenance')
        self.file_type = kwargs.get('file_type', '')
        self.size = kwargs.get('size', 0)
        self.cloud_path = kwargs.get('cloud_path', '')
        self.public_url = kwargs.get('public_url', '')
        self.uploaded_by = kwargs.get('uploaded_by', '')
        self.uploaded_at = kwargs.get('uploaded_at', datetime.utcnow())
        self.asset_ids = kwargs.get('asset_ids', [])
        self.tags = kwargs.get('tags', [])
        self.description = kwargs.get('description', '')
        self.extracted_text = kwargs.get('extracted_text', '')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'category': self.category,
            'file_type': self.file_type,
            'size': self.size,
            'cloud_path': self.cloud_path,
            'public_url': self.public_url,
            'uploaded_by': self.uploaded_by,
            'uploaded_at': self.uploaded_at.isoformat(),
            'asset_ids': self.asset_ids,
            'tags': self.tags,
            'description': self.description,
            'extracted_text': self.extracted_text
        }

def extract_text_from_file(file_content: bytes, content_type: str) -> str:
    """Extract text content from various file types for search indexing"""
    try:
        if content_type == 'application/pdf':
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        
        elif content_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
            doc = docx.Document(io.BytesIO(file_content))
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        
        elif content_type.startswith('text/'):
            return file_content.decode('utf-8')
        
        elif content_type.startswith('image/'):
            # For images, you could integrate OCR here (Google Vision API)
            return ""
        
        return ""
    except Exception as e:
        print(f"Text extraction error: {e}")
        return ""

# Add these endpoints to your existing FastAPI app

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    metadata: str = Form(...)
):
    """Upload a document to Google Cloud Storage"""
    try:
        # Parse metadata
        meta_dict = json.loads(metadata)
        
        # Validate file
        if file.size > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(status_code=400, detail="File too large (max 50MB)")
        
        allowed_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'text/plain', 'text/csv'
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="File type not supported")
        
        # Read file content
        content = await file.read()
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        cloud_filename = f"documents/{file_id}{file_extension}"
        
        # Upload to Google Cloud Storage
        bucket = get_bucket()
        blob = bucket.blob(cloud_filename)
        blob.upload_from_string(content, content_type=file.content_type)
        
        # Make blob publicly readable (optional - you can use signed URLs instead)
        blob.make_public()
        
        # Extract text content for search
        extracted_text = extract_text_from_file(content, file.content_type)
        
        # Create document metadata
        doc_metadata = DocumentMetadata(
            id=file_id,
            name=file.filename,
            type=meta_dict.get('type', 'other'),
            category=meta_dict.get('category', 'maintenance'),
            file_type=file.content_type,
            size=file.size,
            cloud_path=cloud_filename,
            public_url=blob.public_url,
            uploaded_by=meta_dict.get('uploadedBy', 'unknown'),
            asset_ids=meta_dict.get('assetIds', []),
            tags=meta_dict.get('tags', []),
            description=meta_dict.get('description', ''),
            extracted_text=extracted_text
        )
        
        # Store metadata in Firestore
        doc_ref = get_firestore_collection().document(file_id)
        doc_ref.set(doc_metadata.to_dict())
        
        return {
            "id": file_id,
            "publicUrl": blob.public_url,
            "cloudPath": cloud_filename,
            "metadata": doc_metadata.to_dict()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/documents")
async def get_documents(
    assetIds: Optional[str] = None,
    limit: int = 100
):
    """Get documents, optionally filtered by asset IDs"""
    try:
        collection = get_firestore_collection()
        query = collection.limit(limit)
        
        if assetIds:
            asset_id_list = assetIds.split(',')
            query = query.where('asset_ids', 'array_contains_any', asset_id_list)
        
        docs = query.stream()
        documents = []
        
        for doc in docs:
            doc_data = doc.to_dict()
            documents.append(doc_data)
        
        return documents
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {str(e)}")

@app.get("/search")
async def search_documents(
    search: Optional[str] = None,
    type: Optional[str] = None,
    category: Optional[str] = None,
    assetIds: Optional[str] = None,
    tags: Optional[str] = None
):
    """Search documents with various filters"""
    try:
        collection = get_firestore_collection()
        query = collection
        
        # Apply filters
        if type:
            query = query.where('type', '==', type)
        if category:
            query = query.where('category', '==', category)
        if assetIds:
            asset_id_list = assetIds.split(',')
            query = query.where('asset_ids', 'array_contains_any', asset_id_list)
        if tags:
            tag_list = tags.split(',')
            query = query.where('tags', 'array_contains_any', tag_list)
        
        docs = query.stream()
        documents = []
        
        for doc in docs:
            doc_data = doc.to_dict()
            
            # Text search in name, description, and extracted content
            if search:
                search_lower = search.lower()
                searchable_text = f"{doc_data.get('name', '')} {doc_data.get('description', '')} {doc_data.get('extracted_text', '')}".lower()
                if search_lower not in searchable_text:
                    continue
            
            documents.append(doc_data)
        
        return documents
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document from storage and database"""
    try:
        # Get document metadata
        doc_ref = get_firestore_collection().document(document_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_data = doc.to_dict()
        
        # Delete from Cloud Storage
        bucket = get_bucket()
        blob = bucket.blob(doc_data['cloud_path'])
        blob.delete()
        
        # Delete from Firestore
        doc_ref.delete()
        
        return {"message": "Document deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@app.post("/documents/{document_id}/signed-url")
async def generate_signed_url(
    document_id: str,
    expires_in_minutes: int = 60
):
    """Generate a signed URL for secure document access"""
    try:
        # Get document metadata
        doc_ref = get_firestore_collection().document(document_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_data = doc.to_dict()
        
        # Generate signed URL
        bucket = get_bucket()
        blob = bucket.blob(doc_data['cloud_path'])
        
        signed_url = blob.generate_signed_url(
            expiration=datetime.utcnow() + timedelta(minutes=expires_in_minutes),
            method='GET'
        )
        
        return {"signedUrl": signed_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {str(e)}")

@app.post("/documents/{document_id}/extract-text")
async def extract_document_text(document_id: str):
    """Extract text content from a document for search indexing"""
    try:
        # Get document metadata
        doc_ref = get_firestore_collection().document(document_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_data = doc.to_dict()
        
        # Download file from Cloud Storage
        bucket = get_bucket()
        blob = bucket.blob(doc_data['cloud_path'])
        content = blob.download_as_bytes()
        
        # Extract text
        extracted_text = extract_text_from_file(content, doc_data['file_type'])
        
        # Update document with extracted text
        doc_ref.update({'extracted_text': extracted_text})
        
        return {"extractedText": extracted_text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")

@app.patch("/documents/{document_id}")
async def update_document_metadata(
    document_id: str,
    updates: dict
):
    """Update document metadata"""
    try:
        doc_ref = get_firestore_collection().document(document_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Filter allowed updates
        allowed_fields = ['name', 'type', 'category', 'asset_ids', 'tags', 'description']
        filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
        
        if filtered_updates:
            doc_ref.update(filtered_updates)
        
        # Return updated document
        updated_doc = doc_ref.get().to_dict()
        return updated_doc
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@app.get("/stats")
async def get_storage_stats():
    """Get storage usage statistics"""
    try:
        collection = get_firestore_collection()
        docs = collection.stream()
        
        stats = {
            'totalFiles': 0,
            'totalSize': 0,
            'byCategory': {},
            'byType': {}
        }
        
        for doc in docs:
            doc_data = doc.to_dict()
            stats['totalFiles'] += 1
            stats['totalSize'] += doc_data.get('size', 0)
            
            # By category
            category = doc_data.get('category', 'unknown')
            if category not in stats['byCategory']:
                stats['byCategory'][category] = {'count': 0, 'size': 0}
            stats['byCategory'][category]['count'] += 1
            stats['byCategory'][category]['size'] += doc_data.get('size', 0)
            
            # By type
            doc_type = doc_data.get('type', 'unknown')
            if doc_type not in stats['byType']:
                stats['byType'][doc_type] = {'count': 0, 'size': 0}
            stats['byType'][doc_type]['count'] += 1
            stats['byType'][doc_type]['size'] += doc_data.get('size', 0)
        
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

# Health check endpoint (add if not already present)
@app.get("/storage/health")
async def storage_health_check():
    """Health check for storage service"""
    try:
        # Test Cloud Storage connection
        bucket = get_bucket()
        bucket.exists()
        
        # Test Firestore connection
        collection = get_firestore_collection()
        list(collection.limit(1).stream())
        
        return {
            "status": "healthy",
            "storage": "connected",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
