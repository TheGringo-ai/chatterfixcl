#!/usr/bin/env python3
"""
ChatterFix Document Storage API
A FastAPI service for document upload, storage, and retrieval
"""

import os
import logging
import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Google Cloud imports
from google.cloud import storage
from google.cloud import firestore

# Document processing imports
import PyPDF2
from PIL import Image
import io

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ChatterFix Document Storage API",
    description="Document upload, storage, and retrieval service",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Google Cloud clients
try:
    storage_client = storage.Client()
    db = firestore.Client()
    BUCKET_NAME = os.getenv("BUCKET_NAME", "chatterfix-documents-fredfix")
    logger.info(f"Initialized Google Cloud clients for bucket: {BUCKET_NAME}")
except Exception as e:
    logger.error(f"Failed to initialize Google Cloud clients: {e}")
    storage_client = None
    db = None
    BUCKET_NAME = None

# Data models
class DocumentInfo(BaseModel):
    id: str
    filename: str
    content_type: str
    size: int
    upload_time: datetime
    text_content: Optional[str] = None
    tags: List[str] = []

class SearchResponse(BaseModel):
    documents: List[DocumentInfo]
    total: int

# Asset Management Models
class Asset(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    model: str
    manufacturer: str
    serial_number: str
    location: str
    department: str
    category: str  # 'equipment', 'vehicle', 'infrastructure', 'tools', 'software', 'other'
    status: str  # 'operational', 'maintenance', 'repair', 'decommissioned', 'spare'
    priority: str  # 'low', 'medium', 'high', 'critical'
    purchase_date: str
    warranty_expiry: Optional[str] = None
    last_maintenance_date: Optional[str] = None
    next_maintenance_date: Optional[str] = None
    purchase_cost: float
    current_value: float
    assigned_to: Optional[str] = None
    tags: List[str] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class WorkOrder(BaseModel):
    id: Optional[str] = None
    asset_id: str
    title: str
    description: str
    type: str  # 'preventive', 'corrective', 'emergency', 'inspection', 'calibration'
    priority: str  # 'low', 'medium', 'high', 'critical'
    status: str  # 'pending', 'in-progress', 'completed', 'cancelled', 'on-hold'
    assigned_to: str
    requested_by: str
    scheduled_date: str
    completed_date: Optional[str] = None
    estimated_hours: float
    actual_hours: Optional[float] = None
    estimated_cost: float
    actual_cost: Optional[float] = None
    notes: str
    parts: List[Dict[str, Any]] = []  # [{"name": str, "quantity": int, "cost": float}]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class AssetListResponse(BaseModel):
    assets: List[Asset]
    total: int

class WorkOrderListResponse(BaseModel):
    work_orders: List[WorkOrder]
    total: int

# Utility functions
def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return ""

def extract_text_from_image(file_content: bytes) -> str:
    """Extract text from image file (placeholder for OCR)"""
    try:
        # This is a placeholder - you would integrate with OCR service
        # like Google Vision API or Tesseract
        image = Image.open(io.BytesIO(file_content))
        return f"Image dimensions: {image.size[0]}x{image.size[1]}"
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        return ""

# API endpoints
@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ChatterFix Document Storage API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    """Detailed health check"""
    health_status = {
        "status": "healthy",
        "services": {
            "storage": storage_client is not None,
            "firestore": db is not None,
            "bucket": BUCKET_NAME is not None
        },
        "timestamp": datetime.now().isoformat()
    }
    
    if not all(health_status["services"].values()):
        health_status["status"] = "degraded"
    
    return health_status

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    tags: str = Form(default="")
):
    """Upload and store a document"""
    if not storage_client or not db:
        raise HTTPException(status_code=503, detail="Storage services unavailable")
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Generate unique document ID
        doc_id = str(uuid.uuid4())
        
        # Upload to Google Cloud Storage
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(f"documents/{doc_id}")
        blob.upload_from_string(file_content, content_type=file.content_type)
        
        # Extract text content based on file type
        text_content = ""
        if file.content_type == "application/pdf":
            text_content = extract_text_from_pdf(file_content)
        elif file.content_type.startswith("image/"):
            text_content = extract_text_from_image(file_content)
        elif file.content_type.startswith("text/"):
            text_content = file_content.decode('utf-8', errors='ignore')
        
        # Parse tags
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
        
        # Store metadata in Firestore
        doc_data = {
            "id": doc_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(file_content),
            "upload_time": datetime.now(),
            "text_content": text_content,
            "tags": tag_list,
            "storage_path": f"documents/{doc_id}"
        }
        
        db.collection("documents").document(doc_id).set(doc_data)
        
        logger.info(f"Successfully uploaded document: {file.filename} ({doc_id})")
        
        return {
            "success": True,
            "document_id": doc_id,
            "filename": file.filename,
            "size": len(file_content),
            "message": "Document uploaded successfully"
        }
        
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/documents", response_model=SearchResponse)
async def list_documents(
    limit: int = 10,
    offset: int = 0,
    search: Optional[str] = None
):
    """List and search documents"""
    if not db:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    
    try:
        # Get documents from Firestore
        docs_ref = db.collection("documents")
        
        # Apply search filter if provided
        if search:
            # Simple text search in filename and text_content
            # For production, consider using full-text search service
            docs_ref = docs_ref.where("filename", ">=", search).where("filename", "<=", search + "\uf8ff")
        
        # Get documents with pagination
        docs = docs_ref.order_by("upload_time", direction=firestore.Query.DESCENDING)\
                      .offset(offset)\
                      .limit(limit)\
                      .stream()
        
        # Convert to response format
        documents = []
        for doc in docs:
            doc_data = doc.to_dict()
            documents.append(DocumentInfo(
                id=doc_data["id"],
                filename=doc_data["filename"],
                content_type=doc_data["content_type"],
                size=doc_data["size"],
                upload_time=doc_data["upload_time"],
                text_content=doc_data.get("text_content"),
                tags=doc_data.get("tags", [])
            ))
        
        # Get total count (simplified)
        total = len(documents)  # For a more accurate count, you'd need a separate query
        
        return SearchResponse(documents=documents, total=total)
        
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/documents/{document_id}")
async def get_document(document_id: str):
    """Get document metadata and content"""
    if not db:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    
    try:
        # Get document metadata
        doc_ref = db.collection("documents").document(document_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_data = doc.to_dict()
        
        return DocumentInfo(
            id=doc_data["id"],
            filename=doc_data["filename"],
            content_type=doc_data["content_type"],
            size=doc_data["size"],
            upload_time=doc_data["upload_time"],
            text_content=doc_data.get("text_content"),
            tags=doc_data.get("tags", [])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get document: {str(e)}")

@app.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document"""
    if not storage_client or not db:
        raise HTTPException(status_code=503, detail="Storage services unavailable")
    
    try:
        # Get document metadata first
        doc_ref = db.collection("documents").document(document_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_data = doc.to_dict()
        
        # Delete from Cloud Storage
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(doc_data["storage_path"])
        blob.delete()
        
        # Delete from Firestore
        doc_ref.delete()
        
        logger.info(f"Successfully deleted document: {document_id}")
        
        return {"success": True, "message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

# Asset Management Endpoints

@app.get("/assets", response_model=AssetListResponse)
async def list_assets(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """List all assets with optional filtering"""
    if not db:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    
    try:
        # Start with base query
        query = db.collection("assets")
        
        # Apply filters
        if status:
            query = query.where("status", "==", status)
        if category:
            query = query.where("category", "==", category)
        
        # Execute query
        docs = query.limit(limit).offset(skip).stream()
        
        assets = []
        for doc in docs:
            asset_data = doc.to_dict()
            asset_data["id"] = doc.id
            assets.append(Asset(**asset_data))
        
        # Apply search filter if needed (simplified - in production use full-text search)
        if search:
            search_lower = search.lower()
            assets = [
                asset for asset in assets 
                if search_lower in asset.name.lower() or 
                   search_lower in asset.description.lower() or
                   search_lower in asset.location.lower()
            ]
        
        total = len(assets)  # Simplified count
        
        return AssetListResponse(assets=assets, total=total)
        
    except Exception as e:
        logger.error(f"Error listing assets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list assets: {str(e)}")

@app.post("/assets")
async def create_asset(asset: Asset):
    """Create a new asset"""
    if not db:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    
    try:
        # Generate ID and timestamps
        asset_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        asset_data = asset.dict()
        asset_data["id"] = asset_id
        asset_data["created_at"] = now
        asset_data["updated_at"] = now
        
        # Save to Firestore
        db.collection("assets").document(asset_id).set(asset_data)
        
        logger.info(f"Successfully created asset: {asset_id}")
        
        return Asset(**asset_data)
        
    except Exception as e:
        logger.error(f"Error creating asset: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create asset: {str(e)}")

@app.get("/assets/{asset_id}")
async def get_asset(asset_id: str):
    """Get asset by ID"""
    if not db:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    
    try:
        doc_ref = db.collection("assets").document(asset_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        asset_data = doc.to_dict()
        asset_data["id"] = doc.id
        
        return Asset(**asset_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting asset: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get asset: {str(e)}")

@app.put("/assets/{asset_id}")
async def update_asset(asset_id: str, asset: Asset):
    """Update an existing asset"""
    if not db:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    
    try:
        doc_ref = db.collection("assets").document(asset_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # Update asset data
        asset_data = asset.dict()
        asset_data["id"] = asset_id
        asset_data["updated_at"] = datetime.now().isoformat()
        
        # Preserve created_at if it exists
        existing_data = doc.to_dict()
        if "created_at" in existing_data:
            asset_data["created_at"] = existing_data["created_at"]
        
        # Update in Firestore
        doc_ref.set(asset_data)
        
        logger.info(f"Successfully updated asset: {asset_id}")
        
        return Asset(**asset_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating asset: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update asset: {str(e)}")

@app.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str):
    """Delete an asset"""
    if not db:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    
    try:
        doc_ref = db.collection("assets").document(asset_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # Delete from Firestore
        doc_ref.delete()
        
        logger.info(f"Successfully deleted asset: {asset_id}")
        
        return {"success": True, "message": "Asset deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting asset: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete asset: {str(e)}")

# Work Order Endpoints

@app.get("/workorders", response_model=WorkOrderListResponse)
async def list_work_orders(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    asset_id: Optional[str] = None,
    assigned_to: Optional[str] = None
):
    """List all work orders with optional filtering"""
    if not db:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    
    try:
        # Start with base query
        query = db.collection("workorders")
        
        # Apply filters
        if status:
            query = query.where("status", "==", status)
        if asset_id:
            query = query.where("asset_id", "==", asset_id)
        if assigned_to:
            query = query.where("assigned_to", "==", assigned_to)
        
        # Execute query
        docs = query.limit(limit).offset(skip).stream()
        
        work_orders = []
        for doc in docs:
            wo_data = doc.to_dict()
            wo_data["id"] = doc.id
            work_orders.append(WorkOrder(**wo_data))
        
        total = len(work_orders)  # Simplified count
        
        return WorkOrderListResponse(work_orders=work_orders, total=total)
        
    except Exception as e:
        logger.error(f"Error listing work orders: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list work orders: {str(e)}")

@app.post("/workorders")
async def create_work_order(work_order: WorkOrder):
    """Create a new work order"""
    if not db:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    
    try:
        # Generate ID and timestamps
        wo_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        wo_data = work_order.dict()
        wo_data["id"] = wo_id
        wo_data["created_at"] = now
        wo_data["updated_at"] = now
        
        # Save to Firestore
        db.collection("workorders").document(wo_id).set(wo_data)
        
        logger.info(f"Successfully created work order: {wo_id}")
        
        return WorkOrder(**wo_data)
        
    except Exception as e:
        logger.error(f"Error creating work order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create work order: {str(e)}")

@app.get("/workorders/{work_order_id}")
async def get_work_order(work_order_id: str):
    """Get work order by ID"""
    if not db:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    
    try:
        doc_ref = db.collection("workorders").document(work_order_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        wo_data = doc.to_dict()
        wo_data["id"] = doc.id
        
        return WorkOrder(**wo_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting work order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get work order: {str(e)}")

@app.put("/workorders/{work_order_id}")
async def update_work_order(work_order_id: str, work_order: WorkOrder):
    """Update an existing work order"""
    if not db:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    
    try:
        doc_ref = db.collection("workorders").document(work_order_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        # Update work order data
        wo_data = work_order.dict()
        wo_data["id"] = work_order_id
        wo_data["updated_at"] = datetime.now().isoformat()
        
        # Preserve created_at if it exists
        existing_data = doc.to_dict()
        if "created_at" in existing_data:
            wo_data["created_at"] = existing_data["created_at"]
        
        # Update in Firestore
        doc_ref.set(wo_data)
        
        logger.info(f"Successfully updated work order: {work_order_id}")
        
        return WorkOrder(**wo_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating work order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update work order: {str(e)}")

@app.delete("/workorders/{work_order_id}")
async def delete_work_order(work_order_id: str):
    """Delete a work order"""
    if not db:
        raise HTTPException(status_code=503, detail="Database service unavailable")
    
    try:
        doc_ref = db.collection("workorders").document(work_order_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        # Delete from Firestore
        doc_ref.delete()
        
        logger.info(f"Successfully deleted work order: {work_order_id}")
        
        return {"success": True, "message": "Work order deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting work order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete work order: {str(e)}")

# Chat Endpoint for Onboarding

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    step: Optional[str] = None
    uploadedFiles: Optional[List[str]] = []
    completedSteps: Optional[List[str]] = []

class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[Dict[str, Any]] = None

@app.post("/chat", response_model=ChatResponse)
async def chat_onboarding(request: ChatRequest):
    """AI-powered onboarding chat assistant"""
    try:
        # This is a simplified response - in production you would integrate with a real AI service
        user_message = request.message.lower()
        context = request.context or ""
        step = request.step or ""
        
        # Generate contextual responses based on the current step and user input
        if context == "onboarding":
            if "setup" in user_message or "start" in user_message:
                response = """Great! I'll help you set up ChatterFix. Here's what we can do:

**Option 1: Quick Setup (Recommended)**
• Upload your existing asset spreadsheets/documents
• I'll automatically extract and organize the data
• Set up basic categories and workflows

**Option 2: Manual Setup**
• Walk through each section step by step
• Customize everything to your specific needs
• More control but takes longer

Which approach would you prefer? You can also ask me specific questions about any part of the setup process."""
                
                suggestions = {
                    "buttons": ["Quick Setup", "Manual Setup", "I have questions"]
                }
                
            elif "upload" in user_message or "file" in user_message or "data" in user_message:
                response = """Perfect! Here's how to upload your data:

**Supported File Types:**
• Excel spreadsheets (.xlsx, .xls)
• CSV files
• PDF manuals and procedures
• Word documents (.doc, .docx)

**What I can extract automatically:**
• Asset lists with names, locations, models
• Maintenance schedules and history
• Parts inventory from spreadsheets
• Equipment manuals and procedures

**Tips for best results:**
• Use clear column headers (Name, Location, Model, etc.)
• Include as much detail as possible
• Multiple files are fine - I'll organize them

Would you like to start by uploading your asset spreadsheet, or do you have other types of documents?"""
                
                suggestions = {
                    "completeStep": "data-upload" if len(request.uploadedFiles or []) > 0 else None
                }
                
            elif "asset" in user_message:
                response = """I'll help you set up your asset management! Here are the key things we'll configure:

**Asset Categories:**
• Equipment (pumps, motors, machines)
• Infrastructure (HVAC, electrical systems)
• Vehicles (forklifts, trucks)
• IT Assets (computers, servers)
• Tools and instruments

**Custom Fields:**
You can add fields specific to your needs like:
• Warranty information
• Compliance requirements
• Custom maintenance intervals
• Cost centers or departments

**Maintenance Scheduling:**
• Preventive maintenance calendars
• Work order templates
• Parts requirements

What type of assets do you have the most of? This will help me prioritize the setup."""
                
            elif "part" in user_message or "inventory" in user_message:
                response = """Great question! Parts management is crucial for maintenance efficiency. Here's what I can help set up:

**Inventory Categories:**
• Filters (air, oil, fuel, hydraulic)
• Belts and chains
• Bearings and seals
• Electrical components
• Fluids and lubricants
• Fasteners and hardware

**Smart Features:**
• Automatic reorder points based on usage
• Parts compatibility with your assets
• Supplier information and lead times
• Cost tracking and budgeting

**From Your Data:**
If you upload maintenance records, I can:
• Identify frequently used parts
• Suggest optimal stock levels
• Link parts to specific assets

Do you have existing parts lists or maintenance records you can share?"""
                
            elif "help" in user_message or "question" in user_message:
                response = """I'm here to help! Here are some things you can ask me:

**Setup Questions:**
• "How do I upload my asset list?"
• "What file formats do you support?"
• "How do you organize different types of equipment?"
• "Can you import from [specific software]?"

**Feature Questions:**
• "How does preventive maintenance work?"
• "Can I set up custom fields?"
• "How do work orders get assigned?"
• "What reports can I generate?"

**Data Questions:**
• "What if my data isn't organized?"
• "Can you merge multiple spreadsheets?"
• "How do you handle duplicate assets?"

Just ask me anything - I'm designed to understand natural language and provide specific help based on your needs!"""
                
            else:
                # General helpful response
                response = f"""I understand you're asking about: "{request.message}"

Let me help with that! Based on where you are in the setup process (step: {step}), here are some suggestions:

**For your current step:**
• Take your time to review the options
• Upload any relevant files you have
• Don't worry about perfection - we can always adjust later

**General tips:**
• Start with your most critical assets
• Upload maintenance records if you have them
• Ask me specific questions anytime

**Next steps:**
• Complete the current section
• I'll help organize and validate your data
• We can customize everything to fit your workflow

Is there something specific you'd like help with right now?"""
        
        else:
            # Generic response for non-onboarding contexts
            response = """I'm your ChatterFix AI assistant! I can help with:

• Asset management questions
• Work order guidance  
• Maintenance best practices
• System navigation
• Data organization

What would you like help with?"""
        
        return ChatResponse(
            response=response,
            suggestions=suggestions if 'suggestions' in locals() else None
        )
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return ChatResponse(
            response="I'm having trouble right now. Please try again or contact support if the issue persists.",
            suggestions=None
        )

# Run the application
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
