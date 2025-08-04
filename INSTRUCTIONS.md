# ChatterFix - Complete User Instructions

## 🚀 Getting Started

ChatterFix is an AI-powered maintenance management system with voice commands, OCR scanning, and comprehensive data management. This guide will walk you through every feature.

**Live Demo:** https://chatterfix.netlify.app

---

## 📋 Table of Contents

1. [Initial Setup](#initial-setup)
2. [Voice Interface](#voice-interface)
3. [Work Order Management](#work-order-management)
4. [OCR Scanner](#ocr-scanner)
5. [Inventory Management](#inventory-management)
6. [Data Management & CSV Import/Export](#data-management--csv-importexport)
7. [AI Configuration](#ai-configuration)
8. [Analytics Dashboard](#analytics-dashboard)
9. [Custom Fields (NEW)](#custom-fields-new)
9. [CSV File Formats](#csv-file-formats)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Initial Setup

### First Time Users

1. **Open ChatterFix** in your web browser: https://chatterfix.netlify.app
2. **Allow Microphone Access** when prompted (for voice features)
3. **Set Company Information**:
   - Go to "Data Management" tab
   - Update Company Name, Location, and Setup Date
   - This personalizes your installation

### Data Persistence

- **Automatic Saving**: All your data is automatically saved to browser storage
- **No Data Loss**: Your work orders, assets, and inventory persist between sessions
- **Multiple Devices**: Each browser/device maintains its own data

---

## 🎤 Voice Interface

### Basic Voice Commands

**Starting Work:**
- "I'm working on the [equipment name]"
- "Starting maintenance on [asset name]"

**Reporting Issues:**
- "The vacuum seal is leaking"
- "Motor making unusual noise"
- "Temperature is too high"

**Completing Work:**
- "Problem is fixed, work complete"
- "Finished maintenance"
- "Work order done"

### Voice Interface Features

1. **Click the Blue Microphone Button** to start listening
2. **Speak Clearly** - the system will show what it hears
3. **AI Response** - Get intelligent troubleshooting guidance
4. **Active Work Orders** - Track time automatically
5. **Test Buttons** - Use example commands if voice isn't working

### Voice Tips

- **Browser Compatibility**: Works best in Chrome, Edge, Safari
- **Microphone Permissions**: Allow when prompted
- **Clear Speech**: Speak directly into microphone
- **Background Noise**: Use in quiet environments for best results

---

## 📝 Work Order Management

### Creating Work Orders

#### Method 1: Voice Commands
1. Go to "Voice Interface" tab
2. Say: "I'm working on [equipment name]"
3. System automatically creates work order

#### Method 2: Work Order Form
1. Go to "Work Order Form" tab
2. Fill out the form:
   - **Select Asset**: Choose from dropdown
   - **Title**: Brief description
   - **Priority**: Low/Medium/High/Critical
   - **Category**: Maintenance type
   - **Description**: Detailed problem description
   - **Required Parts**: Add parts needed
   - **Notes**: Additional information

### Work Order Status

- **Pending**: Newly created, not started
- **In Progress**: Currently being worked on
- **Completed**: Finished with resolution

### Viewing Work Orders

1. Go to "Work Orders" tab
2. See all work orders with:
   - Asset information
   - Status and timing
   - Descriptions and resolutions
   - Technician assignments

---

## 📷 OCR Scanner

### Using the OCR Scanner

1. **Go to "OCR Scanner" tab**
2. **Choose Input Method**:
   - **Camera**: Click "Start Camera" → "Capture Photo"
   - **File Upload**: Click "Upload Image" → Select file

### What OCR Can Read

- Equipment nameplates
- Part numbers
- Serial numbers
- Model information
- Manufacturer labels
- Specifications

### OCR Results

The system extracts:
- **Manufacturer & Model**
- **Serial Numbers**
- **Part Numbers**
- **Equipment Type**
- **Specifications**

### Creating Work Orders from OCR

1. **Scan equipment** using camera or upload
2. **Review extracted information**
3. **Click "Create Work Order"** to start maintenance
4. **AI provides** equipment-specific guidance

### OCR Tips

- **Good Lighting**: Ensure labels are well-lit
- **Clear Focus**: Hold camera steady
- **Perpendicular Angle**: Capture text straight-on
- **High Resolution**: Use clear, high-quality images

---

## 📦 Inventory Management

### Adding New Parts

1. **Go to "Inventory" tab**
2. **Use "Add New Part" form**:
   - Part Name
   - Stock Quantity
   - Location (e.g., "Shelf A-12")
   - Cost per unit
3. **Click "Add"**

### Managing Stock Levels

- **Click on any stock number** to edit inline
- **Auto Reorder Alerts**: Parts ≤2 stock show "reorder needed"
- **Stock Updates**: Real-time inventory tracking

### Inventory Features

- **Smart Reordering**: Automatic low-stock detection
- **Location Tracking**: Know exactly where parts are stored
- **Cost Management**: Track part costs and budgets
- **Quick Access**: Add parts directly from work order forms

---

## 💾 Data Management & CSV Import/Export

### Company Information

1. **Go to "Data Management" tab**
2. **Update Company Information**:
   - Company Name
   - Location
   - Setup Date

### CSV Import/Export

#### Assets Management

**Import Assets:**
1. Go to "Data Management" tab
2. Click "Import Assets CSV"
3. Select your CSV file
4. Data automatically imported

**Export Assets:**
1. Click "Export Assets CSV"
2. File downloads automatically
3. Use for backup or integration

#### Inventory Management

**Import Inventory:**
1. Click "Import Inventory CSV"
2. Upload your parts database
3. Automatic stock level detection

**Export Inventory:**
1. Click "Export Inventory CSV"
2. Get current inventory snapshot
3. Share with purchasing systems

#### Work Orders

**Export Work Orders:**
- Download complete work order history
- Track maintenance patterns
- Generate reports

### Data Reset Options

**Reset to Demo Data:**
- Clears all custom data
- Restores original demo content
- Use for training or fresh start

**Export Backup First:**
- Downloads all your data before reset
- Protects against data loss
- Recommended safety measure

---

## 🤖 AI Configuration

### Setting Up AI

1. **Go to "AI Config" tab**
2. **Choose AI Provider**:
   - **Anthropic Claude**: Best for complex reasoning
   - **OpenAI GPT**: Excellent general AI
   - **Ollama**: Self-hosted, privacy-focused
   - **Custom API**: Your own AI service

### Configuration Steps

1. **Select Provider**: Click on your preferred option
2. **Enter API Key**: (if required by provider)
3. **Choose Model**: Select from available models
4. **Test Connection**: Verify setup works
5. **Save Configuration**: Enable AI features

### AI Providers Comparison

| Provider | Cost | Privacy | Setup | Best For |
|----------|------|---------|-------|----------|
| Claude | Paid | Cloud | Easy | Complex troubleshooting |
| OpenAI | Paid | Cloud | Easy | General maintenance |
| Ollama | Free | Local | Medium | Privacy-focused |
| Custom | Varies | Varies | Advanced | Enterprise integration |

### AI Features

- **Intelligent Troubleshooting**: Equipment-specific guidance
- **Parts Recommendations**: Smart inventory suggestions
- **Maintenance Scheduling**: Predictive maintenance advice
- **Problem Diagnosis**: Symptom-based analysis

---

## 🎛️ Custom Fields (NEW)

### Overview

ChatterFix now supports custom calculated fields that automatically enhance your asset data with maintenance insights. This feature demonstrates how users could add any custom variable to track their specific operational needs.

### Currently Available Custom Fields

#### Days Since Last Work Order
- **Type**: Calculated field
- **Description**: Automatically calculates days since the last completed work order for each asset
- **Where to See**: Data Management tab, CSV exports
- **Use Case**: Identify assets that may need preventive maintenance

#### Average Work Order Duration
- **Type**: Calculated field  
- **Description**: Calculates average time to complete work orders for each asset
- **Use Case**: Estimate future work planning and resource allocation

#### Total Work Orders Count
- **Type**: Calculated field
- **Description**: Counts all work orders (completed and pending) for each asset
- **Use Case**: Track maintenance frequency and asset reliability

### How to Use Custom Fields

1. **View in Data Management Tab**:
   - Enhanced asset table shows all custom fields
   - Color-coded indicators (red = overdue, yellow = attention needed, green = good)
   - Real-time calculation based on work order history

2. **Export with CSV**:
   - Custom fields automatically included in CSV exports
   - Use exported data for external analysis or reporting
   - Enhanced spreadsheets for management reporting

3. **Track Over Time**:
   - Complete work orders to see "Days Since Last Work Order" update
   - Monitor average durations to optimize maintenance processes
   - Use counts to identify high-maintenance assets

### Custom Field Implementation Example

**Example Scenario**: "Time Since Last Work Order"

```typescript
// This is how easy it was to add this custom field:
const calculateTimeSinceLastWorkOrder = (assetId: string): number => {
  const assetWorkOrders = workOrders
    .filter(wo => wo.asset.id === assetId && wo.status === 'Completed')
    .sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime());
  
  if (assetWorkOrders.length === 0) return -1; // No completed work orders
  
  const lastWorkOrder = assetWorkOrders[0];
  const lastDate = lastWorkOrder.endTime || lastWorkOrder.startTime;
  const daysSince = Math.floor((new Date().getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSince;
};
```

### Future Custom Field Possibilities

#### Field Types That Could Be Added:
- **Text Fields**: Equipment notes, vendor information, serial numbers
- **Number Fields**: Operating hours, capacity ratings, temperature limits  
- **Date Fields**: Warranty expiration, purchase dates, next scheduled maintenance
- **Dropdown Fields**: Criticality level (High/Medium/Low), department assignments
- **Boolean Fields**: Safety certified, weatherproof, critical asset
- **Calculated Fields**: Maintenance cost per hour, efficiency ratios, uptime percentage

#### Common Business Examples:
- **Manufacturing**: "Operating Hours Since Last Service", "Production Capacity Utilization"
- **Facilities**: "Room Temperature", "Occupancy Level", "Energy Efficiency Rating"
- **Fleet Management**: "Miles Since Last Service", "Fuel Efficiency", "Driver Safety Score"
- **Healthcare**: "Sterilization Cycle Count", "Calibration Due Date", "Patient Usage Hours"

### Implementation Complexity

**Adding "Time Since Last Work Order" took about 30 lines of code and can be done in 1-2 hours.**

**Full custom field system would include:**
- ✅ **Level 1 (2-4 hours)**: Add specific hardcoded calculated fields
- ⚡ **Level 2 (1-2 days)**: Semi-configurable system with predefined field options users can enable/disable
- 🚀 **Level 3 (3-5 days)**: Fully customizable field management system where users can create any field type

### Benefits

1. **No Code Changes**: Add tracking for new metrics without modifying the core application
2. **Industry Flexibility**: Customize for manufacturing, facilities, fleet, healthcare, etc.
3. **Enhanced Reporting**: Better data for management decisions and compliance
4. **Integration Ready**: Custom fields export to CSV for external system integration
5. **Real-time Insights**: Automatically calculated fields update as data changes

---

## 📊 Analytics Dashboard

### Key Metrics

- **Total Work Orders**: Track maintenance volume
- **Average Resolution Time**: Measure efficiency
- **Parts Low Stock**: Monitor inventory health
- **Efficiency Insights**: Performance recommendations

### Using Analytics

1. **Go to "Analytics" tab**
2. **Review Dashboard Metrics**
3. **Identify Trends**:
   - Frequent equipment issues
   - Part usage patterns
   - Maintenance efficiency
4. **Make Data-Driven Decisions**

---

## 📁 CSV File Formats

### Assets CSV Format
```csv
ID,Name,Location,Status,Last Maintenance
AST-001,"Production Line 1","Floor A",Running,2024-07-15
AST-002,"Compressor Unit","Floor B",Warning,2024-06-20
AST-003,"Conveyor Belt #3","Floor C",Maintenance,2024-07-01
```

**Required Fields:**
- **ID**: Unique asset identifier
- **Name**: Equipment name
- **Location**: Physical location
- **Status**: Running/Warning/Maintenance/Down
- **Last Maintenance**: YYYY-MM-DD format

### Inventory CSV Format
```csv
Part Name,Stock,Location,Cost,Order Needed
"Motor Belt",15,"Shelf A-1",25.50,No
"Oil Filter",3,"Shelf B-5",12.99,No
"Hydraulic Fluid",1,"Storage Room",45.99,Yes
"Vacuum Pump Seal",5,"Shelf A-12",45.50,No
```

**Required Fields:**
- **Part Name**: Name of the part
- **Stock**: Current quantity
- **Location**: Storage location
- **Cost**: Price per unit
- **Order Needed**: Yes/No (auto-calculated if stock ≤2)

### Work Orders CSV Export Format
```csv
ID,Asset Name,Location,Status,Technician,Description,Start Time,End Time,Duration,Resolution
WO-001,"Multivac AIS","Floor A",Completed,"John Doe","Vacuum seal replacement","2024-08-01T10:00:00Z","2024-08-01T11:30:00Z",90,"Replaced vacuum pump seals"
```

**Export Fields:**
- Complete work order history
- Time tracking data
- Resolution details
- Asset information

---

## 🔧 Troubleshooting

### Voice Commands Not Working

**Issue**: Microphone not responding
**Solutions**:
1. **Check Browser**: Use Chrome, Edge, or Safari
2. **Allow Permissions**: Click "Allow" for microphone access
3. **Check Settings**: Verify microphone works in other apps
4. **Use Test Buttons**: Try example commands instead

**Issue**: Voice not recognized accurately
**Solutions**:
1. **Speak Clearly**: Enunciate words
2. **Reduce Background Noise**: Find quiet environment
3. **Check Microphone**: Ensure it's close to your mouth
4. **Try Different Phrases**: Use alternative commands

### CSV Import Issues

**Issue**: CSV file not importing
**Solutions**:
1. **Check Format**: Match exact column headers
2. **Remove Extra Columns**: Only include required fields
3. **Check Quotes**: Use quotes around text with commas
4. **Verify Encoding**: Save as UTF-8 CSV

**Issue**: Data not appearing after import
**Solutions**:
1. **Refresh Page**: Reload to see imported data
2. **Check File Size**: Ensure file isn't empty
3. **Verify Format**: Match CSV examples exactly
4. **Browser Console**: Check for error messages

### OCR Scanner Problems

**Issue**: Camera not working
**Solutions**:
1. **Allow Camera Access**: Click "Allow" when prompted
2. **Check Browser**: Ensure camera permissions enabled
3. **Try File Upload**: Use existing photos instead
4. **Different Browser**: Test in Chrome or Edge

**Issue**: OCR not reading text
**Solutions**:
1. **Better Lighting**: Ensure good illumination
2. **Higher Resolution**: Use clearer images
3. **Straight Angle**: Capture text perpendicularly
4. **Clean Labels**: Wipe dust/dirt from nameplates

### AI Not Responding

**Issue**: AI says "not configured"
**Solutions**:
1. **Go to AI Config**: Set up your AI provider
2. **Enter API Key**: Add your service credentials
3. **Test Connection**: Verify setup works
4. **Save Configuration**: Enable AI features

### Data Not Saving

**Issue**: Data resets after browser restart
**Solutions**:
1. **Check Browser Storage**: Ensure LocalStorage enabled
2. **Clear Cache**: Sometimes helps reset storage
3. **Try Different Browser**: Test in another browser
4. **Export Backup**: Download data for safety

---

## 💡 Best Practices

### For Maintenance Teams

1. **Start with Voice**: Use voice commands in the field
2. **Complete with Forms**: Add details using work order forms
3. **Scan Equipment**: Use OCR for accurate part identification
4. **Update Inventory**: Keep stock levels current
5. **Review Analytics**: Check efficiency metrics weekly

### For Managers

1. **Import Company Data**: Start with CSV import for assets/inventory
2. **Configure AI**: Set up AI provider for intelligent assistance
3. **Monitor Analytics**: Track team performance and trends
4. **Export Reports**: Regular CSV exports for reporting
5. **Backup Data**: Regular exports for data protection

### For IT Administrators

1. **Browser Requirements**: Chrome, Edge, or Safari recommended
2. **Permissions**: Ensure microphone/camera access allowed
3. **Data Privacy**: Local storage only, no cloud by default
4. **CSV Templates**: Prepare standard formats for import
5. **User Training**: Train teams on voice commands and workflows

---

## 🆘 Support & Resources

### Getting Help

- **Built-in Help**: Each tab has instruction tooltips
- **CSV Examples**: Data Management tab shows format examples
- **Test Features**: Use demo buttons to test functionality
- **Error Messages**: System provides specific error guidance

### Advanced Features

- **API Integration**: Ready for CMMS/ERP connections
- **Custom AI Models**: Enterprise AI provider support
- **Bulk Operations**: CSV import/export for large datasets
- **Mobile Friendly**: Works on tablets and phones

### Updates & Maintenance

- **Auto-Updates**: System updates automatically
- **Data Persistence**: Your data survives updates
- **New Features**: Regular feature additions
- **Bug Fixes**: Continuous improvements

---

## 🎯 Quick Start Checklist

### Day 1: Setup
- [ ] Open ChatterFix application
- [ ] Allow microphone/camera permissions
- [ ] Set company information
- [ ] Configure AI provider (optional)

### Day 2: Data Import
- [ ] Prepare CSV files for assets and inventory
- [ ] Import your company's asset database
- [ ] Import parts inventory
- [ ] Test voice commands

### Day 3: Team Training
- [ ] Train team on voice commands
- [ ] Show work order form features
- [ ] Demonstrate OCR scanning
- [ ] Practice inventory management

### Ongoing Use
- [ ] Create work orders daily
- [ ] Update inventory regularly
- [ ] Export data weekly for backup
- [ ] Review analytics monthly

---

**Need more help?** The system provides context-sensitive help in each section, and all features include example data to help you get started quickly.

**Happy Maintaining!** 🔧✨
