# Financial Management & Workflow System

This document describes the newly implemented financial management and workflow system for ChatterFix CMMS.

## 🚀 Quick Start

### Backend Setup
1. **Start the API server:**
   ```bash
   cd /Users/fredtaylor/Desktop/Projects/chatterfixcl
   python3 api/main.py
   ```

2. **Test the endpoints:**
   ```bash
   python3 test_endpoints.py
   ```

### Frontend Setup
1. **Install React Query dependency:**
   ```bash
   npm install @tanstack/react-query
   ```

2. **Start the frontend:**
   ```bash
   npm start
   ```

3. **Navigate to "Financials & Workflow" tab in the application**

## 📊 Financial Management Features

### Cost Tracking
- **Add Costs**: Track labor, parts, service, and miscellaneous costs per work order
- **Cost Categories**: Automatically categorize and analyze spending
- **Real-time Totals**: See total costs per work order and overall analytics
- **Budget Integration**: Ready for budget allocation and tracking

### API Endpoints
```
POST /api/financials/cost-entry
GET  /api/financials/work-order/{id}
GET  /api/financials/analytics/summary
```

### Usage Example
```typescript
// Add a cost entry
const addCost = useAddCostEntry();
addCost.mutate({
  workOrderId: "WO-123",
  type: "LABOR",
  amount: 150.50,
  meta: { note: "Diagnostic work" }
});

// Get work order costs
const { data: costs } = useWorkOrderFinancials("WO-123");
console.log(`Total: $${costs?.total}`);
```

## ⚙️ Workflow Management Features

### Approval Workflows
- **Multi-Approver Support**: Route work orders to multiple approvers
- **Approval Tracking**: Track who approved/rejected and when
- **Notes**: Add approval notes and rejection reasons
- **Status Management**: Automatic status updates based on approval state

### Auto-Assignment
- **Rule-Based Assignment**: Assign technicians based on skills and workload
- **Load Balancing**: Distribute work orders evenly among qualified technicians
- **Priority Handling**: High/critical work orders get priority assignment
- **Skill Matching**: Match technician skills to work order requirements

### SLA Management
- **Response Time Tracking**: Monitor time to first response
- **Resolution Time Tracking**: Track time to completion
- **Escalation System**: Automatic escalation when SLAs are breached
- **Real-time Status**: Live updates on SLA compliance

### API Endpoints
```
POST /api/work-orders/{id}/submit-for-approval
POST /api/work-orders/{id}/approve
POST /api/work-orders/{id}/reject
POST /api/work-orders/{id}/auto-assign
POST /api/work-orders/{id}/sla
GET  /api/work-orders/{id}/sla/status
POST /api/work-orders/{id}/sla/escalate-if-needed
```

### Usage Examples

#### Approval Workflow
```typescript
// Submit for approval
const submitApproval = useSubmitForApproval();
submitApproval.mutate({
  workOrderId: "WO-123",
  approverIds: ["manager1", "manager2"]
});

// Approve work order
const approve = useApproveWO();
approve.mutate({
  workOrderId: "WO-123",
  approverId: "manager1",
  note: "Approved for maintenance"
});
```

#### Auto-Assignment
```typescript
// Auto-assign technician
const autoAssign = useAutoAssignWO();
autoAssign.mutate("WO-123");
```

#### SLA Management
```typescript
// Set SLA
const setSla = useSetSLA();
setSla.mutate({
  workOrderId: "WO-123",
  name: "Standard SLA",
  respondMins: 30,
  resolveMins: 240
});

// Monitor SLA status
const { data: slaStatus } = useSLAStatus("WO-123");
```

## 🎨 UI Components

### FinancialManager Component
- **Cost Entry Form**: Add labor, parts, service, and misc costs
- **Financial Overview**: See total costs and cost breakdown
- **Analytics Dashboard**: Visual cost analysis by type
- **Real-time Updates**: Automatic refresh when costs are added

### WorkflowManager Component
- **Approval Interface**: Submit, approve, or reject work orders
- **Assignment Panel**: Auto-assign or manually assign technicians
- **SLA Dashboard**: Set SLAs and monitor compliance
- **Escalation Alerts**: Visual indicators for SLA breaches

### EnhancedWorkOrderDetail Component
- **Tabbed Interface**: Switch between details, financials, workflow, photos, and chat
- **Integrated Experience**: All work order information in one place
- **Real-time Updates**: Live data updates across all tabs
- **Context-Aware Chat**: AI assistance specific to the work order

## 🔧 Configuration

### Assignment Rules
Assignment rules use JSON configuration for flexibility:

```json
{
  "skillsAny": ["electrical", "mechanical"],
  "maxActive": 5,
  "priority": ["HIGH", "CRITICAL"]
}
```

### SLA Templates
Pre-configured SLA templates:
- **Critical**: 15min response / 2hr resolution
- **Standard**: 30min response / 4hr resolution  
- **Low Priority**: 1hr response / 8hr resolution

## 📱 Integration Points

### Existing Systems
- **Voice Interface**: Create work orders that flow into financial/workflow system
- **AI Chat**: Context-aware assistance for financial and workflow decisions
- **Asset Management**: Link costs and workflows to specific assets
- **Inventory**: Integration ready for parts cost tracking

### Future Enhancements
- **Budget Management**: Set and track departmental budgets
- **Advanced Analytics**: Predictive cost analysis and trend reporting
- **Mobile Interface**: Touch-optimized workflow for field technicians
- **Integration APIs**: Connect to external ERP/accounting systems

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Ensure the backend is running on port 8000
   - Check that CORS is properly configured
   - Verify no firewall is blocking the connection

2. **React Query Errors**
   - Make sure @tanstack/react-query is installed
   - Verify QueryClient is properly set up in App.tsx
   - Check browser console for specific error messages

3. **Financial Data Not Persisting**
   - Currently using in-memory storage (backend restart clears data)
   - For production, implement proper database integration
   - Check that cost entries are being created successfully

4. **Workflow Status Not Updating**
   - Verify work order ID exists in the system
   - Check that the correct user ID is being passed for approvals
   - Ensure React Query cache is invalidating properly

### Testing
Run the test suite to verify all endpoints are working:
```bash
python3 test_endpoints.py
```

Expected output should show all green checkmarks (✓) for successful API calls.

## 📚 Further Documentation

- **API Documentation**: Visit http://localhost:8000/docs when the backend is running
- **React Query Guide**: https://tanstack.com/query/latest/docs/react/overview
- **Component Documentation**: See individual component files for detailed prop definitions
- **Type Definitions**: Check src/api/client.ts for TypeScript interfaces

## 🎯 Production Checklist

Before deploying to production:

- [ ] Replace in-memory storage with proper database (PostgreSQL/MongoDB)
- [ ] Add authentication and authorization to API endpoints
- [ ] Implement proper error handling and logging
- [ ] Add input validation and sanitization
- [ ] Set up monitoring and alerting for SLA breaches
- [ ] Configure backup and disaster recovery
- [ ] Add rate limiting to prevent API abuse
- [ ] Implement audit logging for financial transactions
- [ ] Add unit and integration tests
- [ ] Set up CI/CD pipeline

This implementation provides a solid foundation for financial and workflow management in your CMMS system, with room for future enhancements and production deployment.