'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building,
  Shield,
  FileText,
  AlertCircle,
  Check,
  Upload,
} from 'lucide-react';
import LoadingIndicator from '@/components/LoadingIndicator';
import type { InstitutionType } from '@/types/admin';

interface FormData {
  institution_type: InstitutionType | '';
  institution_name: string;
  institution_identifier: string;
  jurisdiction_area: string;
  emergency_types: string[];
  admin_full_name: string;
  admin_email: string;
  admin_phone: string;
  notes?: string;
}

const INSTITUTION_TYPES = [
  { value: 'police', label: 'Police Department', icon: '👮' },
  { value: 'hospital', label: 'Hospital', icon: '🏥' },
  { value: 'fire_department', label: 'Fire Department', icon: '🚒' },
  { value: 'ambulance_service', label: 'Ambulance Service', icon: '🚑' },
  { value: 'government_agency', label: 'Government Agency', icon: '🏛️' },
  { value: 'ngo', label: 'Non-Governmental Organization', icon: '🤝' },
  { value: 'other', label: 'Other', icon: '📋' },
];

const EMERGENCY_TYPES = [
  { value: 'fire', label: 'Fire', icon: '🔥' },
  { value: 'medical', label: 'Medical Emergency', icon: '🩺' },
  { value: 'accident', label: 'Accident/Trauma', icon: '🚗' },
  { value: 'drowning', label: 'Drowning/Water Rescue', icon: '🏊' },
  { value: 'violence', label: 'Violence/Crime', icon: '⚠️' },
  { value: 'disaster', label: 'Natural Disaster', icon: '⛈️' },
  { value: 'search_rescue', label: 'Search & Rescue', icon: '🔍' },
  { value: 'hazmat', label: 'Hazmat/Chemical', icon: '☢️' },
];

export default function SecondaryAdminSignupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    institution_type: '',
    institution_name: '',
    institution_identifier: '',
    jurisdiction_area: '',
    emergency_types: [],
    admin_full_name: '',
    admin_email: user?.email || '',
    admin_phone: '',
    notes: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Institution, 2: Emergency types, 3: Documents

  // Redirect if not logged in
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingIndicator label="Loading..." />
      </div>
    );
  }

  if (!user) {
    router.replace('/landing');
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingIndicator label="Redirecting..." />
      </div>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEmergencyTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      emergency_types: prev.emergency_types.includes(type)
        ? prev.emergency_types.filter(t => t !== type)
        : [...prev.emergency_types, type],
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.institution_type) {
      toast.error('Please select an institution type');
      return;
    }
    if (!formData.institution_name.trim()) {
      toast.error('Please enter institution name');
      return;
    }
    if (!formData.institution_identifier.trim()) {
      toast.error('Please enter institution ID/License number');
      return;
    }
    if (!formData.jurisdiction_area.trim()) {
      toast.error('Please enter jurisdiction area');
      return;
    }
    if (formData.emergency_types.length === 0) {
      toast.error('Please select at least one emergency type');
      return;
    }
    if (!formData.admin_full_name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!formData.admin_phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      // 1. Create institution if it doesn't exist
      const { data: institutionData, error: institutionError } = await supabase
        .from('institutions')
        .insert([
          {
            name: formData.institution_name,
            type: formData.institution_type,
            identifier: formData.institution_identifier,
            jurisdiction_area: formData.jurisdiction_area,
          },
        ])
        .select()
        .single();

      if (institutionError) {
        throw new Error(`Failed to create institution: ${institutionError.message}`);
      }

      // 2. Create admin profile
      const { data: profileData, error: profileError } = await supabase
        .from('admin_profiles')
        .insert([
          {
            user_id: user.id,
            institution_id: institutionData.id,
            status: 'pending_verification',
            emergency_types: formData.emergency_types,
            notes: formData.notes,
          },
        ])
        .select()
        .single();

      if (profileError) {
        throw new Error(`Failed to create admin profile: ${profileError.message}`);
      }

      // 3. Upload verification documents
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const fileName = `${user.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('verification_documents')
            .upload(fileName, file);

          if (uploadError) {
            console.error('File upload error:', uploadError);
            continue;
          }

          // Get public URL
          const { data } = supabase.storage
            .from('verification_documents')
            .getPublicUrl(fileName);

          // Save document reference
          await supabase.from('verification_documents').insert([
            {
              admin_id: profileData.id,
              document_type: 'other',
              file_url: data.publicUrl,
              file_name: file.name,
            },
          ]);
        }
      }

      // 4. Update user profile with admin info
      await supabase
        .from('profiles')
        .update({
          full_name: formData.admin_full_name,
          phone: formData.admin_phone,
        })
        .eq('id', user.id);

      toast.success('✅ Application submitted successfully! Please wait for verification.');
      router.push('/admin/signup/confirmation');
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit application'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 pt-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-accent hover:text-primary transition mb-6"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-primary" size={32} />
            <h1 className="text-3xl font-bold text-primary">Admin Registration</h1>
          </div>
          <p className="text-accent text-sm">
            Register your institution as a verified responder
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex gap-4 justify-center">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition ${
                step >= s
                  ? 'bg-primary text-background'
                  : 'bg-surface-secondary text-accent'
              }`}
            >
              {step > s ? <Check size={20} /> : s}
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Institution Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-surface-secondary rounded-lg p-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-primary mb-6">
                  <Building size={24} />
                  Institution Information
                </h2>

                {/* Institution Type Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-accent mb-3">
                    Institution Type *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {INSTITUTION_TYPES.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setFormData(prev => ({
                            ...prev,
                            institution_type: type.value as InstitutionType,
                          }))
                        }
                        className={`p-4 rounded-lg border-2 transition text-left ${
                          formData.institution_type === type.value
                            ? 'border-primary bg-primary/10'
                            : 'border-surface-secondary bg-background hover:border-accent'
                        }`}
                      >
                        <div className="text-2xl mb-2">{type.icon}</div>
                        <div className="text-sm font-medium text-primary">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Institution Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-accent mb-2">
                    Institution Name *
                  </label>
                  <input
                    type="text"
                    name="institution_name"
                    value={formData.institution_name}
                    onChange={handleInputChange}
                    placeholder="e.g., City Police Department"
                    className="w-full px-4 py-2 rounded-lg bg-background border border-surface-secondary text-primary placeholder-accent/50 focus:outline-none focus:border-primary transition"
                  />
                </div>

                {/* ID/License Number */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-accent mb-2">
                    Institution ID/License Number *
                  </label>
                  <input
                    type="text"
                    name="institution_identifier"
                    value={formData.institution_identifier}
                    onChange={handleInputChange}
                    placeholder="e.g., PD-2024-001"
                    className="w-full px-4 py-2 rounded-lg bg-background border border-surface-secondary text-primary placeholder-accent/50 focus:outline-none focus:border-primary transition"
                  />
                </div>

                {/* Jurisdiction Area */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-accent mb-2">
                    Jurisdiction Area *
                  </label>
                  <input
                    type="text"
                    name="jurisdiction_area"
                    value={formData.jurisdiction_area}
                    onChange={handleInputChange}
                    placeholder="e.g., Downtown District, City Area"
                    className="w-full px-4 py-2 rounded-lg bg-background border border-surface-secondary text-primary placeholder-accent/50 focus:outline-none focus:border-primary transition"
                  />
                </div>

                {/* Admin Full Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-accent mb-2">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    name="admin_full_name"
                    value={formData.admin_full_name}
                    onChange={handleInputChange}
                    placeholder="Your full name"
                    className="w-full px-4 py-2 rounded-lg bg-background border border-surface-secondary text-primary placeholder-accent/50 focus:outline-none focus:border-primary transition"
                  />
                </div>

                {/* Admin Phone */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-accent mb-2">
                    Your Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="admin_phone"
                    value={formData.admin_phone}
                    onChange={handleInputChange}
                    placeholder="Your phone number"
                    className="w-full px-4 py-2 rounded-lg bg-background border border-surface-secondary text-primary placeholder-accent/50 focus:outline-none focus:border-primary transition"
                  />
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-accent mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional information about your institution"
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg bg-background border border-surface-secondary text-primary placeholder-accent/50 focus:outline-none focus:border-primary transition resize-none"
                  />
                </div>
              </div>

              {/* Next Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-6 py-2 rounded-lg border border-surface-secondary text-primary hover:bg-surface-secondary transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-2 rounded-lg bg-primary text-background hover:bg-primary/90 transition font-medium"
                >
                  Next: Emergency Types
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Emergency Types */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-surface-secondary rounded-lg p-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-primary mb-6">
                  <AlertCircle size={24} />
                  Emergency Types Handled
                </h2>

                <p className="text-accent text-sm mb-6">
                  Select all emergency types your institution can handle *
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {EMERGENCY_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleEmergencyTypeToggle(type.value)}
                      className={`p-4 rounded-lg border-2 transition text-left ${
                        formData.emergency_types.includes(type.value)
                          ? 'border-primary bg-primary/10'
                          : 'border-surface-secondary bg-background hover:border-accent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{type.icon}</div>
                        <div>
                          <div className="text-sm font-medium text-primary">{type.label}</div>
                        </div>
                        {formData.emergency_types.includes(type.value) && (
                          <Check size={16} className="ml-auto text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-2 rounded-lg border border-surface-secondary text-primary hover:bg-surface-secondary transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 px-6 py-2 rounded-lg bg-primary text-background hover:bg-primary/90 transition font-medium"
                >
                  Next: Documents
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-surface-secondary rounded-lg p-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-primary mb-6">
                  <FileText size={24} />
                  Verification Documents
                </h2>

                <p className="text-accent text-sm mb-6">
                  Upload verification documents (license, registration, certificates, etc.)
                </p>

                {/* File Upload Area */}
                <div className="mb-6">
                  <label className="block w-full">
                    <div className="border-2 border-dashed border-surface-secondary rounded-lg p-8 cursor-pointer hover:border-primary transition text-center">
                      <Upload size={32} className="mx-auto mb-3 text-accent" />
                      <p className="text-primary font-medium mb-1">Click to upload files</p>
                      <p className="text-accent text-sm">or drag and drop</p>
                      <p className="text-accent/50 text-xs mt-2">PNG, JPG, PDF up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-primary mb-3">
                      Uploaded Files ({uploadedFiles.length})
                    </h3>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-background rounded-lg border border-surface-secondary"
                        >
                          <div className="flex items-center gap-3">
                            <FileText size={16} className="text-accent" />
                            <div>
                              <p className="text-sm font-medium text-primary">{file.name}</p>
                              <p className="text-xs text-accent">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-accent hover:text-primary transition"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-400">
                  <p className="font-medium mb-2">📋 Document Upload Tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Upload clear, legible copies of official documents</li>
                    <li>Include license/registration numbers</li>
                    <li>Recent documents are preferred</li>
                    <li>Files are securely stored and verified</li>
                  </ul>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-surface-secondary rounded-lg p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">📋 Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-accent">Institution:</span>
                    <span className="text-primary font-medium">{formData.institution_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-accent">Type:</span>
                    <span className="text-primary font-medium">
                      {INSTITUTION_TYPES.find(t => t.value === formData.institution_type)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-accent">Emergency Types:</span>
                    <span className="text-primary font-medium">{formData.emergency_types.length} selected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-accent">Documents:</span>
                    <span className="text-primary font-medium">{uploadedFiles.length} uploaded</span>
                  </div>
                </div>
              </div>

              {/* Final Navigation */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-2 rounded-lg border border-surface-secondary text-primary hover:bg-surface-secondary transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-2 rounded-lg bg-primary text-background hover:bg-primary/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    '✅ Submit Application'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
