from fastapi import FastAPI, HTTPException, BackgroundTasks, File, UploadFile, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from enum import Enum
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
from decimal import Decimal

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

# ==============================================================================
# FINANCIAL MANAGEMENT & WORKFLOW ENDPOINTS
# ==============================================================================

# Enums and Models
class CostType(str, Enum):
    LABOR = "LABOR"
    PART = "PART"
    SERVICE = "SERVICE"
    MISC = "MISC"

class WOStatus(str, Enum):
    OPEN = "OPEN"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    IN_PROGRESS = "IN_PROGRESS"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class WOPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ApprovalState(str, Enum):
    NOT_REQUIRED = "NOT_REQUIRED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Decision(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"

# Request/Response Models
class CostEntryCreate(BaseModel):
    workOrderId: str
    type: CostType
    amount: float = Field(gt=0)
    meta: Optional[Dict[str, Any]] = None

class CostEntryResponse(BaseModel):
    id: str
    workOrderId: str
    type: CostType
    amount: float
    meta: Optional[Dict[str, Any]] = None
    createdAt: datetime

class WorkOrderFinancials(BaseModel):
    workOrderId: str
    total: float
    entries: List[CostEntryResponse]

class FinancialSummary(BaseModel):
    total: float
    byType: Dict[str, float]

class ApprovalRequest(BaseModel):
    approverIds: List[str]

class ApprovalDecision(BaseModel):
    approverId: str
    note: Optional[str] = None

class SLACreate(BaseModel):
    name: str
    respondMins: int = Field(gt=0)
    resolveMins: int = Field(gt=0)

class SLAStatus(BaseModel):
    firstResponseDueInMins: int
    resolveDueInMins: int
    escalations: List[Dict[str, Any]]

class AssignmentRule(BaseModel):
    id: str
    name: str
    jsonRule: Dict[str, Any]
    active: bool

# In-memory storage (replace with actual database)
cost_entries = {}
work_order_approvals = {}
work_order_slas = {}
assignment_rules = [
    {
        "id": "rule1", 
        "name": "Standard Assignment", 
        "jsonRule": {"skillsAny": ["electrical", "mechanical"], "maxActive": 5, "priority": ["HIGH", "CRITICAL"]},
        "active": True
    }
]
escalations = {}

# Financial Endpoints
@app.post("/api/financials/cost-entry", response_model=CostEntryResponse)
async def create_cost_entry(cost_entry: CostEntryCreate):
    """Add a cost entry to a work order"""
    entry_id = str(uuid.uuid4())
    entry = {
        "id": entry_id,
        "workOrderId": cost_entry.workOrderId,
        "type": cost_entry.type,
        "amount": cost_entry.amount,
        "meta": cost_entry.meta,
        "createdAt": datetime.now()
    }
    
    if cost_entry.workOrderId not in cost_entries:
        cost_entries[cost_entry.workOrderId] = []
    cost_entries[cost_entry.workOrderId].append(entry)
    
    return CostEntryResponse(**entry)

@app.get("/api/financials/work-order/{work_order_id}", response_model=WorkOrderFinancials)
async def get_work_order_financials(work_order_id: str):
    """Get financial summary for a work order"""
    entries = cost_entries.get(work_order_id, [])
    total = sum(entry["amount"] for entry in entries)
    
    return WorkOrderFinancials(
        workOrderId=work_order_id,
        total=total,
        entries=[CostEntryResponse(**entry) for entry in entries]
    )

@app.get("/api/financials/analytics/summary", response_model=FinancialSummary)
async def get_financial_summary():
    """Get overall financial analytics"""
    all_entries = []
    for entries in cost_entries.values():
        all_entries.extend(entries)
    
    total = sum(entry["amount"] for entry in all_entries)
    by_type = {}
    for entry in all_entries:
        cost_type = entry["type"]
        by_type[cost_type] = by_type.get(cost_type, 0) + entry["amount"]
    
    return FinancialSummary(total=total, byType=by_type)

# Workflow: Approval Endpoints
@app.post("/api/work-orders/{work_order_id}/submit-for-approval")
async def submit_for_approval(work_order_id: str, request: ApprovalRequest):
    """Submit work order for approval"""
    approvals = []
    for approver_id in request.approverIds:
        approval = {
            "id": str(uuid.uuid4()),
            "workOrderId": work_order_id,
            "approverId": approver_id,
            "decision": None,
            "note": None,
            "decidedAt": None,
            "createdAt": datetime.now()
        }
        approvals.append(approval)
    
    work_order_approvals[work_order_id] = {
        "approvals": approvals,
        "state": ApprovalState.PENDING,
        "status": WOStatus.PENDING_APPROVAL
    }
    
    return {"workOrderId": work_order_id, "approvals": approvals, "state": ApprovalState.PENDING}

@app.post("/api/work-orders/{work_order_id}/approve")
async def approve_work_order(work_order_id: str, decision: ApprovalDecision):
    """Approve a work order"""
    if work_order_id not in work_order_approvals:
        raise HTTPException(status_code=404, detail="Work order approval not found")
    
    approval_data = work_order_approvals[work_order_id]
    
    # Find and update the approval
    updated = False
    for approval in approval_data["approvals"]:
        if approval["approverId"] == decision.approverId and approval["decision"] is None:
            approval["decision"] = Decision.APPROVE
            approval["note"] = decision.note
            approval["decidedAt"] = datetime.now()
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=400, detail="Approval not found or already decided")
    
    # Check if all approvals are complete
    remaining = sum(1 for a in approval_data["approvals"] if a["decision"] is None)
    if remaining == 0:
        approval_data["state"] = ApprovalState.APPROVED
        approval_data["status"] = WOStatus.APPROVED
    
    return {"workOrderId": work_order_id, "remaining": remaining, "approvalData": approval_data}

@app.post("/api/work-orders/{work_order_id}/reject")
async def reject_work_order(work_order_id: str, decision: ApprovalDecision):
    """Reject a work order"""
    if work_order_id not in work_order_approvals:
        raise HTTPException(status_code=404, detail="Work order approval not found")
    
    approval_data = work_order_approvals[work_order_id]
    
    # Find and update the approval
    for approval in approval_data["approvals"]:
        if approval["approverId"] == decision.approverId and approval["decision"] is None:
            approval["decision"] = Decision.REJECT
            approval["note"] = decision.note
            approval["decidedAt"] = datetime.now()
            break
    
    approval_data["state"] = ApprovalState.REJECTED
    approval_data["status"] = WOStatus.ON_HOLD
    
    return {"workOrderId": work_order_id, "approvalData": approval_data}

# Workflow: Auto-Assignment
@app.post("/api/work-orders/{work_order_id}/auto-assign")
async def auto_assign_work_order(work_order_id: str):
    """Auto-assign work order based on rules"""
    # Simplified auto-assignment logic
    # In a real system, this would query the database for available technicians
    
    # Mock technicians data
    mock_technicians = [
        {"id": "tech1", "name": "John Smith", "skills": ["electrical", "hvac"], "activeWorkOrders": 2},
        {"id": "tech2", "name": "Sarah Wilson", "skills": ["mechanical", "plumbing"], "activeWorkOrders": 1},
        {"id": "tech3", "name": "Mike Johnson", "skills": ["electrical", "mechanical"], "activeWorkOrders": 3}
    ]
    
    # Simple assignment: choose technician with least active work orders
    best_tech = min(mock_technicians, key=lambda t: t["activeWorkOrders"])
    
    assignment = {
        "workOrderId": work_order_id,
        "assignedTo": best_tech["id"],
        "assignedAt": datetime.now(),
        "status": WOStatus.IN_PROGRESS
    }
    
    return {"assignedTo": best_tech["id"], "workOrder": assignment}

# SLA Management
@app.post("/api/work-orders/{work_order_id}/sla")
async def set_work_order_sla(work_order_id: str, sla_create: SLACreate):
    """Set SLA for a work order"""
    sla = {
        "id": str(uuid.uuid4()),
        "workOrderId": work_order_id,
        "name": sla_create.name,
        "respondMins": sla_create.respondMins,
        "resolveMins": sla_create.resolveMins,
        "startedAt": datetime.now(),
        "firstResponseAt": None,
        "resolvedAt": None
    }
    
    work_order_slas[work_order_id] = sla
    
    return {"workOrderId": work_order_id, "sla": sla}

@app.get("/api/work-orders/{work_order_id}/sla/status", response_model=SLAStatus)
async def get_sla_status(work_order_id: str):
    """Get SLA status for a work order"""
    if work_order_id not in work_order_slas:
        raise HTTPException(status_code=404, detail="SLA not set for this work order")
    
    sla = work_order_slas[work_order_id]
    now = datetime.now()
    started = sla["startedAt"]
    
    respond_due = started + timedelta(minutes=sla["respondMins"])
    resolve_due = started + timedelta(minutes=sla["resolveMins"])
    
    first_response_due_mins = int((respond_due - now).total_seconds() / 60)
    resolve_due_mins = int((resolve_due - now).total_seconds() / 60)
    
    work_order_escalations = escalations.get(work_order_id, [])
    
    return SLAStatus(
        firstResponseDueInMins=first_response_due_mins,
        resolveDueInMins=resolve_due_mins,
        escalations=work_order_escalations
    )

@app.post("/api/work-orders/{work_order_id}/sla/escalate-if-needed")
async def escalate_sla_if_needed(work_order_id: str):
    """Check and escalate SLA if needed"""
    if work_order_id not in work_order_slas:
        raise HTTPException(status_code=404, detail="SLA not set for this work order")
    
    sla = work_order_slas[work_order_id]
    now = datetime.now()
    started = sla["startedAt"]
    
    respond_due = started + timedelta(minutes=sla["respondMins"])
    resolve_due = started + timedelta(minutes=sla["resolveMins"])
    
    level = 0
    if now > respond_due:
        level = max(level, 1)
    if now > resolve_due:
        level = max(level, 2)
    
    current_escalations = escalations.get(work_order_id, [])
    already_escalated = max([e.get("level", 0) for e in current_escalations], default=0)
    
    if level > already_escalated:
        escalation = {
            "id": str(uuid.uuid4()),
            "workOrderId": work_order_id,
            "level": level,
            "triggeredAt": datetime.now(),
            "note": "Response breached" if level == 1 else "Resolution breached"
        }
        
        if work_order_id not in escalations:
            escalations[work_order_id] = []
        escalations[work_order_id].append(escalation)
        
        return {"escalated": escalation}
    
    return {"escalated": None}

# Assignment Rules Management
@app.get("/api/assignment-rules", response_model=List[AssignmentRule])
async def get_assignment_rules():
    """Get all assignment rules"""
    return [AssignmentRule(**rule) for rule in assignment_rules]

@app.post("/api/assignment-rules", response_model=AssignmentRule)
async def create_assignment_rule(rule_data: Dict[str, Any]):
    """Create a new assignment rule"""
    rule = {
        "id": str(uuid.uuid4()),
        "name": rule_data.get("name", "New Rule"),
        "jsonRule": rule_data.get("jsonRule", {}),
        "active": rule_data.get("active", True),
        "createdAt": datetime.now()
    }
    
    assignment_rules.append(rule)
    return AssignmentRule(**rule)

# ==============================================================================
# PREVENTIVE MAINTENANCE SYSTEM
# ==============================================================================

# PM Enums and Models
class PMTriggerType(str, Enum):
    TIME_BASED = "TIME_BASED"
    METER_BASED = "METER_BASED"
    CONDITION_BASED = "CONDITION_BASED"
    EVENT_BASED = "EVENT_BASED"

class PMFrequency(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    SEMI_ANNUALLY = "SEMI_ANNUALLY"
    ANNUALLY = "ANNUALLY"
    CUSTOM = "CUSTOM"

class PMStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"

class PMTaskStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    DUE = "DUE"
    OVERDUE = "OVERDUE"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"

class PMTaskCreate(BaseModel):
    name: str
    description: str = ""
    assetId: str
    triggerType: PMTriggerType
    frequency: PMFrequency
    intervalValue: int = 1
    meterType: Optional[str] = None  # For meter-based: "hours", "miles", "cycles"
    meterThreshold: Optional[int] = None
    estimatedDuration: Optional[int] = 60  # in minutes
    instructions: Optional[str] = ""
    requiredParts: Optional[List[str]] = []
    requiredSkills: Optional[List[str]] = []
    priority: WOPriority = WOPriority.MEDIUM
    category: Optional[str] = "maintenance"

class PMTaskResponse(BaseModel):
    id: str
    name: str
    description: str
    assetId: str
    assetName: Optional[str] = None
    triggerType: PMTriggerType
    frequency: PMFrequency
    intervalValue: int
    meterType: Optional[str] = None
    meterThreshold: Optional[int] = None
    estimatedDuration: int
    instructions: str
    requiredParts: List[str]
    requiredSkills: List[str]
    priority: WOPriority
    category: str
    status: PMStatus
    lastCompleted: Optional[datetime] = None
    nextDue: Optional[datetime] = None
    createdAt: datetime
    completionCount: int = 0

class PMScheduleEntry(BaseModel):
    id: str
    pmTaskId: str
    pmTaskName: str
    assetId: str
    assetName: str
    scheduledDate: datetime
    dueDate: datetime
    status: PMTaskStatus
    assignedTo: Optional[str] = None
    workOrderId: Optional[str] = None
    priority: WOPriority
    estimatedDuration: int

class MeterReading(BaseModel):
    assetId: str
    meterType: str
    reading: int
    readingDate: Optional[datetime] = None
    readBy: Optional[str] = None

# In-memory storage for PM system
pm_tasks = {}
pm_schedule = {}
meter_readings = {}
pm_templates = {}

# PM Task Management
@app.post("/api/preventive-maintenance/tasks", response_model=PMTaskResponse)
async def create_pm_task(task: PMTaskCreate):
    """Create a new preventive maintenance task"""
    task_id = str(uuid.uuid4())
    
    # Calculate next due date
    next_due = calculate_next_due_date(task.frequency, task.intervalValue)
    
    pm_task = {
        "id": task_id,
        "name": task.name,
        "description": task.description,
        "assetId": task.assetId,
        "assetName": f"Asset {task.assetId}",  # Mock asset name
        "triggerType": task.triggerType,
        "frequency": task.frequency,
        "intervalValue": task.intervalValue,
        "meterType": task.meterType,
        "meterThreshold": task.meterThreshold,
        "estimatedDuration": task.estimatedDuration or 60,
        "instructions": task.instructions or "",
        "requiredParts": task.requiredParts or [],
        "requiredSkills": task.requiredSkills or [],
        "priority": task.priority,
        "category": task.category or "maintenance",
        "status": PMStatus.ACTIVE,
        "lastCompleted": None,
        "nextDue": next_due,
        "createdAt": datetime.now(),
        "completionCount": 0
    }
    
    pm_tasks[task_id] = pm_task
    
    # Generate initial schedule entry
    generate_schedule_entry(pm_task)
    
    return PMTaskResponse(**pm_task)

@app.get("/api/preventive-maintenance/tasks", response_model=List[PMTaskResponse])
async def get_pm_tasks():
    """Get all preventive maintenance tasks"""
    return [PMTaskResponse(**task) for task in pm_tasks.values()]

@app.get("/api/preventive-maintenance/tasks/{task_id}", response_model=PMTaskResponse)
async def get_pm_task(task_id: str):
    """Get a specific PM task"""
    if task_id not in pm_tasks:
        raise HTTPException(status_code=404, detail="PM task not found")
    return PMTaskResponse(**pm_tasks[task_id])

@app.put("/api/preventive-maintenance/tasks/{task_id}", response_model=PMTaskResponse)
async def update_pm_task(task_id: str, task_update: PMTaskCreate):
    """Update a preventive maintenance task"""
    if task_id not in pm_tasks:
        raise HTTPException(status_code=404, detail="PM task not found")
    
    existing_task = pm_tasks[task_id]
    
    # Update fields
    for field, value in task_update.dict(exclude_unset=True).items():
        if field in existing_task:
            existing_task[field] = value
    
    # Recalculate next due date if frequency changed
    existing_task["nextDue"] = calculate_next_due_date(
        existing_task["frequency"], 
        existing_task["intervalValue"]
    )
    
    return PMTaskResponse(**existing_task)

@app.delete("/api/preventive-maintenance/tasks/{task_id}")
async def delete_pm_task(task_id: str):
    """Delete a preventive maintenance task"""
    if task_id not in pm_tasks:
        raise HTTPException(status_code=404, detail="PM task not found")
    
    del pm_tasks[task_id]
    
    # Remove from schedule
    pm_schedule = {k: v for k, v in pm_schedule.items() if v["pmTaskId"] != task_id}
    
    return {"message": "PM task deleted successfully"}

# PM Scheduling
@app.get("/api/preventive-maintenance/schedule", response_model=List[PMScheduleEntry])
async def get_pm_schedule(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    asset_id: Optional[str] = None,
    status: Optional[PMTaskStatus] = None
):
    """Get preventive maintenance schedule"""
    schedule_entries = list(pm_schedule.values())
    
    # Filter by date range
    if start_date:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        schedule_entries = [e for e in schedule_entries if e["scheduledDate"] >= start_dt]
    
    if end_date:
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        schedule_entries = [e for e in schedule_entries if e["scheduledDate"] <= end_dt]
    
    # Filter by asset
    if asset_id:
        schedule_entries = [e for e in schedule_entries if e["assetId"] == asset_id]
    
    # Filter by status
    if status:
        schedule_entries = [e for e in schedule_entries if e["status"] == status]
    
    return [PMScheduleEntry(**entry) for entry in schedule_entries]

@app.post("/api/preventive-maintenance/schedule/{schedule_id}/complete")
async def complete_pm_task(schedule_id: str, completion_data: Dict[str, Any]):
    """Mark a scheduled PM task as completed"""
    if schedule_id not in pm_schedule:
        raise HTTPException(status_code=404, detail="Scheduled task not found")
    
    schedule_entry = pm_schedule[schedule_id]
    pm_task = pm_tasks[schedule_entry["pmTaskId"]]
    
    # Update schedule entry
    schedule_entry["status"] = PMTaskStatus.COMPLETED
    schedule_entry["workOrderId"] = completion_data.get("workOrderId")
    
    # Update PM task
    pm_task["lastCompleted"] = datetime.now()
    pm_task["completionCount"] += 1
    pm_task["nextDue"] = calculate_next_due_date(
        pm_task["frequency"], 
        pm_task["intervalValue"],
        pm_task["lastCompleted"]
    )
    
    # Generate next schedule entry
    generate_schedule_entry(pm_task)
    
    return {"message": "PM task completed", "nextDue": pm_task["nextDue"]}

# Meter Readings
@app.post("/api/preventive-maintenance/meter-readings")
async def record_meter_reading(reading: MeterReading):
    """Record a meter reading for an asset"""
    reading_id = str(uuid.uuid4())
    
    meter_reading = {
        "id": reading_id,
        "assetId": reading.assetId,
        "meterType": reading.meterType,
        "reading": reading.reading,
        "readingDate": reading.readingDate or datetime.now(),
        "readBy": reading.readBy or "system"
    }
    
    # Store reading
    if reading.assetId not in meter_readings:
        meter_readings[reading.assetId] = {}
    if reading.meterType not in meter_readings[reading.assetId]:
        meter_readings[reading.assetId][reading.meterType] = []
    
    meter_readings[reading.assetId][reading.meterType].append(meter_reading)
    
    # Check for meter-based PM triggers
    check_meter_based_triggers(reading.assetId, reading.meterType, reading.reading)
    
    return {"id": reading_id, **meter_reading}

@app.get("/api/preventive-maintenance/meter-readings/{asset_id}")
async def get_meter_readings(asset_id: str, meter_type: Optional[str] = None):
    """Get meter readings for an asset"""
    if asset_id not in meter_readings:
        return []
    
    if meter_type:
        return meter_readings[asset_id].get(meter_type, [])
    
    return meter_readings[asset_id]

# PM Analytics
@app.get("/api/preventive-maintenance/analytics")
async def get_pm_analytics():
    """Get preventive maintenance analytics"""
    total_tasks = len(pm_tasks)
    active_tasks = len([t for t in pm_tasks.values() if t["status"] == PMStatus.ACTIVE])
    
    # Schedule compliance
    due_tasks = len([s for s in pm_schedule.values() if s["status"] == PMTaskStatus.DUE])
    overdue_tasks = len([s for s in pm_schedule.values() if s["status"] == PMTaskStatus.OVERDUE])
    completed_tasks = len([s for s in pm_schedule.values() if s["status"] == PMTaskStatus.COMPLETED])
    
    # Calculate completion rate
    total_scheduled = due_tasks + overdue_tasks + completed_tasks
    completion_rate = (completed_tasks / total_scheduled * 100) if total_scheduled > 0 else 0
    
    # Task distribution by frequency
    frequency_distribution = {}
    for task in pm_tasks.values():
        freq = task["frequency"]
        frequency_distribution[freq] = frequency_distribution.get(freq, 0) + 1
    
    return {
        "totalTasks": total_tasks,
        "activeTasks": active_tasks,
        "dueTasks": due_tasks,
        "overdueTasks": overdue_tasks,
        "completedTasks": completed_tasks,
        "completionRate": round(completion_rate, 1),
        "frequencyDistribution": frequency_distribution,
        "timestamp": datetime.now().isoformat()
    }

# Helper functions
def calculate_next_due_date(frequency: PMFrequency, interval_value: int, from_date: Optional[datetime] = None) -> datetime:
    """Calculate the next due date based on frequency and interval"""
    base_date = from_date or datetime.now()
    
    if frequency == PMFrequency.DAILY:
        return base_date + timedelta(days=interval_value)
    elif frequency == PMFrequency.WEEKLY:
        return base_date + timedelta(weeks=interval_value)
    elif frequency == PMFrequency.MONTHLY:
        return base_date + timedelta(days=interval_value * 30)
    elif frequency == PMFrequency.QUARTERLY:
        return base_date + timedelta(days=interval_value * 90)
    elif frequency == PMFrequency.SEMI_ANNUALLY:
        return base_date + timedelta(days=interval_value * 180)
    elif frequency == PMFrequency.ANNUALLY:
        return base_date + timedelta(days=interval_value * 365)
    else:  # CUSTOM
        return base_date + timedelta(days=interval_value)

def generate_schedule_entry(pm_task: dict):
    """Generate a schedule entry for a PM task"""
    entry_id = str(uuid.uuid4())
    
    # Calculate due date (add buffer for scheduling)
    scheduled_date = pm_task["nextDue"]
    due_date = scheduled_date + timedelta(days=1)  # 1 day buffer
    
    schedule_entry = {
        "id": entry_id,
        "pmTaskId": pm_task["id"],
        "pmTaskName": pm_task["name"],
        "assetId": pm_task["assetId"],
        "assetName": pm_task["assetName"],
        "scheduledDate": scheduled_date,
        "dueDate": due_date,
        "status": PMTaskStatus.SCHEDULED,
        "assignedTo": None,
        "workOrderId": None,
        "priority": pm_task["priority"],
        "estimatedDuration": pm_task["estimatedDuration"]
    }
    
    pm_schedule[entry_id] = schedule_entry

def check_meter_based_triggers(asset_id: str, meter_type: str, current_reading: int):
    """Check if any meter-based PM tasks should be triggered"""
    for task in pm_tasks.values():
        if (task["assetId"] == asset_id and 
            task["triggerType"] == PMTriggerType.METER_BASED and
            task["meterType"] == meter_type and
            task["meterThreshold"] and
            current_reading >= task["meterThreshold"]):
            
            # Check if already scheduled
            existing_entry = any(
                s["pmTaskId"] == task["id"] and s["status"] in [PMTaskStatus.SCHEDULED, PMTaskStatus.DUE]
                for s in pm_schedule.values()
            )
            
            if not existing_entry:
                # Generate immediate schedule entry
                task["nextDue"] = datetime.now()
                generate_schedule_entry(task)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info",
        access_log=True
    )
