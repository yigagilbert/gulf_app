import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthProvider';
import APIService from '../services/APIService';
import OnboardingWizard from './OnboardingWizard';
import ClientDashboard from './ClientDashboard';
import LoadingSpinner from './LoadingSpinner';

const OnboardingCheck = () => {
  const { user, initialized } = useAuth();
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only check onboarding status after auth is initialized and user is available
    if (initialized && user) {
      checkOnboardingStatus();
    }
  }, [initialized, user]);

  const checkOnboardingStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check onboarding status
      const onboardingStatus = await APIService.getOnboardingStatus();
      
      setNeedsOnboarding(onboardingStatus.needs_onboarding);
      setOnboardingComplete(onboardingStatus.is_complete);
      
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      setError('Failed to load onboarding status');
      // If error, assume they need onboarding for safety
      setNeedsOnboarding(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
    setOnboardingComplete(true);
  };

  // Show loading while auth is initializing or onboarding status is being checked
  if (!initialized || loading) {
    return <LoadingSpinner fullScreen />;
  }

  // If no user somehow, redirect will be handled by parent component
  if (!user) {
    return <LoadingSpinner fullScreen />;
  }

  // Show error state if onboarding check failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={checkOnboardingStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If user needs onboarding, show onboarding wizard
  if (needsOnboarding && !onboardingComplete) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  // Otherwise, show the regular client dashboard
  return <ClientDashboard />;
};

export default OnboardingCheck;