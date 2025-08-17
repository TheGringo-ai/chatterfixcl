"""
Updated ChatterFix CMMS API with PostgreSQL database integration
Production-ready FastAPI backend with async database operations
"""

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
from contextlib import asynccontextmanager

# Document processing imports
import PyPDF2
import docx
from PIL import Image
from google.cloud import storage
from google.cloud import firestore

# Database imports
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from database.config import db_manager, startup_database, shutdown_database
from database.repositories import (
    WorkOrderRepository, CostEntryRepository, PMTaskRepository, 
    PMScheduleRepository, AssetRepository, UserRepository, AnalyticsRepository
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting ChatterFix CMMS API with database...")
    await startup_database()
    logger.info("Database initialized successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ChatterFix CMMS API...")
    await shutdown_database()
    logger.info("Database connections closed")

app = FastAPI(
    title="ChatterFix CMMS API",
    description="AI-powered maintenance management with PostgreSQL backend",
    version="2.0.0",
    lifespan=lifespan
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
MODEL_NAME = os.getenv("DEFAULT_MODEL", "llama3.2:1b")
model_loaded = False

# Initialize repositories
work_order_repo = WorkOrderRepository(db_manager)
cost_entry_repo = CostEntryRepository(db_manager)
pm_task_repo = PMTaskRepository(db_manager)
pm_schedule_repo = PMScheduleRepository(db_manager)
asset_repo = AssetRepository(db_manager)
user_repo = UserRepository(db_manager)
analytics_repo = AnalyticsRepository(db_manager)

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

# =============================================================================
# PYDANTIC MODELS (Updated for database integration)
# =============================================================================

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
    type: str = "other"
    category: str = "maintenance"
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

# Financial and Workflow Models
class CostType(str, Enum):
    LABOR = "LABOR"
    PART = "PART"
    SERVICE = "SERVICE"
    MISC = "MISC"

class CostEntryCreate(BaseModel):
    work_order_id: str
    type: CostType
    amount: float
    description: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

class CostEntryResponse(BaseModel):
    id: str
    work_order_id: str
    type: str
    amount: float
    description: Optional[str]
    meta: Optional[Dict[str, Any]]
    created_at: datetime

class WorkOrderFinancials(BaseModel):
    work_order_id: str
    total: float
    entries: List[CostEntryResponse]

class FinancialSummary(BaseModel):
    total: float
    by_type: Dict[str, float]

# Preventive Maintenance Models
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
    description: Optional[str] = None
    asset_id: str
    trigger_type: PMTriggerType
    frequency: PMFrequency
    interval_value: Optional[int] = 1
    meter_type: Optional[str] = None
    meter_threshold: Optional[int] = None
    estimated_duration: Optional[int] = 60
    instructions: Optional[str] = None
    required_parts: Optional[List[str]] = []
    required_skills: Optional[List[str]] = []
    priority: Optional[str] = "MEDIUM"
    category: Optional[str] = None

class PMTaskResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    asset_id: str
    asset_name: Optional[str]
    trigger_type: str
    frequency: str
    interval_value: int
    meter_type: Optional[str]
    meter_threshold: Optional[int]
    estimated_duration: int
    instructions: Optional[str]
    required_parts: List[str]
    required_skills: List[str]
    priority: str
    category: Optional[str]
    status: str
    last_completed: Optional[datetime]
    next_due: Optional[datetime]
    created_at: datetime
    completion_count: int

class PMScheduleEntry(BaseModel):
    id: str
    pm_task_id: str
    pm_task_name: str
    asset_id: str
    asset_name: str
    scheduled_date: datetime
    due_date: datetime
    status: str
    assigned_to: Optional[str]
    work_order_id: Optional[str]
    priority: str
    estimated_duration: int

class MeterReading(BaseModel):
    asset_id: str
    meter_type: str
    reading: float
    reading_date: Optional[datetime] = None
    read_by: Optional[str] = None

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

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

# =============================================================================
# HEALTH AND UTILITY ENDPOINTS
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check database health
        db_healthy = await db_manager.health_check()
        
        # Check Ollama health
        models = ollama.list()
        
        return {
            "status": "healthy" if db_healthy else "degraded",
            "database": "connected" if db_healthy else "disconnected",
            "model": MODEL_NAME,
            "model_loaded": model_loaded,
            "available_models": [m['name'] for m in models['models']],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {e}")

@app.post("/chat", response_model=ChatResponse)
async def chat_with_llama(request: ChatRequest):
    """Enhanced chat endpoint with database context"""
    start_time = asyncio.get_event_loop().time()
    
    await ensure_model_loaded()
    
    try:
        # Build context from database if needed
        enhanced_context = request.context
        if "work order" in request.message.lower():
            # Add recent work orders to context
            recent_orders = await work_order_repo.get_all(limit=5)
            if recent_orders:
                enhanced_context += f"\nRecent work orders: {[wo['title'] for wo in recent_orders]}"
        
        # Prepare messages for Ollama
        messages = []
        
        # Add chat history
        for msg in request.history:
            messages.append({
                'role': msg.get('role', 'user'),
                'content': msg.get('content', '')
            })
        
        # Add current message with context
        current_content = request.message
        if enhanced_context:
            current_content = f"Context: {enhanced_context}\n\nUser: {request.message}"
        
        messages.append({
            'role': 'user',
            'content': current_content
        })
        
        # Generate response
        response = ollama.chat(
            model=MODEL_NAME,
            messages=messages
        )
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        return ChatResponse(
            response=response['message']['content'],
            timestamp=datetime.now().isoformat(),
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {e}")

# =============================================================================
# FINANCIAL MANAGEMENT ENDPOINTS
# =============================================================================

@app.post("/api/costs", response_model=CostEntryResponse)
async def create_cost_entry(cost_entry: CostEntryCreate):
    """Create a new cost entry"""
    try:
        result = await cost_entry_repo.create(cost_entry.dict())
        if result:
            return CostEntryResponse(**result)
        raise HTTPException(status_code=400, detail="Failed to create cost entry")
    except Exception as e:
        logger.error(f"Error creating cost entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/work-orders/{work_order_id}/financials", response_model=WorkOrderFinancials)
async def get_work_order_financials(work_order_id: str):
    """Get financial information for a work order"""
    try:
        entries = await cost_entry_repo.get_by_work_order(work_order_id)
        summary = await cost_entry_repo.get_financials_summary(work_order_id)
        
        return WorkOrderFinancials(
            work_order_id=work_order_id,
            total=summary['total'],
            entries=[CostEntryResponse(**entry) for entry in entries]
        )
    except Exception as e:
        logger.error(f"Error getting work order financials: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# PREVENTIVE MAINTENANCE ENDPOINTS
# =============================================================================

@app.post("/api/preventive-maintenance/tasks", response_model=PMTaskResponse)
async def create_pm_task(pm_task: PMTaskCreate):
    """Create a new preventive maintenance task"""
    try:
        result = await pm_task_repo.create(pm_task.dict())
        if result:
            return PMTaskResponse(**result)
        raise HTTPException(status_code=400, detail="Failed to create PM task")
    except Exception as e:
        logger.error(f"Error creating PM task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/preventive-maintenance/tasks", response_model=List[PMTaskResponse])
async def get_pm_tasks():
    """Get all preventive maintenance tasks"""
    try:
        tasks = await pm_task_repo.get_all()
        return [PMTaskResponse(**task) for task in tasks]
    except Exception as e:
        logger.error(f"Error getting PM tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/preventive-maintenance/schedule", response_model=List[PMScheduleEntry])
async def get_pm_schedule(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get preventive maintenance schedule"""
    try:
        schedule = await pm_schedule_repo.get_schedule(start_date, end_date)
        return [PMScheduleEntry(**entry) for entry in schedule]
    except Exception as e:
        logger.error(f"Error getting PM schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/preventive-maintenance/complete")
async def complete_pm_task(schedule_id: str):
    """Mark a scheduled PM task as completed"""
    try:
        result = await pm_schedule_repo.complete_scheduled_task(schedule_id)
        if result:
            return {"message": "PM task completed successfully", "schedule_id": schedule_id}
        raise HTTPException(status_code=404, detail="Scheduled task not found")
    except Exception as e:
        logger.error(f"Error completing PM task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/preventive-maintenance/analytics")
async def get_pm_analytics():
    """Get preventive maintenance analytics"""
    try:
        analytics = await analytics_repo.get_pm_analytics()
        return analytics
    except Exception as e:
        logger.error(f"Error getting PM analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# WORK ORDER ENDPOINTS (Updated for database)
# =============================================================================

@app.get("/api/work-orders")
async def get_work_orders(limit: int = 100, offset: int = 0):
    """Get all work orders with pagination"""
    try:
        work_orders = await work_order_repo.get_all(limit, offset)
        return work_orders
    except Exception as e:
        logger.error(f"Error getting work orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/work-orders/{work_order_id}")
async def get_work_order(work_order_id: str):
    """Get a specific work order"""
    try:
        work_order = await work_order_repo.get_by_id(work_order_id)
        if work_order:
            return work_order
        raise HTTPException(status_code=404, detail="Work order not found")
    except Exception as e:
        logger.error(f"Error getting work order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/work-orders")
async def create_work_order(work_order_data: Dict[str, Any]):
    """Create a new work order"""
    try:
        result = await work_order_repo.create(work_order_data)
        if result:
            return result
        raise HTTPException(status_code=400, detail="Failed to create work order")
    except Exception as e:
        logger.error(f"Error creating work order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/work-orders/{work_order_id}")
async def update_work_order(work_order_id: str, update_data: Dict[str, Any]):
    """Update a work order"""
    try:
        result = await work_order_repo.update(work_order_id, update_data)
        if result:
            return result
        raise HTTPException(status_code=404, detail="Work order not found")
    except Exception as e:
        logger.error(f"Error updating work order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# ASSET ENDPOINTS
# =============================================================================

@app.get("/api/assets")
async def get_assets():
    """Get all assets"""
    try:
        assets = await asset_repo.get_all()
        return assets
    except Exception as e:
        logger.error(f"Error getting assets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/assets/{asset_id}")
async def get_asset(asset_id: str):
    """Get a specific asset"""
    try:
        asset = await asset_repo.get_by_id(asset_id)
        if asset:
            return asset
        raise HTTPException(status_code=404, detail="Asset not found")
    except Exception as e:
        logger.error(f"Error getting asset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# LEGACY ENDPOINTS (Maintained for backward compatibility)
# =============================================================================

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

Generate 3-8 relevant custom fields as a JSON array. Each field should have:
- name: Clear, descriptive field name
- type: One of [text, number, date, select, boolean, calculated]
- description: Brief explanation of the field's purpose
- options: Array of options (only for select type)
- defaultValue: Suggested default value (optional)
- required: Boolean indicating if field is required

Focus on practical, commonly needed fields for {request.industry} maintenance work.

Respond with JSON only, no additional text.
"""

        response = ollama.chat(
            model=MODEL_NAME,
            messages=[{
                'role': 'user',
                'content': prompt
            }]
        )
        
        # Parse the response
        response_content = response['message']['content'].strip()
        
        # Extract JSON from response
        start_idx = response_content.find('[')
        end_idx = response_content.rfind(']') + 1
        if start_idx != -1 and end_idx != 0:
            json_content = response_content[start_idx:end_idx]
        else:
            json_content = response_content
        
        fields_data = json.loads(json_content)
        fields = [CustomField(**field) for field in fields_data]
        
        processing_time = asyncio.get_event_loop().time() - start_time
        
        return FieldResponse(
            fields=fields,
            reasoning=f"Generated {len(fields)} fields for {request.industry} maintenance based on: {request.query}",
            timestamp=datetime.now().isoformat(),
            processing_time=processing_time
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logger.error(f"Field generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Field generation failed: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "main_db:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )