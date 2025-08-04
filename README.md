# ChatterFix

AI-Powered Maintenance with Voice & OCR

## Features

- **Voice Interface**: Use voice commands to create work orders and log maintenance activities
- **OCR Scanner**: Scan equipment labels and part numbers with camera or file upload
- **AI Integration**: Get intelligent troubleshooting guidance and maintenance recommendations
- **Work Order Management**: Track maintenance tasks and resolution times
- **Inventory Management**: Monitor parts inventory and stock levels
- **Analytics Dashboard**: View maintenance metrics and efficiency insights

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd chatterfixcl
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Building for Production

```bash
npm run build
```

## Usage

### Voice Commands

- "I'm working on the [equipment name]" - Start a new work order
- "The [component] seems to be [problem]" - Report an issue
- "Problem is fixed, work complete" - Complete a work order

### OCR Scanner

1. Click "OCR Scanner" tab
2. Use "Start Camera" to capture equipment labels
3. Or use "Upload Image" to scan existing photos
4. AI will automatically analyze the text and provide maintenance guidance

### AI Configuration

1. Go to "AI Config" tab
2. Choose your AI provider (Claude, OpenAI, Ollama, or Custom)
3. Enter your API key (if required)
4. Test the connection and save

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (one-way operation)

## Browser Compatibility

- Chrome (recommended for voice recognition)
- Safari
- Edge
- Firefox (limited voice support)

## License

This project is licensed under the MIT License.
