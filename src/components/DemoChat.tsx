import React, { useState } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';

interface DemoChatProps {
  onClose: () => void;
  getAIResponse?: (prompt: string) => Promise<string>;
}

const DemoChat: React.FC<DemoChatProps> = ({ onClose, getAIResponse }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m ChatterFix AI. Ask me about equipment maintenance, troubleshooting, or asset management!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      let aiResponse: string = '';
      
      if (getAIResponse) {
        // Use the passed-in AI function
        aiResponse = await getAIResponse(currentInput);
      } else {
        // Fallback to direct API call
        const llamaApiUrl = process.env.REACT_APP_LLAMA_API_URL;
        
        if (!llamaApiUrl) {
          aiResponse = "AI service is not available. Please contact support.";
        } else {
          const response = await fetch(`${llamaApiUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: "llama3.2:1b",
              messages: [
                {
                  role: "system", 
                  content: "You are ChatterFix AI, an expert assistant for maintenance, asset management, and work orders. Provide helpful, practical advice for equipment maintenance, troubleshooting, and asset management. Keep responses concise and actionable."
                },
                ...messages.map(msg => ({ role: msg.role, content: msg.content })),
                { role: 'user', content: currentInput }
              ],
              max_tokens: 150,
              temperature: 0.7
            })
          });

          if (response.ok) {
            const data = await response.json();
            aiResponse = data.choices?.[0]?.message?.content || 'Sorry, I could not process your request.';
          } else {
            aiResponse = 'Sorry, I encountered an error. Please try again.';
          }
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse.trim() }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">ChatterFix AI Demo</span>
        </div>
        <button onClick={onClose} className="text-white hover:text-gray-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about maintenance, assets, or troubleshooting..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoChat;
