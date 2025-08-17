import { useState, useCallback } from 'react';

interface ErrorState {
  error: Error | null;
  isError: boolean;
  errorMessage: string;
}

interface UseErrorHandlerReturn {
  error: Error | null;
  isError: boolean;
  errorMessage: string;
  setError: (error: Error | string | null) => void;
  clearError: () => void;
  handleError: (error: Error | unknown) => void;
  withErrorHandler: <T extends (...args: any[]) => Promise<any>>(
    asyncFunction: T
  ) => T;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    errorMessage: '',
  });

  const setError = useCallback((error: Error | string | null) => {
    if (error === null) {
      setErrorState({
        error: null,
        isError: false,
        errorMessage: '',
      });
    } else if (typeof error === 'string') {
      const errorObj = new Error(error);
      setErrorState({
        error: errorObj,
        isError: true,
        errorMessage: error,
      });
    } else {
      setErrorState({
        error,
        isError: true,
        errorMessage: error.message || 'An unexpected error occurred',
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      errorMessage: '',
    });
  }, []);

  const handleError = useCallback((error: Error | unknown) => {
    console.error('Error caught by error handler:', error);
    
    if (error instanceof Error) {
      setError(error);
    } else if (typeof error === 'string') {
      setError(error);
    } else {
      setError('An unexpected error occurred');
    }
  }, [setError]);

  const withErrorHandler = useCallback(<T extends (...args: any[]) => Promise<any>>(
    asyncFunction: T
  ): T => {
    return (async (...args: Parameters<T>) => {
      try {
        clearError();
        return await asyncFunction(...args);
      } catch (error) {
        handleError(error);
        throw error;
      }
    }) as T;
  }, [clearError, handleError]);

  return {
    ...errorState,
    setError,
    clearError,
    handleError,
    withErrorHandler,
  };
};