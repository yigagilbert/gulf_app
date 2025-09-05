import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthProvider';
import APIService from '../services/APIService';
import OnboardingWizard from './OnboardingWizard';
import ClientDashboard from './ClientDashboard';
import LoadingSpinner from './LoadingSpinner';

const OnboardingCheck = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      setLoading(true);
      
      // Check onboarding status
      const onboardingStatus = await APIService.request('/profile/me/onboarding-status');
      
      setNeedsOnboarding(onboardingStatus.needs_onboarding);
      setOnboardingComplete(onboardingStatus.is_complete);
      
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // If error, assume they need onboarding
      setNeedsOnboarding(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
    setOnboardingComplete(true);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // If user needs onboarding, show onboarding wizard
  if (needsOnboarding && !onboardingComplete) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  // Otherwise, show the regular client dashboard
  return <ClientDashboard />;
};

export default OnboardingCheck;