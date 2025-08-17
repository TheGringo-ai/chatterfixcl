# 🎤📸 Voice & OCR Integration Guide

## Overview

ChatterFix CMMS now includes comprehensive voice commands and OCR (Optical Character Recognition) capabilities throughout the work order management system, making it perfect for field technicians who need hands-free operation.

## 🎤 Voice Features

### Voice Work Order Creation
- **Location**: Work Orders Dashboard → "Voice Create" button
- **Usage**: Speak naturally to create work orders
- **Examples**:
  - "Create work order for conveyor belt maintenance at production line A, high priority"
  - "Motor bearing replacement needed on pump 3 in building B"
  - "Schedule preventive maintenance for HVAC unit on second floor"

### Voice Work Order Updates
- **Location**: Technician Dashboard → Select work order → "Voice Update" button
- **Usage**: Add notes, report issues, request parts
- **Examples**:
  - "Add note: replaced air filter, system running normally"
  - "Status update: waiting for parts delivery"
  - "Found additional issue with belt tensioner"

### Voice Work Order Completion
- **Location**: Technician Dashboard → In-progress work order → "Voice Complete" button
- **Usage**: Report completion details, parts used, time taken
- **Examples**:
  - "Work completed, replaced motor bearing, tested operation, all systems normal"
  - "Finished repair, used parts: bearing, gasket, lubricant, 2 hours total time"
  - "Maintenance complete, equipment operational, no issues found"

## 📸 OCR Features

### Equipment Tag Scanning
- **Usage**: Scan equipment nameplates, serial numbers, model numbers
- **Location**: Available in all voice interfaces
- **Features**:
  - Live camera scanning with overlay guides
  - Upload existing photos
  - AI-powered text extraction and interpretation
  - Automatic work order attachment

### Part Number Recognition
- **Usage**: Scan part labels, maintenance manuals, error codes
- **Benefits**:
  - Automatic part identification
  - Integration with inventory system
  - Reduces manual data entry errors

## 🔧 Setup Instructions

### 1. Configure Your Llama API

Copy the environment configuration:
```bash
cp .env.example .env.local
```

Edit `.env.local` and set your Llama API URL:
```env
# Replace with your actual Llama API endpoint
REACT_APP_LLAMA_API_URL=https://your-llama-api.com/api/v1

# OR for local development
REACT_APP_LLAMA_API_URL=http://localhost:8000
```

### 2. Llama API Requirements

Your Llama API should accept POST requests to `/chat` with this format:
```json
{
  "prompt": "Create a work order for motor maintenance",
  "context": "Previous conversation context",
  "max_tokens": 500,
  "temperature": 0.7
}
```

Expected response format:
```json
{
  "response": "AI generated response",
  "content": "Alternative response field",
  "message": "Another alternative field"
}
```

### 3. Browser Permissions

Voice and camera features require browser permissions:
- **Microphone**: For voice recognition
- **Camera**: For OCR scanning
- **HTTPS**: Required for production use

## 🚀 Usage Workflow

### Typical Field Technician Workflow:

1. **Start Work**:
   - Open Technician Dashboard
   - Pick up available work order OR get assigned work order
   - Click "Check In" to start timer

2. **Document Work (Voice)**:
   - Click "Voice Update" 
   - Speak: "Started work, found worn bearing in motor housing"
   - AI processes and adds structured note

3. **Scan Equipment (OCR)**:
   - Use "Scan Equipment Tag" 
   - Point camera at nameplate/serial number
   - AI extracts model info, part numbers
   - Information auto-added to work order

4. **Complete Work (Voice)**:
   - Click "Voice Complete"
   - Speak: "Replaced bearing, used part number 12345, tested motor, all systems operational, 2.5 hours total"
   - Work order marked complete with structured data

## 🎯 Voice Command Best Practices

### Effective Voice Commands:
- **Be Specific**: Include asset names, locations, part numbers
- **Use Clear Language**: Avoid mumbling, speak at normal pace
- **Provide Context**: Mention relevant details like priority, urgency
- **State Actions Clearly**: "Replace", "Repair", "Inspect", "Test"

### Example Structured Commands:
```
"Create high priority work order for pump motor replacement at facility building A production line 2, estimated 4 hours, requires electrician"

"Update work order: discovered additional leak in hydraulic line, need to order seal kit part number HYD-456, work on hold until parts arrive"

"Work completed: replaced motor starter, tested all operations, used parts: starter unit MS-789, circuit breaker CB-123, total time 3 hours, equipment fully operational"
```

## 🔍 OCR Scanning Tips

### Best Scanning Practices:
- **Good Lighting**: Ensure adequate lighting on the equipment tag
- **Steady Camera**: Hold device steady for clear image capture
- **Focus on Text**: Center the nameplate/label in the scanning area
- **Clean Surface**: Wipe dirt/grease from tags if possible

### What to Scan:
- Equipment nameplates with model/serial numbers
- Part numbers on components
- Error codes on digital displays
- Maintenance instruction labels
- Safety warning tags

## 🤖 AI Integration Features

### Intelligent Processing:
- **Context Awareness**: AI understands maintenance terminology
- **Structured Data Extraction**: Converts speech to organized work order data
- **Smart Categorization**: Automatically assigns priorities and categories
- **Part Number Recognition**: Links scanned parts to inventory
- **Time Estimation**: Suggests realistic completion times

### Fallback Handling:
- Works offline with cached responses
- Graceful degradation when AI unavailable
- Manual override options always available
- Error handling with helpful suggestions

## 📱 Mobile Optimization

### Touch-Free Operation:
- Large voice activation buttons
- Voice feedback for confirmation
- Hands-free navigation between screens
- Audio cues for successful actions

### Field-Ready Design:
- High contrast UI for outdoor visibility
- Large touch targets for gloved hands
- Offline capability for remote locations
- Battery-efficient voice processing

## 🔧 Troubleshooting

### Common Issues:

**Voice Not Working:**
- Check microphone permissions
- Ensure HTTPS connection
- Try clearing browser cache
- Test with different browser

**OCR Not Detecting Text:**
- Improve lighting conditions
- Clean equipment tag surface
- Try different camera angle
- Use file upload as alternative

**AI Not Responding:**
- Check REACT_APP_LLAMA_API_URL configuration
- Verify API endpoint is accessible
- Check network connectivity
- Review browser console for errors

### Development Testing:
```bash
# Test voice recognition
console.log('webkitSpeechRecognition' in window)

# Test camera access
navigator.mediaDevices.getUserMedia({ video: true })

# Test AI endpoint
fetch(process.env.REACT_APP_LLAMA_API_URL + '/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'test' })
})
```

## 🔮 Future Enhancements

### Planned Features:
- Multi-language voice recognition
- Advanced OCR with AI interpretation
- Voice-controlled navigation
- Smart part ordering via voice
- Predictive maintenance suggestions
- Integration with IoT sensors

The voice and OCR integration makes ChatterFix CMMS a truly modern, field-ready maintenance management system that adapts to how technicians actually work.