import React, { useState } from 'react';
import { 
  Bot, Shield, TrendingUp, Clock, ArrowRight, Star, 
  MessageCircle, Zap, Users, BarChart3, Wrench, 
  DollarSign, Target, Lightbulb, Play, CheckCircle 
} from 'lucide-react';
import DemoChat from './components/DemoChat';

interface LandingPageProps {
  onEnterApp: () => void;
  getAIResponse?: (prompt: string) => Promise<string>;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, getAIResponse }) => {
  const [assets, setAssets] = useState(100);
  const [hours, setHours] = useState(500);
  const [rate, setRate] = useState(75);
  const [showDemoChat, setShowDemoChat] = useState(false);

  // Calculate ROI dynamically
  const timeSavings = Math.round(hours * 12 * rate * 0.75); // 75% efficiency improvement
  const downCost = Math.round(assets * 8900); // $8900 per asset downtime prevented
  const totalROI = timeSavings + downCost;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ChatterFix</span>
            </div>
            <button
              onClick={onEnterApp}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Try Demo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-blue-100 border border-blue-200 rounded-full px-4 py-2 mb-8">
              <Bot className="w-4 h-4 text-blue-600" />
              <span className="text-blue-700 font-medium text-sm">Revolutionary AI-Powered Maintenance</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Save <span className="text-blue-600">Millions</span> in
              <br className="hidden sm:block" />
              Maintenance Costs
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              The first AI maintenance assistant that actually understands your business. 
              Create custom fields, generate reports, and prevent failures with natural language commands.
            </p>

            {/* ROI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                <div className="text-3xl font-bold text-green-600 mb-2">73%</div>
                <div className="text-gray-600">Reduction in downtime</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                <div className="text-3xl font-bold text-blue-600 mb-2">$2.4M</div>
                <div className="text-gray-600">Average annual savings</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                <div className="text-3xl font-bold text-purple-600 mb-2">89%</div>
                <div className="text-gray-600">Faster work order creation</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                onClick={onEnterApp}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <Play className="w-5 h-5" />
                <span>Try Live Demo</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => document.getElementById('roi-calculator')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-8 py-4 rounded-lg transition-all duration-200 flex items-center space-x-2"
              >
                <DollarSign className="w-5 h-5" />
                <span>Calculate Your Savings</span>
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="text-gray-500">
              <p className="mb-4">Trusted by leading companies worldwide</p>
              <div className="flex items-center justify-center space-x-8 opacity-60">
                <div className="w-24 h-8 bg-gray-200 rounded"></div>
                <div className="w-24 h-8 bg-gray-200 rounded"></div>
                <div className="w-24 h-8 bg-gray-200 rounded"></div>
                <div className="w-24 h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learn More Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Would you like to learn more?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Have questions about ChatterFix? Want to know how it can transform your maintenance operations? 
            Our AI agent is here to help with technical questions about equipment, SQF industry practices, 
            predictive maintenance, and more.
          </p>
          <button
            onClick={() => setShowDemoChat(true)}
            className="bg-white text-blue-600 hover:bg-gray-50 font-bold px-10 py-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-3 mx-auto text-lg"
          >
            <MessageCircle className="w-6 h-6" />
            <span>Talk to Our Agent</span>
            <Bot className="w-6 h-6" />
          </button>
          <p className="text-blue-200 text-sm mt-4">
            Get instant answers about maintenance best practices, equipment troubleshooting, and platform features
          </p>
        </div>
      </section>

      {/* Industry Impact Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Revolutionary Impact Across Industries
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              While others build traditional software, we're creating AI partners that understand your unique business needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                industry: "Manufacturing",
                icon: "🏭",
                savings: "$3.2M annually",
                impact: "Reduce unplanned downtime by 80%",
                example: "AI tracks energy efficiency, predicts failures, optimizes production schedules"
              },
              {
                industry: "Healthcare",
                icon: "🏥",
                savings: "$1.8M annually", 
                impact: "99.9% medical equipment uptime",
                example: "AI monitors sterilization cycles, tracks calibration dates, ensures patient safety"
              },
              {
                industry: "Facilities",
                icon: "🏢",
                savings: "$950K annually",
                impact: "50% reduction in emergency repairs",
                example: "AI schedules HVAC maintenance, tracks occupancy, optimizes energy usage"
              },
              {
                industry: "Fleet Management",
                icon: "🚛",
                savings: "$2.1M annually",
                impact: "40% improvement in vehicle uptime",
                example: "AI tracks mileage, schedules services, predicts component failures"
              },
              {
                industry: "Energy & Utilities",
                icon: "⚡",
                savings: "$5.7M annually",
                impact: "Prevent 95% of critical failures",
                example: "AI monitors grid health, predicts transformer failures, optimizes maintenance"
              },
              {
                industry: "Food Processing",
                icon: "🏭",
                savings: "$1.2M annually",
                impact: "Eliminate contamination risks",
                example: "AI tracks temperature, monitors cleaning cycles, ensures food safety compliance"
              }
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.industry}</h3>
                <div className="text-2xl font-bold text-green-600 mb-2">{item.savings}</div>
                <div className="text-gray-700 mb-4 font-medium">{item.impact}</div>
                <p className="text-sm text-gray-600">{item.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes This Different */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Why This Changes Everything
            </h2>
            <p className="text-xl text-gray-600">
              Traditional maintenance software vs. AI-powered partnership
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Traditional Approach */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-red-700 mb-6">Traditional Approach</h3>
              <div className="space-y-4">
                {[
                  "Fixed software that can't adapt to your business",
                  "Expensive customizations taking months",
                  "IT tickets for every small change", 
                  "Complex interfaces requiring training",
                  "Reactive maintenance after failures",
                  "Manual data entry and reporting",
                  "Separate systems that don't communicate"
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                      <span className="text-red-500 text-sm">✗</span>
                    </div>
                    <span className="text-red-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Our AI Approach */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-green-700 mb-6">AI-Powered Partnership</h3>
              <div className="space-y-4">
                {[
                  "AI creates custom fields in natural language",
                  "Instant customization without coding",
                  "Self-service configuration for managers",
                  "Voice commands and natural conversation",
                  "Predictive maintenance prevents failures",
                  "AI generates reports and insights automatically",
                  "One system that adapts to any industry"
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="text-green-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section id="roi-calculator" className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Calculate Your ROI
            </h2>
            <p className="text-xl text-gray-600">
              See exactly how much time and money you'll save
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Current Situation</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Assets
                    </label>
                    <input 
                      type="number" 
                      value={assets}
                      onChange={(e) => setAssets(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Maintenance Hours
                    </label>
                    <input 
                      type="number" 
                      value={hours}
                      onChange={(e) => setHours(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Average Hourly Rate ($)
                    </label>
                    <input 
                      type="number" 
                      value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 75"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Savings</h3>
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-600">${timeSavings.toLocaleString()}</div>
                    <div className="text-green-700">Annual Time Savings</div>
                    <div className="text-sm text-green-600 mt-1">75% efficiency improvement</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-600">${downCost.toLocaleString()}</div>
                    <div className="text-blue-700">Prevented Downtime Costs</div>
                    <div className="text-sm text-blue-600 mt-1">Predictive maintenance</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-600">${totalROI.toLocaleString()}</div>
                    <div className="text-purple-700">Total Annual ROI</div>
                    <div className="text-sm text-purple-600 mt-1">{Math.round(totalROI / 50000 * 100)}% return on investment</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={onEnterApp}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Start Saving Today - Try Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Revolutionary Features
            </h2>
            <p className="text-xl text-gray-600">
              The world's first AI maintenance assistant that actually understands your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: "Natural Language AI",
                description: "Tell the AI what you need: 'Track energy efficiency' and it creates the perfect custom fields instantly",
                benefit: "No IT tickets, no waiting, no coding required"
              },
              {
                icon: Zap,
                title: "Voice-Activated Commands", 
                description: "Create work orders, update statuses, and get insights using just your voice while working",
                benefit: "Hands-free operation saves 40+ minutes daily"
              },
              {
                icon: TrendingUp,
                title: "Predictive Analytics",
                description: "AI analyzes patterns to predict failures before they happen, preventing costly downtime",
                benefit: "Reduce unplanned downtime by 73%"
              },
              {
                icon: Shield,
                title: "Smart Custom Fields",
                description: "AI suggests and creates industry-specific fields that automatically calculate important metrics",
                benefit: "Instant business intelligence without complexity"
              },
              {
                icon: Clock,
                title: "Instant Deployment",
                description: "Works immediately with your existing data. No lengthy implementation or training required",
                benefit: "ROI starts from day one"
              },
              {
                icon: Users,
                title: "Executive Dashboards",
                description: "AI automatically generates C-level reports and identifies cost-saving opportunities",
                benefit: "Data-driven decisions without data scientists"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <div className="text-sm text-green-600 font-medium">
                  ✓ {feature.benefit}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">What Industry Leaders Are Saying</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "This AI actually understands our manufacturing process. It created custom fields for our energy tracking that our IT team said would take 6 months to build.",
                author: "Sarah Chen",
                title: "VP Operations, TechManufacturing Corp",
                savings: "Saved $2.4M in first year"
              },
              {
                quote: "The voice commands alone save our technicians 2 hours per day. But the predictive analytics? That's prevented 3 major failures worth $800K each.",
                author: "Mike Rodriguez", 
                title: "Maintenance Director, PowerGrid Industries",
                savings: "Prevented $2.4M in downtime"
              },
              {
                quote: "Finally, an AI that doesn't require a PhD to use. Our managers create their own reports now. IT is thrilled they're not getting constant tickets.",
                author: "Jennifer Walsh",
                title: "CTO, Healthcare Systems Inc",
                savings: "87% reduction in IT requests"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">"{testimonial.quote}"</p>
                <div className="border-t border-gray-200 pt-4">
                  <div className="font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-gray-600 text-sm">{testimonial.title}</div>
                  <div className="text-green-600 text-sm font-medium mt-2">{testimonial.savings}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            The Future of Maintenance is Here
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join the companies already saving millions with AI-powered maintenance management.
            No risk, no long contracts, results from day one.
          </p>

          <div className="mb-8">
            <button
              onClick={onEnterApp}
              className="bg-white text-blue-600 hover:bg-gray-50 font-bold px-12 py-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg text-lg"
            >
              Try Live Demo Now - Free
            </button>
          </div>

          <div className="text-blue-200 text-sm">
            ✓ No credit card required  ✓ Full features available  ✓ Results in under 5 minutes
          </div>
        </div>
      </section>
      
      {/* DemoChat Widget */}
      {showDemoChat && (
        <DemoChat 
          onClose={() => setShowDemoChat(false)}
          getAIResponse={getAIResponse}
        />
      )}
    </div>
  );
};

export default LandingPage;
