import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  Brain, Zap, Clock, Target, Activity, Gauge,
  Calendar, DollarSign, Wrench, BarChart3
} from 'lucide-react';

interface PredictiveAlert {
  id: string;
  assetId: string;
  assetName: string;
  prediction: {
    failureType: string;
    probability: number;
    timeToFailure: number; // days
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  recommendation: {
    action: string;
    priority: string;
    estimatedCost: number;
    preventiveMaintenance: string[];
    partsNeeded: string[];
  };
  dataPoints: {
    vibration?: number;
    temperature?: number;
    pressure?: number;
    runtime?: number;
    efficiency?: number;
  };
  createdAt: string;
}

interface PredictiveMaintenanceEngineProps {
  getAIResponse: (prompt: string, context?: string) => Promise<string>;
}

const PredictiveMaintenanceEngine: React.FC<PredictiveMaintenanceEngineProps> = ({ getAIResponse }) => {
  const [predictions, setPredictions] = useState<PredictiveAlert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Mock asset data - in real implementation, this would come from IoT sensors
  const mockAssetData = [
    {
      id: 'pump-001',
      name: 'Main Production Pump',
      type: 'Centrifugal Pump',
      location: 'Production Floor A',
      sensors: {
        vibration: 4.2, // mm/s (normal: <3.5)
        temperature: 85, // °C (normal: <75)
        pressure: 45, // PSI (normal: 40-50)
        runtime: 8760, // hours
        efficiency: 87 // %
      },
      maintenanceHistory: [
        { date: '2025-07-15', type: 'Bearing replacement', cost: 1200 },
        { date: '2025-06-01', type: 'Impeller cleaning', cost: 300 },
        { date: '2025-04-10', type: 'Seal replacement', cost: 800 }
      ]
    },
    {
      id: 'motor-015',
      name: 'Conveyor Drive Motor',
      type: 'AC Motor',
      location: 'Assembly Line 3',
      sensors: {
        vibration: 2.8,
        temperature: 68,
        pressure: null,
        runtime: 12450,
        efficiency: 92
      },
      maintenanceHistory: [
        { date: '2025-08-01', type: 'Lubrication', cost: 150 },
        { date: '2025-05-20', type: 'Belt replacement', cost: 400 }
      ]
    },
    {
      id: 'compressor-007',
      name: 'Air Compressor Unit 7',
      type: 'Rotary Screw Compressor',
      location: 'Utility Room B',
      sensors: {
        vibration: 6.1, // High!
        temperature: 95, // High!
        pressure: 120, // PSI
        runtime: 15600,
        efficiency: 78 // Low!
      },
      maintenanceHistory: [
        { date: '2025-03-15', type: 'Oil change', cost: 200 },
        { date: '2024-12-10', type: 'Filter replacement', cost: 100 }
      ]
    }
  ];

  useEffect(() => {
    runPredictiveAnalysis();
  }, []);

  const runPredictiveAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    const newPredictions: PredictiveAlert[] = [];
    
    for (let i = 0; i < mockAssetData.length; i++) {
      const asset = mockAssetData[i];
      setAnalysisProgress(((i + 1) / mockAssetData.length) * 100);
      
      // AI-powered failure prediction
      const prompt = `
        Analyze this equipment data for predictive maintenance:
        
        Asset: ${asset.name} (${asset.type})
        Location: ${asset.location}
        
        Current Sensor Readings:
        - Vibration: ${asset.sensors.vibration} mm/s (normal: <3.5)
        - Temperature: ${asset.sensors.temperature}°C (normal: <75)
        - Pressure: ${asset.sensors.pressure || 'N/A'} PSI
        - Runtime: ${asset.sensors.runtime} hours
        - Efficiency: ${asset.sensors.efficiency}%
        
        Recent Maintenance History:
        ${asset.maintenanceHistory.map(h => `- ${h.date}: ${h.type} ($${h.cost})`).join('\n')}
        
        Predict:
        1. Most likely failure mode
        2. Probability percentage (0-100%)
        3. Days until failure
        4. Confidence level (0-100%)
        5. Risk level (low/medium/high/critical)
        6. Recommended preventive action
        7. Estimated repair cost
        8. Parts likely needed
        
        Format as JSON with these exact keys:
        {
          "failureType": "string",
          "probability": number,
          "timeToFailure": number,
          "confidence": number,
          "riskLevel": "low|medium|high|critical",
          "recommendedAction": "string",
          "estimatedCost": number,
          "partsNeeded": ["part1", "part2"]
        }
      `;
      
      try {
        const aiResponse = await getAIResponse(prompt);
        
        // Parse AI response
        let prediction = null;
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            prediction = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error('Failed to parse AI prediction:', e);
        }
        
        // Create prediction with AI data or fallback logic
        if (prediction) {
          const alert: PredictiveAlert = {
            id: `pred-${asset.id}-${Date.now()}`,
            assetId: asset.id,
            assetName: asset.name,
            prediction: {
              failureType: prediction.failureType || 'Unknown failure',
              probability: prediction.probability || 0,
              timeToFailure: prediction.timeToFailure || 365,
              confidence: prediction.confidence || 50,
              riskLevel: prediction.riskLevel || 'low'
            },
            recommendation: {
              action: prediction.recommendedAction || 'Schedule inspection',
              priority: prediction.riskLevel === 'critical' ? 'urgent' : 'normal',
              estimatedCost: prediction.estimatedCost || 500,
              preventiveMaintenance: [prediction.recommendedAction || 'General inspection'],
              partsNeeded: prediction.partsNeeded || []
            },
            dataPoints: asset.sensors,
            createdAt: new Date().toISOString()
          };
          
          newPredictions.push(alert);
        }
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error('AI prediction failed for asset:', asset.name, error);
        
        // Fallback prediction based on sensor thresholds
        const alert: PredictiveAlert = {
          id: `pred-${asset.id}-${Date.now()}`,
          assetId: asset.id,
          assetName: asset.name,
          prediction: {
            failureType: asset.sensors.vibration > 5 ? 'Bearing failure' : 
                        asset.sensors.temperature > 85 ? 'Overheating' : 'Normal wear',
            probability: asset.sensors.vibration > 5 ? 85 : 
                        asset.sensors.temperature > 85 ? 75 : 25,
            timeToFailure: asset.sensors.vibration > 5 ? 14 : 
                          asset.sensors.temperature > 85 ? 30 : 180,
            confidence: 80,
            riskLevel: asset.sensors.vibration > 5 || asset.sensors.temperature > 85 ? 'high' : 'low'
          },
          recommendation: {
            action: asset.sensors.vibration > 5 ? 'Replace bearings immediately' : 
                   asset.sensors.temperature > 85 ? 'Check cooling system' : 'Continue monitoring',
            priority: asset.sensors.vibration > 5 ? 'urgent' : 'normal',
            estimatedCost: asset.sensors.vibration > 5 ? 1500 : 300,
            preventiveMaintenance: ['Visual inspection', 'Lubrication check'],
            partsNeeded: asset.sensors.vibration > 5 ? ['Bearing set', 'Gaskets'] : []
          },
          dataPoints: asset.sensors,
          createdAt: new Date().toISOString()
        };
        
        newPredictions.push(alert);
      }
    }
    
    setPredictions(newPredictions);
    setIsAnalyzing(false);
    setAnalysisProgress(100);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (probability: number) => {
    if (probability > 70) return <TrendingUp className="w-5 h-5 text-red-500" />;
    if (probability > 40) return <Activity className="w-5 h-5 text-orange-500" />;
    return <TrendingDown className="w-5 h-5 text-green-500" />;
  };

  const criticalPredictions = predictions.filter(p => p.prediction.riskLevel === 'critical');
  const highRiskPredictions = predictions.filter(p => p.prediction.riskLevel === 'high');
  const totalPotentialSavings = predictions.reduce((sum, p) => sum + p.recommendation.estimatedCost * 2, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Brain className="w-8 h-8 mr-3" />
              AI Predictive Maintenance Engine
            </h1>
            <p className="text-purple-100 mt-2">
              Advanced failure prediction powered by Llama AI - preventing failures before they happen
            </p>
          </div>
          <button
            onClick={runPredictiveAnalysis}
            disabled={isAnalyzing}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-purple-50 disabled:opacity-50 flex items-center"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600 mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Run Analysis
              </>
            )}
          </button>
        </div>
        
        {isAnalyzing && (
          <div className="mt-4">
            <div className="bg-white bg-opacity-20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${analysisProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-purple-100 mt-2">
              Analyzing equipment data with AI... {Math.round(analysisProgress)}%
            </p>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Critical Alerts</p>
              <p className="text-2xl font-bold text-red-600">{criticalPredictions.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">High Risk Assets</p>
              <p className="text-2xl font-bold text-orange-600">{highRiskPredictions.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Potential Savings</p>
              <p className="text-2xl font-bold text-green-600">${totalPotentialSavings.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Predictions Made</p>
              <p className="text-2xl font-bold text-blue-600">{predictions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Predictions List */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">AI Failure Predictions</h2>
          <p className="text-gray-600">Equipment failure predictions ranked by urgency</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {predictions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Run AI analysis to generate predictive maintenance alerts</p>
            </div>
          ) : (
            predictions
              .sort((a, b) => {
                const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return (riskOrder[b.prediction.riskLevel as keyof typeof riskOrder] || 0) - 
                       (riskOrder[a.prediction.riskLevel as keyof typeof riskOrder] || 0);
              })
              .map((prediction) => (
                <div key={prediction.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {getTrendIcon(prediction.prediction.probability)}
                        <h3 className="text-lg font-semibold text-gray-900 ml-2">
                          {prediction.assetName}
                        </h3>
                        <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(prediction.prediction.riskLevel)}`}>
                          {prediction.prediction.riskLevel.toUpperCase()} RISK
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Predicted Failure</p>
                          <p className="font-medium text-gray-900">{prediction.prediction.failureType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Failure Probability</p>
                          <p className="font-medium text-gray-900">{prediction.prediction.probability}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Time to Failure</p>
                          <p className="font-medium text-gray-900">{prediction.prediction.timeToFailure} days</p>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                          <Wrench className="w-4 h-4 mr-2" />
                          AI Recommendation
                        </h4>
                        <p className="text-blue-800">{prediction.recommendation.action}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-blue-700">
                          <span>Estimated Cost: ${prediction.recommendation.estimatedCost.toLocaleString()}</span>
                          <span>Confidence: {prediction.prediction.confidence}%</span>
                        </div>
                        {prediction.recommendation.partsNeeded.length > 0 && (
                          <div className="mt-2">
                            <span className="text-sm text-blue-700">Parts needed: </span>
                            <span className="text-sm text-blue-800 font-medium">
                              {prediction.recommendation.partsNeeded.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-6">
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Maintenance
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictiveMaintenanceEngine;