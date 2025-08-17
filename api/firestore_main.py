"""
ChatterFix CMMS - Firestore Backend
Production-ready FastAPI with Google Firestore
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from datetime import datetime, timezone
import uuid
from typing import List, Optional, Dict, Any
import json

# Google Cloud imports
from google.cloud import firestore
from google.oauth2 import service_account

app = FastAPI(
    title="ChatterFix CMMS API",
    description="AI-Powered Computerized Maintenance Management System",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firestore
def get_firestore_client():
    """Initialize Firestore client with service account"""
    try:
        # In production, service account is set via environment
        # In development, you can use a local key file
        if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            return firestore.Client()
        elif os.getenv("GCP_SA_KEY"):
            # Parse service account from environment variable
            sa_info = json.loads(os.getenv("GCP_SA_KEY"))
            credentials = service_account.Credentials.from_service_account_info(sa_info)
            return firestore.Client(credentials=credentials, project=sa_info.get("project_id"))
        else:
            # Use default credentials (works in Cloud Run)
            return firestore.Client()
    except Exception as e:
        print(f"Error initializing Firestore: {e}")
        return None

db = get_firestore_client()

# Health check
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test Firestore connection
        if db:
            # Simple test query
            test_ref = db.collection("health_check").document("test")
            test_ref.set({"timestamp": datetime.now(timezone.utc), "status": "ok"})
            return {"status": "healthy", "database": "connected", "timestamp": datetime.now(timezone.utc)}
        else:
            return {"status": "unhealthy", "database": "disconnected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Health check failed: {str(e)}")

# Helper functions
def generate_id():
    """Generate UUID for documents"""
    return str(uuid.uuid4())

def add_timestamps(data: dict) -> dict:
    """Add created_at and updated_at timestamps"""
    now = datetime.now(timezone.utc)
    data["created_at"] = now
    data["updated_at"] = now
    return data

def update_timestamp(data: dict) -> dict:
    """Update the updated_at timestamp"""
    data["updated_at"] = datetime.now(timezone.utc)
    return data

# Assets endpoints
@app.get("/api/assets")
async def get_assets():
    """Get all assets"""
    try:
        assets_ref = db.collection("assets")
        assets = []
        for doc in assets_ref.stream():
            asset_data = doc.to_dict()
            asset_data["id"] = doc.id
            assets.append(asset_data)
        return assets
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/assets")
async def create_asset(asset_data: dict):
    """Create a new asset"""
    try:
        asset_id = generate_id()
        asset_data = add_timestamps(asset_data)
        asset_data["id"] = asset_id
        
        db.collection("assets").document(asset_id).set(asset_data)
        return {"id": asset_id, **asset_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/assets/{asset_id}")
async def get_asset(asset_id: str):
    """Get specific asset"""
    try:
        doc_ref = db.collection("assets").document(asset_id)
        doc = doc_ref.get()
        if doc.exists:
            asset_data = doc.to_dict()
            asset_data["id"] = doc.id
            return asset_data
        else:
            raise HTTPException(status_code=404, detail="Asset not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/assets/{asset_id}")
async def update_asset(asset_id: str, asset_data: dict):
    """Update an asset"""
    try:
        doc_ref = db.collection("assets").document(asset_id)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        asset_data = update_timestamp(asset_data)
        doc_ref.update(asset_data)
        
        updated_doc = doc_ref.get()
        result = updated_doc.to_dict()
        result["id"] = updated_doc.id
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Work Orders endpoints
@app.get("/api/work-orders")
async def get_work_orders():
    """Get all work orders"""
    try:
        wo_ref = db.collection("work_orders")
        work_orders = []
        for doc in wo_ref.stream():
            wo_data = doc.to_dict()
            wo_data["id"] = doc.id
            work_orders.append(wo_data)
        return work_orders
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/work-orders")
async def create_work_order(wo_data: dict):
    """Create a new work order"""
    try:
        wo_id = generate_id()
        wo_data = add_timestamps(wo_data)
        wo_data["id"] = wo_id
        
        # Generate WO number if not provided
        if "wo_number" not in wo_data:
            wo_data["wo_number"] = f"WO-{datetime.now().strftime('%Y%m%d')}-{wo_id[:8]}"
        
        db.collection("work_orders").document(wo_id).set(wo_data)
        return {"id": wo_id, **wo_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/work-orders/{wo_id}")
async def get_work_order(wo_id: str):
    """Get specific work order"""
    try:
        doc_ref = db.collection("work_orders").document(wo_id)
        doc = doc_ref.get()
        if doc.exists:
            wo_data = doc.to_dict()
            wo_data["id"] = doc.id
            return wo_data
        else:
            raise HTTPException(status_code=404, detail="Work order not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/work-orders/{wo_id}")
async def update_work_order(wo_id: str, wo_data: dict):
    """Update a work order"""
    try:
        doc_ref = db.collection("work_orders").document(wo_id)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Work order not found")
        
        wo_data = update_timestamp(wo_data)
        doc_ref.update(wo_data)
        
        updated_doc = doc_ref.get()
        result = updated_doc.to_dict()
        result["id"] = updated_doc.id
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# PM Tasks endpoints
@app.get("/api/pm-tasks")
async def get_pm_tasks():
    """Get all PM tasks"""
    try:
        pm_ref = db.collection("pm_tasks")
        pm_tasks = []
        for doc in pm_ref.stream():
            pm_data = doc.to_dict()
            pm_data["id"] = doc.id
            pm_tasks.append(pm_data)
        return pm_tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pm-tasks")
async def create_pm_task(pm_data: dict):
    """Create a new PM task"""
    try:
        pm_id = generate_id()
        pm_data = add_timestamps(pm_data)
        pm_data["id"] = pm_id
        
        db.collection("pm_tasks").document(pm_id).set(pm_data)
        return {"id": pm_id, **pm_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Financial endpoints
@app.get("/api/financials/summary")
async def get_financial_summary():
    """Get financial summary"""
    try:
        # Get cost entries
        costs_ref = db.collection("cost_entries")
        total_costs = 0
        cost_breakdown = {"LABOR": 0, "PART": 0, "SERVICE": 0, "MISC": 0}
        
        for doc in costs_ref.stream():
            cost_data = doc.to_dict()
            amount = float(cost_data.get("amount", 0))
            cost_type = cost_data.get("type", "MISC")
            total_costs += amount
            cost_breakdown[cost_type] = cost_breakdown.get(cost_type, 0) + amount
        
        # Get budget data
        budgets_ref = db.collection("budgets")
        total_budget = 0
        for doc in budgets_ref.stream():
            budget_data = doc.to_dict()
            total_budget += float(budget_data.get("total_amount", 0))
        
        return {
            "total_costs": total_costs,
            "total_budget": total_budget,
            "budget_remaining": total_budget - total_costs,
            "cost_breakdown": cost_breakdown,
            "budget_utilization": (total_costs / total_budget * 100) if total_budget > 0 else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ChatterFix CMMS API",
        "version": "1.0.0",
        "database": "Firestore",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))