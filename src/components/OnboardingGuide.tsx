import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface OnboardingStep {
  title: string;
  content: string;
  targetId: string;
}

interface OnboardingGuideProps {
  steps: OnboardingStep[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  isActive: boolean;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({
  steps,
  currentStep,
  onNext,
  onPrev,
  onFinish,
  isActive,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (isActive && step) {
      const targetElement = document.getElementById(step.targetId);
      if (targetElement) {
        setTargetRect(targetElement.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    }
  }, [isActive, step]);

  if (!isActive || !step) return null;

  const getTooltipPosition = () => {
    if (!targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
    const top = targetRect.bottom + 10;
    const left = targetRect.left + targetRect.width / 2;
    return {
      top: `${top}px`,
      left: `${left}px`,
      transform: 'translateX(-50%)',
    };
  };

  const highlightStyle: React.CSSProperties = targetRect
    ? {
        position: 'fixed',
        top: `${targetRect.top - 4}px`,
        left: `${targetRect.left - 4}px`,
        width: `${targetRect.width + 8}px`,
        height: `${targetRect.height + 8}px`,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        zIndex: 10000,
        pointerEvents: 'none',
        transition: 'all 0.3s ease-in-out',
      }
    : {};

  return (
    <>
      <div style={highlightStyle} />
      <div
        style={getTooltipPosition()}
        className="fixed z-[10001] bg-white p-5 rounded-lg shadow-2xl max-w-sm w-full animate-fade-in"
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-gray-800">{step.title}</h3>
          <button onClick={onFinish} className="text-gray-400 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">{step.content}</p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </span>
          <div className="flex items-center space-x-2">
            {currentStep > 0 && (
              <button
                onClick={onPrev}
                className="flex items-center text-sm px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <ChevronLeft size={16} className="mr-1" />
                Previous
              </button>
            )}
            <button
              onClick={currentStep === steps.length - 1 ? onFinish : onNext}
              className="flex items-center text-sm px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight size={16} className="ml-1" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingGuide;
