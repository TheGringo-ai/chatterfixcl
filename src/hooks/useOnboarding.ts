import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_STORAGE_KEY = 'chatterfix-onboarding-completed';

export const useOnboarding = (totalSteps: number) => {
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      const completedBool = completed === 'true';
      setHasCompletedOnboarding(completedBool);
    } catch (error) {
      console.error("Failed to read onboarding status from localStorage", error);
      setHasCompletedOnboarding(false);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finishOnboarding();
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const finishOnboarding = useCallback(() => {
    setIsOnboardingActive(false);
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error("Failed to save onboarding status to localStorage", error);
    }
  }, []);

  const startOnboarding = useCallback(() => {
    setCurrentStep(0);
    setIsOnboardingActive(true);
  }, []);

  return {
    isOnboardingActive,
    currentStep,
    nextStep,
    prevStep,
    finishOnboarding,
    startOnboarding,
    hasCompletedOnboarding,
  };
};
