from fastapi import FastAPI, HTTPException, BackgroundTasks, File, UploadFile, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import ollama
import json
import uvicorn
import asyncio
import logging
import os
from datetime import datetime, timedelta
import uuid
import mimetypes
import io

# Document processing imports
import PyPDF2
import docx
from PIL import Image
from google.cloud import storage
from google.cloud import firestore

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ChatterFix Llama API",
    description="AI-powered maintenance management with Llama and document storage",
    version="1.0.0"
)

# CORS middleware for React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
MODEL_NAME = "llama3.2:1b"
model_loaded = False

# Google Cloud Storage setup
try:
    storage_client = storage.Client()
    firestore_client = firestore.Client()
    BUCKET_NAME = os.getenv('STORAGE_BUCKET', 'chatterfix-documents')
    logger.info("Google Cloud clients initialized successfully")
except Exception as e:
    logger.warning(f"Google Cloud initialization failed: {e}")
    storage_client = None
    firestore_client = None

def get_bucket():
    if storage_client:
        return storage_client.bucket(BUCKET_NAME)
    return None

def get_firestore_collection():
    if firestore_client:
        return firestore_client.collection('documents')
    return None

class CustomField(BaseModel):
    name: str
    type: str = Field(..., description="Field type: text, number, date, select, boolean, calculated")
    description: str
    options: Optional[List[str]] = None
    defaultValue: Optional[Any] = None
    required: bool = False

class FieldRequest(BaseModel):
    query: str
    context: str = ""
    industry: Optional[str] = "general"

class FieldResponse(BaseModel):
    fields: List[CustomField]
    reasoning: str
    timestamp: str
    processing_time: float

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = ""
    history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    response: str
    timestamp: str
    processing_time: float

# Document storage models
class DocumentMetadata(BaseModel):
    id: Optional[str] = None
    name: str
    type: str = "other"  # manual, procedure, schematic, photo, inspection, other
    category: str = "maintenance"  # maintenance, safety, operation, troubleshooting, parts, compliance
    file_type: str
    size: int
    cloud_path: Optional[str] = None
    public_url: Optional[str] = None
    uploaded_by: str
    uploaded_at: Optional[datetime] = None
    asset_ids: List[str] = []
    tags: List[str] = []
    description: str = ""
    extracted_text: Optional[str] = ""

def extract_text_from_file(file_content: bytes, content_type: str) -> str:
    """Extract text content from various file types for search indexing"""
    try:
        if content_type == 'application/pdf':
            if PyPDF2:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text
        
        elif content_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
            if docx:
                doc = docx.Document(io.BytesIO(file_content))
                text = ""
                for paragraph in doc.paragraphs:
                    text += paragraph.text + "\n"
                return text
        
        elif content_type.startswith('text/'):
            return file_content.decode('utf-8')
        
        return ""
    except Exception as e:
        logger.error(f"Text extraction error: {e}")
        return ""

async def ensure_model_loaded():
    """Ensure the Llama model is loaded and ready"""
    global model_loaded
    if not model_loaded:
        try:
            # Check if model exists
            models = ollama.list()
            if not any(model['name'].startswith(MODEL_NAME) for model in models['models']):
                logger.info(f"Downloading {MODEL_NAME}...")
                ollama.pull(MODEL_NAME)
            
            # Test the model
            test_response = ollama.chat(
                model=MODEL_NAME,
                messages=[{'role': 'user', 'content': 'Hello'}]
            )
            model_loaded = True
            logger.info(f"Model {MODEL_NAME} loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise HTTPException(status_code=503, detail=f"Model not available: {e}")

@app.on_event("startup")
async def startup_event():
    """Initialize the model on startup"""
    logger.info("Starting ChatterFix Llama API...")
    # Don't block startup, model will be loaded on first request
    pass

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Quick check if Ollama is responsive
        models = ollama.list()
        return {
            "status": "healthy",
            "model": MODEL_NAME,
            "model_loaded": model_loaded,
            "available_models": [m['name'] for m in models['models']],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {e}")

@app.post("/generate-fields", response_model=FieldResponse)
async def generate_custom_fields(request: FieldRequest):
    """Generate custom fields based on natural language request"""
    start_time = asyncio.get_event_loop().time()
    
    await ensure_model_loaded()
    
    try:
        # Create a detailed prompt for field generation
        prompt = f"""
You are an AI assistant for maintenance management systems. Create custom fields based on this request: "{request.query}"

Industry context: {request.industry}
Additional context: {request.context}

Generate 2-5 relevant custom fields. Return ONLY a valid JSON object with this exact structure:
{{
  "fields": [
    {{
      "name": "Field Name",
      "type": "text|number|date|select|boolean|calculated",
      "description": "What this field tracks",
      "options": ["option1", "option2"] (only for select type),
      "defaultValue": null,
      "required": false
    }}
  ],
  "reasoning": "Explanation of why these fields are useful for maintenance management"
}}

Available field types:
- text: Free text input
- number: Numeric values
- date: Date/time values  
- select: Dropdown with predefined options
- boolean: True/false checkbox
- calculated: Auto-calculated based on other fields

Focus on practical maintenance management needs like tracking equipment condition, maintenance schedules, costs, efficiency, safety, etc.
"""

        response = ollama.chat(
            model=MODEL_NAME,
            messages=[
                {'role': 'system', 'content': 'You are a maintenance management expert. Always return valid JSON.'},
                {'role': 'user', 'content': prompt}
            ],
            options={
                'temperature': 0.7,
                'top_p': 0.9,
                'num_predict': 1000
            }
        )
        
        content = response['message']['content'].strip()
        
        # Try to extract JSON from the response
        try:
            # Find JSON in the response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_content = content[json_start:json_end]
                result = json.loads(json_content)
            else:
                raise ValueError("No JSON found in response")
                
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse JSON response: {e}")
            # Fallback: create a simple field based on the query
            result = {
                "fields": [
                    {
                        "name": f"Custom {request.query.title()}",
                        "type": "text",
                        "description": f"Track {request.query.lower()} for maintenance management",
                        "required": False
                    }
                ],
                "reasoning": f"Created a basic field to track {request.query}. The AI response was: {content[:200]}..."
            }
        
        # Validate and convert to Pydantic models
        fields = [CustomField(**field) for field in result.get('fields', [])]
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        return FieldResponse(
            fields=fields,
            reasoning=result.get('reasoning', 'Generated based on your request'),
            timestamp=datetime.now().isoformat(),
            processing_time=round(processing_time, 2)
        )
        
    except Exception as e:
        logger.error(f"Error generating fields: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate fields: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat_with_llama(request: ChatRequest):
    """General chat endpoint for maintenance assistance"""
    start_time = asyncio.get_event_loop().time()
    
    await ensure_model_loaded()
    
    try:
        # Build conversation history
        messages = [
            {
                'role': 'system', 
                'content': 'You are an AI assistant specializing in maintenance management. Provide helpful, practical advice for equipment maintenance, work orders, inventory management, and related topics.'
            }
        ]
        
        # Add conversation history
        for msg in request.history[-5:]:  # Limit to last 5 messages
            messages.append(msg)
        
        # Add current message
        messages.append({
            'role': 'user',
            'content': f"{request.message}\n\nContext: {request.context}" if request.context else request.message
        })
        
        response = ollama.chat(
            model=MODEL_NAME,
            messages=messages,
            options={
                'temperature': 0.7,
                'top_p': 0.9,
                'num_predict': 800
            }
        )
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        return ChatResponse(
            response=response['message']['content'],
            timestamp=datetime.now().isoformat(),
            processing_time=round(processing_time, 2)
        )
        
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@app.get("/models")
async def list_models():
    """List available models"""
    try:
        models = ollama.list()
        return {
            "current_model": MODEL_NAME,
            "available_models": models['models'],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list models: {e}")

@app.post("/model/load")
async def load_model(model_name: str = MODEL_NAME):
    """Load a specific model"""
    global model_loaded, MODEL_NAME
    try:
        logger.info(f"Loading model: {model_name}")
        ollama.pull(model_name)
        MODEL_NAME = model_name
        model_loaded = True
        return {
            "status": "success",
            "model": model_name,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {e}")

# Document Storage Endpoints

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    metadata: str = Form(...)
):
    """Upload a document to Google Cloud Storage"""
    if not storage_client or not firestore_client:
        raise HTTPException(status_code=503, detail="Storage service not available")
    
    try:
        # Parse metadata
        meta_dict = json.loads(metadata)
        
        # Validate file
        if file.size and file.size > 50 * 1024 * 1024:  # 50MB limit
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
        file_extension = os.path.splitext(file.filename or "")[1]
        cloud_filename = f"documents/{file_id}{file_extension}"
        
        # Upload to Google Cloud Storage
        bucket = get_bucket()
        if not bucket:
            raise HTTPException(status_code=503, detail="Storage bucket not available")
        
        blob = bucket.blob(cloud_filename)
        blob.upload_from_string(content, content_type=file.content_type)
        blob.make_public()
        
        # Extract text content for search
        extracted_text = extract_text_from_file(content, file.content_type or "")
        
        # Create document metadata
        doc_metadata = {
            "id": file_id,
            "name": file.filename or "unnamed",
            "type": meta_dict.get('type', 'other'),
            "category": meta_dict.get('category', 'maintenance'),
            "file_type": file.content_type or 'application/octet-stream',
            "size": len(content),
            "cloud_path": cloud_filename,
            "public_url": blob.public_url,
            "uploaded_by": meta_dict.get('uploadedBy', 'unknown'),
            "uploaded_at": datetime.utcnow().isoformat(),
            "asset_ids": meta_dict.get('assetIds', []),
            "tags": meta_dict.get('tags', []),
            "description": meta_dict.get('description', ''),
            "extracted_text": extracted_text
        }
        
        # Store metadata in Firestore
        collection = get_firestore_collection()
        if collection:
            doc_ref = collection.document(file_id)
            doc_ref.set(doc_metadata)
        
        return {
            "id": file_id,
            "publicUrl": blob.public_url,
            "cloudPath": cloud_filename,
            "metadata": doc_metadata
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid metadata JSON")
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/documents")
async def get_documents(
    assetIds: Optional[str] = None,
    limit: int = 100
):
    """Get documents, optionally filtered by asset IDs"""
    if not firestore_client:
        raise HTTPException(status_code=503, detail="Database service not available")
    
    try:
        collection = get_firestore_collection()
        if not collection:
            return []
        
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
        logger.error(f"Get documents error: {e}")
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
    if not firestore_client:
        raise HTTPException(status_code=503, detail="Database service not available")
    
    try:
        collection = get_firestore_collection()
        if not collection:
            return []
        
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
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/storage/health")
async def storage_health_check():
    """Health check for storage service"""
    try:
        status = {
            "status": "healthy",
            "storage": "not_configured",
            "database": "not_configured",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if storage_client:
            bucket = get_bucket()
            if bucket and bucket.exists():
                status["storage"] = "connected"
            else:
                status["storage"] = "bucket_not_found"
        
        if firestore_client:
            collection = get_firestore_collection()
            if collection:
                list(collection.limit(1).stream())
                status["database"] = "connected"
        
        return status
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info",
        access_log=True
    )
