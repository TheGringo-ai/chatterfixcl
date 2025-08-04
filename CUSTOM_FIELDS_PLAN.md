# Custom Fields Implementation Plan

## Overview
Add a system that allows users to define and manage custom fields for Assets, Work Orders, and Inventory items.

## Example: "Time Since Last Work Order" Field

### Implementation Levels

## Level 1: Quick Implementation (2-4 hours)
- Add hardcoded "Time Since Last Work Order" field to Asset interface
- Calculate automatically based on work order history
- Display in Asset views and export to CSV

## Level 2: Semi-Configurable (1-2 days)
- Add a few predefined custom field options users can enable/disable
- "Time Since Last Work Order", "Next Scheduled Maintenance", "Criticality Rating", etc.
- Simple toggle interface in settings

## Level 3: Fully Customizable (3-5 days)
- Complete custom field management system
- User can add any field type (text, number, date, dropdown, etc.)
- Dynamic forms that adapt to custom fields
- CSV import/export supports custom fields

## Level 4: AI-Powered Custom Fields (1-2 weeks) 🤖
- **AI Assistant Integration**: Natural language field creation
- **Intelligent Suggestions**: AI recommends relevant fields based on industry
- **Dynamic Reporting**: AI generates custom reports on demand
- **Smart Calculations**: AI creates complex calculated fields using natural language
- **Automated Insights**: AI alerts when custom field values indicate issues

### AI Assistant Capabilities:
```
User: "I need to track which assets are energy hogs"
AI: "I'll create an 'Energy Efficiency Rating' field with Poor/Fair/Good/Excellent options and add a calculated 'Power Consumption Score' based on operating hours and equipment type."

User: "Show me assets that need attention"
AI: "Based on your custom fields: 3 assets have 'Days Since Last Work Order' > 30 AND 'Criticality Rating' = High. Creating maintenance work orders now."

User: "Generate a monthly report for the board"
AI: "Created executive dashboard with: Asset uptime %, maintenance costs by department, energy efficiency trends, and predictive maintenance savings."
```

## Technical Implementation

### 1. Data Structure Changes

```typescript
interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'calculated';
  required: boolean;
  options?: string[]; // For select fields
  calculation?: string; // For calculated fields like "time since last work order"
  defaultValue?: any;
  showInList: boolean;
  showInForm: boolean;
}

interface CustomFieldConfig {
  assets: CustomField[];
  workOrders: CustomField[];
  inventory: CustomField[];
}

// Extended interfaces
interface Asset {
  id: string;
  name: string;
  location: string;
  status: string;
  lastMaintenance: string;
  customFields: Record<string, any>;
}
```

### 2. UI Components Needed

#### Custom Field Manager
- Add/Edit/Delete custom fields
- Field type selection
- Validation rules
- Display preferences

#### Dynamic Form Generator
- Renders forms based on custom field configuration
- Handles different field types
- Validation and error handling

#### Enhanced Views
- Asset/Work Order/Inventory views adapt to show custom fields
- Sortable/filterable by custom fields
- Export includes custom fields

### 3. Storage Considerations

#### LocalStorage (Current)
- Store custom field config in localStorage
- Works for demo/single-user scenarios
- Limited by browser storage limits

#### Future Database Integration
- Custom field definitions stored in database
- User permissions for field management
- Better for multi-user environments

## Example Implementation: "Time Since Last Work Order"

### Step 1: Add Calculated Field Support
```typescript
const calculateTimeSinceLastWorkOrder = (assetId: string, workOrders: WorkOrder[]): number => {
  const assetWorkOrders = workOrders
    .filter(wo => wo.asset.id === assetId && wo.status === 'Completed')
    .sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime());
  
  if (assetWorkOrders.length === 0) return -1; // No work orders
  
  const lastWorkOrder = assetWorkOrders[0];
  const lastDate = lastWorkOrder.endTime || lastWorkOrder.startTime;
  const daysSince = Math.floor((new Date().getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSince;
};
```

### Step 2: Display in UI
```tsx
const AssetCard = ({ asset }: { asset: Asset }) => {
  const daysSinceLastWO = calculateTimeSinceLastWorkOrder(asset.id, workOrders);
  
  return (
    <div className="asset-card">
      <h3>{asset.name}</h3>
      <p>Location: {asset.location}</p>
      <p>Status: {asset.status}</p>
      {daysSinceLastWO >= 0 && (
        <p className={daysSinceLastWO > 30 ? 'text-red-600' : 'text-green-600'}>
          Days since last work order: {daysSinceLastWO}
        </p>
      )}
    </div>
  );
};
```

### Step 3: Add to Export
```typescript
case 'assets':
  csvContent = 'ID,Name,Location,Status,Last Maintenance,Days Since Last Work Order\n';
  Object.values(assets).forEach(asset => {
    const daysSince = calculateTimeSinceLastWorkOrder(asset.id, workOrders);
    const row = [
      asset.id,
      `"${asset.name}"`,
      `"${asset.location}"`,
      asset.status,
      asset.lastMaintenance,
      daysSince >= 0 ? daysSince : 'Never'
    ].join(',');
    csvContent += row + '\n';
  });
```

## Benefits of Custom Fields

1. **Flexibility**: Users can track any data relevant to their operations
2. **No Code Changes**: Add new fields without modifying source code
3. **Industry-Specific**: Manufacturing, facilities, fleet management can each customize
4. **Reporting**: Enhanced analytics and reporting capabilities
5. **Integration**: Better integration with existing systems
6. **AI-Powered Intelligence**: AI assistants understand custom business context
7. **Self-Service Analytics**: Managers create their own reports without IT
8. **Predictive Insights**: Custom fields enable AI to predict maintenance needs
9. **Executive Dashboards**: Automatic generation of C-level reports
10. **Competitive Advantage**: Unique insights specific to your business model

## Common Custom Field Examples

### Assets
- "Criticality Rating" (High/Medium/Low)
- "Warranty Expiration Date"
- "Purchase Date"
- "Vendor Information"
- "Operating Hours"
- "Next Scheduled Maintenance"

### Work Orders
- "Safety Requirements"
- "Required Certifications"
- "Environmental Impact"
- "Cost Estimate"
- "Parts Cost"
- "Labor Hours"

### Inventory
- "Vendor Part Number"
- "Lead Time (Days)"
- "Minimum Stock Level"
- "Storage Temperature"
- "Expiration Date"
- "Safety Data Sheet URL"

## Implementation Priority

1. **Start with calculated fields** (like "Time Since Last Work Order") ✅ DONE
2. **Add a few common predefined options** 
3. **Build the full custom field manager**
4. **Add AI assistant integration for field creation**
5. **Implement natural language reporting**
6. **Add predictive analytics based on custom fields**

## AI Integration Architecture

### Natural Language Field Creation
```typescript
interface AIFieldRequest {
  userQuery: string; // "I need to track energy efficiency"
  suggestedField: CustomField;
  reasoning: string;
  implementationSteps: string[];
}

const createFieldWithAI = async (query: string) => {
  const aiResponse = await aiAssistant.processFieldRequest(query);
  // AI suggests field type, options, calculations, etc.
  return aiResponse.suggestedField;
};
```

### Smart Report Generation
```typescript
interface ReportRequest {
  query: string; // "Show me maintenance costs by department"
  filters: Record<string, any>;
  customFields: string[];
  visualizations: ChartType[];
}

const generateCustomReport = async (request: ReportRequest) => {
  const report = await aiAssistant.createReport(request);
  // AI generates SQL-like queries against custom fields
  return report;
};
```

### Future AI Capabilities

1. **Predictive Maintenance**: AI analyzes custom fields to predict failures
2. **Cost Optimization**: AI identifies efficiency opportunities using custom metrics
3. **Compliance Tracking**: AI monitors custom fields for regulatory requirements
4. **Performance Benchmarking**: AI compares custom metrics across similar assets
5. **Executive Summaries**: AI generates C-level reports automatically

This approach allows incremental implementation while providing immediate value to users.
