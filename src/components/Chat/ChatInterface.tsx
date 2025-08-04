import React, { useEffect, useRef } from 'react';
import { Bot, User, AlertCircle } from 'lucide-react';
import { ChatMessage } from '../../types';
import LoadingSpinner from '../LoadingSpinner';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isProcessing?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, isProcessing }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getMessageIcon = (type: ChatMessage['type']) => {
    switch (type) {
      case 'user':
        return <User className="w-5 h-5" />;
      case 'ai':
        return <Bot className="w-5 h-5" />;
      case 'system':
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getMessageStyles = (type: ChatMessage['type']) => {
    switch (type) {
      case 'user':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'bg-blue-500 text-white',
          text: 'text-gray-800'
        };
      case 'ai':
        return {
          container: 'bg-green-50 border-green-200',
          icon: 'bg-green-500 text-white',
          text: 'text-gray-800'
        };
      case 'system':
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'bg-gray-500 text-white',
          text: 'text-gray-700'
        };
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-xl font-bold text-gray-900">AI Assistant Chat</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No messages yet. Start by using voice commands or scanning equipment!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const styles = getMessageStyles(message.type);
              return (
                <div
                  key={index}
                  className={`flex items-start space-x-3 p-4 rounded-lg border ${styles.container} animate-fade-in`}
                >
                  <div className={`p-2 rounded-full ${styles.icon}`}>
                    {getMessageIcon(message.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm capitalize">
                        {message.type === 'ai' ? 'ChatterFix AI' : message.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className={`${styles.text} whitespace-pre-wrap`}>
                      {message.message}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {isProcessing && (
              <div className="flex items-center space-x-3 p-4">
                <div className="p-2 rounded-full bg-green-500">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <LoadingSpinner size="small" message="AI is thinking..." />
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatInterface;