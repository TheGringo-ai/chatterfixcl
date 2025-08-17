#!/usr/bin/env python3
"""
Test script for ChatterFix Financial and Workflow endpoints
Run this to verify the backend implementation works correctly
"""

import requests
import json
import time
from datetime import datetime

# Configuration
API_BASE = "http://localhost:8000/api"
TEST_WORK_ORDER_ID = "WO-test-001"

def test_endpoint(method, endpoint, data=None, expected_status=200):
    """Test a single endpoint and return result"""
    url = f"{API_BASE}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        
        print(f"✓ {method} {endpoint}: {response.status_code}")
        
        if response.status_code == expected_status:
            return response.json()
        else:
            print(f"  ❌ Expected {expected_status}, got {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ {method} {endpoint}: Connection failed - {e}")
        return None

def run_financial_tests():
    """Test financial management endpoints"""
    print("\n🔋 Testing Financial Management Endpoints...")
    
    # Test adding cost entries
    cost_data = {
        "workOrderId": TEST_WORK_ORDER_ID,
        "type": "LABOR",
        "amount": 150.50,
        "meta": {"note": "Initial diagnostic work"}
    }
    
    cost_entry = test_endpoint("POST", "/financials/cost-entry", cost_data, 200)
    if cost_entry:
        print(f"  📊 Created cost entry: ${cost_entry['amount']}")
    
    # Add more cost entries
    for cost_type, amount in [("PART", 75.25), ("SERVICE", 200.00), ("MISC", 25.50)]:
        test_endpoint("POST", "/financials/cost-entry", {
            "workOrderId": TEST_WORK_ORDER_ID,
            "type": cost_type,
            "amount": amount,
            "meta": {"note": f"Test {cost_type.lower()} cost"}
        })
    
    # Test getting work order financials
    financials = test_endpoint("GET", f"/financials/work-order/{TEST_WORK_ORDER_ID}")
    if financials:
        print(f"  💰 Work order total: ${financials['total']}")
        print(f"  📋 Cost entries: {len(financials['entries'])}")
    
    # Test financial summary
    summary = test_endpoint("GET", "/financials/analytics/summary")
    if summary:
        print(f"  📈 Total spend: ${summary['total']}")
        print(f"  📊 Cost breakdown: {summary['byType']}")

def run_workflow_tests():
    """Test workflow management endpoints"""
    print("\n⚙️ Testing Workflow Management Endpoints...")
    
    # Test submitting for approval
    approval_data = {"approverIds": ["manager1", "manager2"]}
    test_endpoint("POST", f"/work-orders/{TEST_WORK_ORDER_ID}/submit-for-approval", approval_data)
    
    # Test approval
    approval_decision = {"approverId": "manager1", "note": "Approved for maintenance"}
    test_endpoint("POST", f"/work-orders/{TEST_WORK_ORDER_ID}/approve", approval_decision)
    
    # Test auto-assignment
    assignment = test_endpoint("POST", f"/work-orders/{TEST_WORK_ORDER_ID}/auto-assign")
    if assignment:
        print(f"  👷 Assigned to: {assignment['assignedTo']}")
    
    # Test SLA setup
    sla_data = {
        "name": "Standard Maintenance SLA",
        "respondMins": 30,
        "resolveMins": 240
    }
    test_endpoint("POST", f"/work-orders/{TEST_WORK_ORDER_ID}/sla", sla_data)
    
    # Test SLA status
    sla_status = test_endpoint("GET", f"/work-orders/{TEST_WORK_ORDER_ID}/sla/status")
    if sla_status:
        print(f"  ⏰ Response due in: {sla_status['firstResponseDueInMins']} minutes")
        print(f"  🎯 Resolution due in: {sla_status['resolveDueInMins']} minutes")
    
    # Test escalation check
    test_endpoint("POST", f"/work-orders/{TEST_WORK_ORDER_ID}/sla/escalate-if-needed")

def run_assignment_rule_tests():
    """Test assignment rule management"""
    print("\n📋 Testing Assignment Rules...")
    
    # Get existing rules
    rules = test_endpoint("GET", "/assignment-rules")
    if rules:
        print(f"  📜 Existing rules: {len(rules)}")
    
    # Create new rule
    rule_data = {
        "name": "Emergency Response Rule",
        "jsonRule": {
            "priority": ["CRITICAL", "HIGH"],
            "skillsAny": ["emergency", "electrical"],
            "maxActive": 3
        },
        "active": True
    }
    new_rule = test_endpoint("POST", "/assignment-rules", rule_data)
    if new_rule:
        print(f"  ✅ Created rule: {new_rule['name']}")

def check_api_health():
    """Check if the API is running"""
    print("🔍 Checking API Health...")
    
    try:
        response = requests.get(f"{API_BASE.replace('/api', '')}/health", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ API is healthy - Model: {health_data.get('model', 'Unknown')}")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ API is not responding: {e}")
        print("\n💡 Make sure to start the API server:")
        print("   cd /Users/fredtaylor/Desktop/Projects/chatterfixcl")
        print("   python3 api/main.py")
        return False

def main():
    """Run all tests"""
    print("🧪 ChatterFix Financial & Workflow API Tests")
    print("=" * 50)
    
    if not check_api_health():
        return
    
    print(f"\n🎯 Using test work order ID: {TEST_WORK_ORDER_ID}")
    
    run_financial_tests()
    run_workflow_tests()
    run_assignment_rule_tests()
    
    print("\n✅ Test suite completed!")
    print("\n📋 Next steps:")
    print("   1. Start the frontend: npm start")
    print("   2. Navigate to 'Financials & Workflow' tab")
    print("   3. Create or select a work order to test the UI")

if __name__ == "__main__":
    main()