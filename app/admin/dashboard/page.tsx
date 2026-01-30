'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Download,
  FileText,
  Filter,
  RefreshCw,
  MapPin,
  AlertCircle,
  User,
} from 'lucide-react';
import LoadingIndicator from '@/components/LoadingIndicator';
import type { AdminProfile, AdminStatus, VerificationDocument } from '@/types/admin';

interface VerificationRequest {
  id: string;
  user_id: string;
  institution_id: string;
  status: AdminStatus;
  emergency_types: string[];
  created_at: string;
  updated_at: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  rejected_at?: string;
  notes?: string;
  institution?: {
    name: string;
    type: string;
    identifier: string;
    jurisdiction_area: string;
  };
  verification_documents?: VerificationDocument[];
}

type FilterStatus = 'all' | 'pending_verification' | 'verified' | 'rejected' | 'suspended';

export default function PlatformAdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [authChecked, setAuthChecked] = useState(false);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Check if user is platform admin
  useEffect(() => {
    if (authLoading) return;

    const ownerEmail = 'timolanda@gmail.com';
    const isOwner = user?.email?.toLowerCase().trim() === ownerEmail.toLowerCase().trim();

    if (!isOwner) {
      console.error('❌ Access denied - not platform admin');
      toast.error('Access denied. Platform admin only.');
      router.replace('/');
      return;
    }

    setAuthChecked(true);
  }, [user, authLoading, router]);

  // Fetch verification requests
  const fetchRequests = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('admin_profiles')
        .select(`
          *,
          institution:institutions (
            name,
            type,
            identifier,
            jurisdiction_area
          ),
          verification_documents (
            id,
            document_type,
            file_url,
            file_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch verification requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecked) return;
    fetchRequests();
  }, [authChecked]);

  // Filter requests
  useEffect(() => {
    if (filterStatus === 'all') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(r => r.status === filterStatus));
    }
  }, [requests, filterStatus]);

  // Approve request
  const handleApprove = async (request: VerificationRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .update({
          status: 'verified',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success(`✅ Admin verified: ${request.institution?.name}`);
      await fetchRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject request
  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessingId(selectedRequest.id);
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success(`❌ Request rejected: ${selectedRequest.institution?.name}`);
      await fetchRequests();
      setSelectedRequest(null);
      setRejectionReason('');
      setShowRejectionForm(false);
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  // Suspend request
  const handleSuspend = async (request: VerificationRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .update({
          status: 'suspended',
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success(`⏸️ Admin suspended: ${request.institution?.name}`);
      await fetchRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Suspension error:', error);
      toast.error('Failed to suspend request');
    } finally {
      setProcessingId(null);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingIndicator label="Verifying access..." />
      </div>
    );
  }

  const getStatusColor = (status: AdminStatus) => {
    switch (status) {
      case 'verified':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'suspended':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'pending_verification':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-surface-secondary text-accent';
    }
  };

  const getStatusIcon = (status: AdminStatus) => {
    switch (status) {
      case 'verified':
        return <CheckCircle size={16} />;
      case 'rejected':
        return <XCircle size={16} />;
      case 'suspended':
        return <Pause size={16} />;
      case 'pending_verification':
        return <Clock size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 pt-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-accent hover:text-primary transition mb-6"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Shield className="text-primary" size={32} />
              <div>
                <h1 className="text-3xl font-bold text-primary">Admin Verification Dashboard</h1>
                <p className="text-accent text-sm">Manage and verify secondary admin requests</p>
              </div>
            </div>

            <button
              onClick={() => {
                setLoading(true);
                fetchRequests();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-secondary rounded-lg p-4 border border-surface-secondary/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-accent text-sm">Pending</p>
                <p className="text-2xl font-bold text-primary">
                  {requests.filter(r => r.status === 'pending_verification').length}
                </p>
              </div>
              <Clock className="text-blue-400 opacity-50" size={32} />
            </div>
          </div>

          <div className="bg-surface-secondary rounded-lg p-4 border border-surface-secondary/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-accent text-sm">Verified</p>
                <p className="text-2xl font-bold text-primary">
                  {requests.filter(r => r.status === 'verified').length}
                </p>
              </div>
              <CheckCircle className="text-green-400 opacity-50" size={32} />
            </div>
          </div>

          <div className="bg-surface-secondary rounded-lg p-4 border border-surface-secondary/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-accent text-sm">Rejected</p>
                <p className="text-2xl font-bold text-primary">
                  {requests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="text-red-400 opacity-50" size={32} />
            </div>
          </div>

          <div className="bg-surface-secondary rounded-lg p-4 border border-surface-secondary/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-accent text-sm">Total</p>
                <p className="text-2xl font-bold text-primary">{requests.length}</p>
              </div>
              <Shield className="text-primary opacity-50" size={32} />
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-8 flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-accent" />
            <span className="text-accent text-sm">Filter:</span>
          </div>
          {(['all', 'pending_verification', 'verified', 'rejected', 'suspended'] as const).map(
            status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                  filterStatus === status
                    ? 'bg-primary text-background'
                    : 'bg-surface-secondary text-accent hover:text-primary'
                }`}
              >
                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
              </button>
            )
          )}
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingIndicator label="Loading requests..." />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Shield size={48} className="mx-auto text-accent/30 mb-4" />
            <p className="text-accent">No requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(request => (
              <div
                key={request.id}
                className="bg-surface-secondary rounded-lg p-6 border border-surface-secondary/50 hover:border-accent/30 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-primary">
                        {request.institution?.name || 'Unknown Institution'}
                      </h3>
                      <div
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {getStatusIcon(request.status)}
                        {request.status.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <p className="text-accent text-sm">
                      {request.institution?.type} • ID: {request.institution?.identifier}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="text-primary hover:text-accent transition text-sm font-medium"
                  >
                    View Details →
                  </button>
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 pt-4 border-t border-surface-secondary/30">
                  <div>
                    <p className="text-accent text-xs mb-1">Jurisdiction</p>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-accent" />
                      <p className="text-primary text-sm font-medium">
                        {request.institution?.jurisdiction_area}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-accent text-xs mb-1">Emergency Types</p>
                    <p className="text-primary text-sm font-medium">{request.emergency_types.length} types</p>
                  </div>

                  <div>
                    <p className="text-accent text-xs mb-1">Applied</p>
                    <p className="text-primary text-sm font-medium">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Emergency Types */}
                <div className="mb-4">
                  <p className="text-accent text-xs mb-2">Emergency Types Handled:</p>
                  <div className="flex flex-wrap gap-2">
                    {request.emergency_types.map(type => (
                      <span
                        key={type}
                        className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs border border-primary/20"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                {request.status === 'pending_verification' && (
                  <div className="flex gap-3 pt-4 border-t border-surface-secondary/30">
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={processingId === request.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition disabled:opacity-50 border border-green-500/30"
                    >
                      {processingId === request.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          Approve
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition border border-red-500/30"
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                  </div>
                )}

                {request.status === 'verified' && (
                  <div className="flex gap-3 pt-4 border-t border-surface-secondary/30">
                    <button
                      onClick={() => handleSuspend(request)}
                      disabled={processingId === request.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition disabled:opacity-50 border border-yellow-500/30"
                    >
                      {processingId === request.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Pause size={18} />
                          Suspend
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-secondary rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-surface-secondary/50">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-surface-secondary/30 bg-surface-secondary">
              <h2 className="text-2xl font-bold text-primary">
                {selectedRequest.institution?.name}
              </h2>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setShowRejectionForm(false);
                  setRejectionReason('');
                }}
                className="text-accent hover:text-primary transition text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Institution Info */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Institution Information</h3>
                <div className="bg-background rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-accent">Institution Type:</span>
                    <span className="text-primary font-medium">{selectedRequest.institution?.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-accent">ID/License:</span>
                    <span className="text-primary font-medium">
                      {selectedRequest.institution?.identifier}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-accent">Jurisdiction:</span>
                    <span className="text-primary font-medium">
                      {selectedRequest.institution?.jurisdiction_area}
                    </span>
                  </div>
                </div>
              </div>

              {/* Emergency Types */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Emergency Types</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedRequest.emergency_types.map(type => (
                    <span
                      key={type}
                      className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm border border-primary/20"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {/* Documents */}
              {selectedRequest.verification_documents && selectedRequest.verification_documents.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Verification Documents</h3>
                  <div className="space-y-2">
                    {selectedRequest.verification_documents.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-background rounded-lg border border-surface-secondary/30 hover:border-accent/30 transition"
                      >
                        <div className="flex items-center gap-3">
                          <FileText size={18} className="text-accent" />
                          <div>
                            <p className="text-primary font-medium text-sm">{doc.file_name}</p>
                            <p className="text-accent text-xs">{doc.document_type}</p>
                          </div>
                        </div>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition text-sm"
                        >
                          <Download size={14} />
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection Details */}
              {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <h3 className="text-red-400 font-semibold mb-2">Rejection Reason</h3>
                  <p className="text-accent text-sm">{selectedRequest.rejection_reason}</p>
                </div>
              )}

              {/* Rejection Form */}
              {selectedRequest.status === 'pending_verification' && showRejectionForm && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-4">
                  <h3 className="text-red-400 font-semibold">Provide Rejection Reason</h3>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Explain why this application is being rejected..."
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg bg-background border border-red-500/30 text-primary placeholder-accent/50 focus:outline-none focus:border-red-400 resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRejectionForm(false)}
                      className="flex-1 px-4 py-2 rounded-lg border border-surface-secondary text-primary hover:bg-surface-secondary transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={processingId === selectedRequest.id || !rejectionReason.trim()}
                      className="flex-1 px-4 py-2 rounded-lg bg-red-500/30 text-red-400 hover:bg-red-500/40 transition disabled:opacity-50 border border-red-500/30"
                    >
                      {processingId === selectedRequest.id ? 'Processing...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-surface-secondary/30 flex gap-3">
                {selectedRequest.status === 'pending_verification' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedRequest)}
                      disabled={processingId === selectedRequest.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition disabled:opacity-50 border border-green-500/30"
                    >
                      {processingId === selectedRequest.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          Approve
                        </>
                      )}
                    </button>

                    {!showRejectionForm && (
                      <button
                        onClick={() => setShowRejectionForm(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition border border-red-500/30"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                    )}
                  </>
                )}

                {selectedRequest.status === 'verified' && (
                  <button
                    onClick={() => handleSuspend(selectedRequest)}
                    disabled={processingId === selectedRequest.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition disabled:opacity-50 border border-yellow-500/30"
                  >
                    {processingId === selectedRequest.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Pause size={18} />
                        Suspend
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setShowRejectionForm(false);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-surface-secondary text-primary hover:bg-surface-secondary transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
