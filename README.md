# ChatterFix

AI-Powered Asset Management & Maintenance Platform

## Overview

ChatterFix is a comprehensive asset management and maintenance platform that combines AI-powered assistance, voice interfaces, document management, and real-time analytics to streamline maintenance operations.

## 🚀 Features

### 🎯 **Core Components**
- **Enhanced Asset Manager**: Complete asset lifecycle management with KPIs and analytics
- **Work Order Management**: Track maintenance tasks, schedules, and completion rates
- **Document Manager**: Cloud-based document storage with AI-powered search
- **AI Onboarding Wizard**: Step-by-step setup with intelligent assistance
- **Voice Interface**: Hands-free operation for field technicians
- **Real-time Analytics**: Performance metrics and maintenance insights

### 🧠 **AI Integration**
- Intelligent troubleshooting guidance
- Predictive maintenance recommendations
- Natural language chat assistance
- Voice command processing
- Document analysis and indexing

### 📊 **Analytics & KPIs**
- Asset reliability tracking
- Maintenance compliance monitoring
- Cost analysis and trends
- Performance benchmarking
- Utilization rate optimization

## 🏗 Architecture

### Frontend
- **React** + **TypeScript** + **Tailwind CSS**
- Responsive design with mobile support
- Real-time data updates
- Progressive Web App capabilities

### Backend
- **FastAPI** + **Python**
- **Google Cloud Run** deployment
- **RESTful API** design
- Comprehensive error handling

### Storage
- **Google Cloud Storage** for documents
- **Firestore** for metadata and analytics
- **Cloud Build** for CI/CD

## 🚀 Quick Start

### Prerequisites
- Node.js (version 16 or higher)
- Python 3.11+
- Google Cloud account (for deployment)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TheGringo-ai/chatterfixcl.git
   cd chatterfixcl
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API URLs and keys
   ```

4. **Start development server:**
   ```bash
   npm start
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

## 🛠 Development

### Frontend Development
```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
```

### Backend Development
```bash
cd docker
pip install -r requirements.txt
uvicorn main:app --reload
```

### Deployment
```bash
# Deploy backend to Google Cloud Run
./docker/deploy.sh

# Deploy frontend to Netlify
npm run build
# Upload build/ folder to Netlify
```

## 📋 Available Scripts

- `npm start` - Development server with hot reload
- `npm test` - Run test suite
- `npm run build` - Production build
- `npm run eject` - Eject from Create React App

## 🌐 API Endpoints

### Assets
- `GET /assets` - List all assets
- `POST /assets` - Create new asset
- `PUT /assets/{id}` - Update asset
- `DELETE /assets/{id}` - Remove asset

### Work Orders
- `GET /workorders` - List work orders
- `POST /workorders` - Create work order
- `PUT /workorders/{id}` - Update work order

### Documents
- `POST /upload` - Upload document
- `GET /documents` - List documents
- `GET /search` - Search documents

### AI Chat
- `POST /chat` - AI assistance endpoint

## 🎮 Usage

### Asset Management
1. Navigate to "Assets" tab
2. View asset dashboard with real-time KPIs
3. Add new assets or edit existing ones
4. Track reliability and maintenance schedules

### Work Orders
1. Create work orders from the dashboard
2. Assign to technicians
3. Track progress and completion
4. Monitor overdue items

### Document Management
1. Upload maintenance manuals and documents
2. Use AI-powered search to find information
3. Organize by asset or category

### Voice Commands
- "Show me critical assets"
- "Create work order for [equipment]"
- "What's the status of [asset]?"

## 🔧 Configuration

### Environment Variables
```bash
REACT_APP_STORAGE_API_URL=https://your-api-url.com
REACT_APP_LLAMA_API_URL=https://your-llama-api.com
```

### Google Cloud Setup
1. Create Google Cloud project
2. Enable Cloud Storage and Firestore APIs
3. Set up service account credentials
4. Configure Cloud Run deployment

## 🌍 Browser Support

- ✅ Chrome (recommended for voice features)
- ✅ Safari
- ✅ Edge
- ✅ Firefox
- 📱 Mobile browsers

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For questions and support:
- Create an issue on GitHub
- Contact: [your-email@domain.com]

---

**ChatterFix** - Revolutionizing maintenance with AI-powered intelligence.
