import React, { useState, useEffect } from 'react';
import { 
  User, Phone, MapPin, Users, FileText, Heart, Briefcase, GraduationCap,
  ChevronRight, ChevronLeft, Check, AlertCircle, Save, UserCheck, Building
} from 'lucide-react';
import APIService from '../services/APIService';
import { useAuth } from '../AuthProvider';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';

const OnboardingWizard = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    // Personal Information (BIO DATA)
    first_name: '',
    middle_name: '',
    last_name: '',
    age: '',
    gender: '',
    tribe: '',
    date_of_birth: '',
    place_of_birth: '',
    present_address: '',
    subcounty: '',
    district: '',
    marital_status: '',
    number_of_kids: '',
    height: '',
    weight: '',
    position_applied_for: '',
    religion: '',
    nationality: '',
    
    // Contact Information
    contact_1: '',
    contact_2: '',
    
    // Official Documents
    nin: '',
    passport_number: '',
    
    // Next of Kin
    next_of_kin_name: '',
    next_of_kin_contact_1: '',
    next_of_kin_contact_2: '',
    next_of_kin_address: '',
    next_of_kin_subcounty: '',
    next_of_kin_district: '',
    next_of_kin_relationship: '',
    next_of_kin_age: '',
    
    // Father's Information
    father_name: '',
    father_contact_1: '',
    father_contact_2: '',
    father_address: '',
    father_subcounty: '',
    father_district: '',
    
    // Mother's Information
    mother_name: '',
    mother_contact_1: '',
    mother_contact_2: '',
    mother_address: '',
    mother_subcounty: '',
    mother_district: '',
    
    // Agent Information
    agent_name: '',
    agent_contact: '',
    
    // Legacy fields for backward compatibility
    phone_primary: '',
    phone_secondary: '',
    address_current: '',
    address_permanent: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: ''
  });

  const steps = [
    {
      id: 'personal',
      title: 'Personal Information',
      description: 'Basic information about you',
      icon: User,
      fields: [
        'first_name', 'middle_name', 'last_name', 'age', 'gender', 'tribe',
        'date_of_birth', 'place_of_birth', 'nationality', 'religion'
      ]
    },
    {
      id: 'physical',
      title: 'Physical & Personal Details',
      description: 'Additional personal information',
      icon: UserCheck,
      fields: [
        'marital_status', 'number_of_kids', 'height', 'weight', 'position_applied_for'
      ]
    },
    {
      id: 'location',
      title: 'Location Information',
      description: 'Where do you live?',
      icon: MapPin,
      fields: [
        'present_address', 'subcounty', 'district'
      ]
    },
    {
      id: 'contact',
      title: 'Contact Information',
      description: 'How can we reach you?',
      icon: Phone,
      fields: ['contact_1', 'contact_2']
    },
    {
      id: 'documents',
      title: 'Official Documents',
      description: 'Your identification details',
      icon: FileText,
      fields: ['nin', 'passport_number']
    },
    {
      id: 'next_of_kin',
      title: 'Next of Kin',
      description: 'Emergency contact person',
      icon: Heart,
      fields: [
        'next_of_kin_name', 'next_of_kin_contact_1', 'next_of_kin_contact_2',
        'next_of_kin_address', 'next_of_kin_subcounty', 'next_of_kin_district',
        'next_of_kin_relationship', 'next_of_kin_age'
      ]
    },
    {
      id: 'father',
      title: "Father's Information",
      description: 'Information about your father',
      icon: Users,
      fields: [
        'father_name', 'father_contact_1', 'father_contact_2',
        'father_address', 'father_subcounty', 'father_district'
      ]
    },
    {
      id: 'mother',
      title: "Mother's Information",
      description: 'Information about your mother',
      icon: Users,
      fields: [
        'mother_name', 'mother_contact_1', 'mother_contact_2',
        'mother_address', 'mother_subcounty', 'mother_district'
      ]
    },
    {
      id: 'agent',
      title: 'Agent Information',
      description: 'Your recruitment agent details',
      icon: Building,
      fields: ['agent_name', 'agent_contact']
    }
  ];

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const profile = await APIService.getProfile();
      if (profile) {
        setFormData(prevData => ({
          ...prevData,
          ...profile
        }));
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const saveCurrentStep = async (showSuccessMessage = true) => {
    setSaving(true);
    setError(null);

    try {
      const currentStepData = {};
      steps[currentStep].fields.forEach(field => {
        if (formData[field]) {
          currentStepData[field] = formData[field];
        }
      });

      await APIService.updateProfile(currentStepData);
      
      if (showSuccessMessage) {
        setSuccess('Progress saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
      
    } catch (err) {
      setError('Failed to save progress. Please try again.');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const validateCurrentStep = () => {
    const currentStepFields = steps[currentStep].fields;
    const requiredFields = {
      personal: ['first_name', 'last_name', 'date_of_birth', 'gender', 'nationality'],
      physical: ['marital_status', 'position_applied_for'],
      location: ['present_address', 'district'],
      contact: ['contact_1'],
      documents: ['nin'],
      next_of_kin: ['next_of_kin_name', 'next_of_kin_contact_1', 'next_of_kin_relationship'],
      father: ['father_name'],
      mother: ['mother_name'],
      agent: [] // Optional step
    };

    const stepRequiredFields = requiredFields[steps[currentStep].id] || [];
    
    for (const field of stepRequiredFields) {
      if (!formData[field] || formData[field].toString().trim() === '') {
        return false;
      }
    }
    return true;
  };
  // Field configuration for dynamic rendering
  const fieldConfig = {
    // Personal Information
    first_name: { label: 'First Name', type: 'text', required: true, placeholder: 'Enter your first name' },
    middle_name: { label: 'Middle Name', type: 'text', placeholder: 'Enter your middle name (optional)' },
    last_name: { label: 'Last Name', type: 'text', required: true, placeholder: 'Enter your last name' },
    age: { label: 'Age', type: 'number', placeholder: 'Enter your age' },
    gender: { label: 'Gender', type: 'select', required: true, options: [
      { value: '', label: 'Select gender' },
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other', label: 'Other' }
    ]},
    tribe: { label: 'Tribe', type: 'text', placeholder: 'Enter your tribe' },
    date_of_birth: { label: 'Date of Birth', type: 'date', required: true },
    place_of_birth: { label: 'Place of Birth', type: 'text', placeholder: 'Enter your place of birth' },
    nationality: { label: 'Nationality', type: 'text', required: true, placeholder: 'Enter your nationality' },
    religion: { label: 'Religion', type: 'text', placeholder: 'Enter your religion' },
    
    // Physical & Personal Details
    marital_status: { label: 'Marital Status', type: 'select', required: true, options: [
      { value: '', label: 'Select marital status' },
      { value: 'single', label: 'Single' },
      { value: 'married', label: 'Married' },
      { value: 'divorced', label: 'Divorced' },
      { value: 'widowed', label: 'Widowed' }
    ]},
    number_of_kids: { label: 'Number of Kids', type: 'number', placeholder: 'Enter number of children' },
    height: { label: 'Height', type: 'text', placeholder: 'e.g., 5\'8" or 173cm' },
    weight: { label: 'Weight', type: 'text', placeholder: 'e.g., 70kg' },
    position_applied_for: { label: 'Position Applied For', type: 'text', required: true, placeholder: 'Enter the job position you are applying for' },
    
    // Location Information
    present_address: { label: 'Present Address/Village', type: 'textarea', required: true, placeholder: 'Enter your current address' },
    subcounty: { label: 'Subcounty', type: 'text', placeholder: 'Enter your subcounty' },
    district: { label: 'District', type: 'text', required: true, placeholder: 'Enter your district' },
    
    // Contact Information
    contact_1: { label: 'Primary Contact', type: 'tel', required: true, placeholder: 'Enter your primary phone number' },
    contact_2: { label: 'Secondary Contact', type: 'tel', placeholder: 'Enter your secondary phone number (optional)' },
    
    // Official Documents
    nin: { label: 'National ID Number (NIN)', type: 'text', required: true, placeholder: 'Enter your NIN' },
    passport_number: { label: 'Passport Number', type: 'text', placeholder: 'Enter your passport number (if available)' },
    
    // Next of Kin
    next_of_kin_name: { label: 'Name of Next of Kin', type: 'text', required: true, placeholder: 'Enter next of kin name' },
    next_of_kin_contact_1: { label: 'Next of Kin Contact 1', type: 'tel', required: true, placeholder: 'Enter primary contact' },
    next_of_kin_contact_2: { label: 'Next of Kin Contact 2', type: 'tel', placeholder: 'Enter secondary contact (optional)' },
    next_of_kin_address: { label: 'Next of Kin Address', type: 'textarea', placeholder: 'Enter next of kin address' },
    next_of_kin_subcounty: { label: 'Next of Kin Subcounty', type: 'text', placeholder: 'Enter subcounty' },
    next_of_kin_district: { label: 'Next of Kin District', type: 'text', placeholder: 'Enter district' },
    next_of_kin_relationship: { label: 'Relationship', type: 'text', required: true, placeholder: 'e.g., Father, Mother, Sibling, Spouse' },
    next_of_kin_age: { label: 'Next of Kin Age', type: 'number', placeholder: 'Enter age' },
    
    // Father's Information
    father_name: { label: "Father's Name", type: 'text', required: true, placeholder: "Enter your father's name" },
    father_contact_1: { label: "Father's Contact 1", type: 'tel', placeholder: "Enter father's primary contact" },
    father_contact_2: { label: "Father's Contact 2", type: 'tel', placeholder: "Enter father's secondary contact" },
    father_address: { label: "Father's Address", type: 'textarea', placeholder: "Enter father's address" },
    father_subcounty: { label: "Father's Subcounty", type: 'text', placeholder: "Enter subcounty" },
    father_district: { label: "Father's District", type: 'text', placeholder: "Enter district" },
    
    // Mother's Information
    mother_name: { label: "Mother's Name", type: 'text', required: true, placeholder: "Enter your mother's name" },
    mother_contact_1: { label: "Mother's Contact 1", type: 'tel', placeholder: "Enter mother's primary contact" },
    mother_contact_2: { label: "Mother's Contact 2", type: 'tel', placeholder: "Enter mother's secondary contact" },
    mother_address: { label: "Mother's Address", type: 'textarea', placeholder: "Enter mother's address" },
    mother_subcounty: { label: "Mother's Subcounty", type: 'text', placeholder: "Enter subcounty" },
    mother_district: { label: "Mother's District", type: 'text', placeholder: "Enter district" },
    
    // Agent Information
    agent_name: { label: 'Agent Name', type: 'text', placeholder: "Enter your recruitment agent's name" },
    agent_contact: { label: 'Agent Contact', type: 'tel', placeholder: "Enter agent's contact number" }
  };

  const renderField = (fieldName) => {
    const config = fieldConfig[fieldName];
    if (!config) return null;

    const baseInputClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
    
    return (
      <div key={fieldName} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {config.label} {config.required && <span className="text-red-500">*</span>}
        </label>
        
        {config.type === 'select' ? (
          <select
            value={formData[fieldName] || ''}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className={baseInputClasses}
          >
            {config.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : config.type === 'textarea' ? (
          <textarea
            value={formData[fieldName] || ''}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className={`${baseInputClasses} h-20 resize-none`}
            placeholder={config.placeholder}
            rows={3}
          />
        ) : (
          <input
            type={config.type}
            value={formData[fieldName] || ''}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className={baseInputClasses}
            placeholder={config.placeholder}
            min={config.type === 'number' ? 0 : undefined}
          />
        )}
      </div>
    );
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) {
      setError('Please fill in all required fields before continuing.');
      return;
    }

    await saveCurrentStep(false);
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);

    try {
      await APIService.request('/profile/me/onboard', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      setSuccess('Onboarding completed successfully!');
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2000);
      
    } catch (err) {
      setError('Failed to complete onboarding. Please try again.');
      console.error('Onboarding error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <step.icon className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
          <p className="text-gray-600">{step.description}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {step.fields.map(fieldName => renderField(fieldName))}
        </div>
      </div>
    );
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {error && <Toast type="error" message={error} />}
      {success && <Toast type="success" message={success} />}
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-24 w-24 mb-6 flex items-center justify-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_mobile-recruit/artifacts/58ezwzoy_gulf.png" 
              alt="Gulf Consultants Logo" 
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Gulf Consultants!</h1>
          <p className="text-gray-600">Your Travel Partner - Let's complete your profile to find the perfect job opportunities abroad.</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center space-x-4 md:space-x-0 md:flex-col md:text-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <div className="md:mt-2">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 hidden md:block">
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => saveCurrentStep()}
                disabled={saving}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Progress'}
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </button>
              
              <button
                onClick={handleNext}
                disabled={loading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
                {currentStep === steps.length - 1 ? (
                  <Check className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronRight className="h-4 w-4 ml-2" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            You can save your progress at any time and come back later to complete missing information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;