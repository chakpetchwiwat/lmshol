import React from 'react';
import { Award, CheckCircle2, AlertCircle, RotateCcw, Ban, FileText, Loader2, Search, ExternalLink, RefreshCw } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';
import { formatThaiDateTime } from '../../utils/dateUtils';

const CourseCertificatesTab = ({ courseId, readOnly }) => {
  const toast = useToast();
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState(null); // id of record being processed
  const [certificates, setCertificates] = React.useState([]);
  const [summary, setSummary] = React.useState({ total: 0, valid: 0, pending: 0, failed: 0, revoked: 0, expired: 0 });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [hasCertificate, setHasCertificate] = React.useState(true);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getCourseCertificates(courseId);
      setCertificates(response.data || []);
      setHasCertificate(response.hasCertificate ?? true);
      if (response.summary) setSummary(response.summary);
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ”เธถเธเธเนเธญเธกเธนเธฅเน€เธเธตเธขเธฃเธ•เธดเธเธฑเธ•เธฃเนเธ”เน');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (courseId) fetchCertificates();
  }, [courseId]);

  const filteredCertificates = React.useMemo(() => {
    if (!searchQuery) return certificates;
    const query = searchQuery.toLowerCase();
    return certificates.filter(c => 
      c.user?.name?.toLowerCase().includes(query) || 
      c.certificateNo?.toLowerCase().includes(query)
    );
  }, [certificates, searchQuery]);

  const handleDownload = async (id) => {
    try {
      setProcessing(id);
      const response = await adminAPI.getCertificateDownloadUrl(id);
      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (error) {
      toast.error('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ”เธถเธเธฅเธดเธเธเนเธ”เธฒเธงเธเนเนเธซเธฅเธ”เนเธ”เน');
    } finally {
      setProcessing(null);
    }
  };

  const handleRetry = async (id) => {
    if (readOnly) return;
    try {
      setProcessing(id);
      await adminAPI.retryCertificate(id);
      toast.success('เน€เธฃเธดเนเธกเธชเธฃเนเธฒเธเนเธเธฅเนเนเธเธฃเธฑเธเธฃเธญเธเนเธซเธกเนเนเธฅเนเธง');
      fetchCertificates();
    } catch (error) {
      toast.error(error.response?.data?.message || 'เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เน€เธฃเธดเนเธกเธเธฃเธฐเธเธงเธเธเธฒเธฃเนเธซเธกเนเนเธ”เน');
    } finally {
      setProcessing(null);
    }
  };

  const handleReissue = async (id) => {
    if (readOnly) return;
    if (!window.confirm('เธเธธเธ“เธ•เนเธญเธเธเธฒเธฃเธญเธญเธเน€เธเธตเธขเธฃเธ•เธดเธเธฑเธ•เธฃเนเธซเธกเน (Reissue) เนเธเนเธซเธฃเธทเธญเนเธกเน? เธฃเธฒเธขเธเธฒเธฃเน€เธ”เธดเธกเธเธฐเธ–เธนเธเธขเธเน€เธฅเธดเธ')) return;

    try {
      setProcessing(id);
      await adminAPI.reissueCertificate(id);
      toast.success('เธเธณเธฅเธฑเธเธ”เธณเน€เธเธดเธเธเธฒเธฃเธญเธญเธเน€เธเธตเธขเธฃเธ•เธดเธเธฑเธ•เธฃเนเธซเธกเน...');
      fetchCertificates();
    } catch (error) {
      toast.error(error.response?.data?.message || 'เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธญเธญเธเน€เธเธตเธขเธฃเธ•เธดเธเธฑเธ•เธฃเนเธซเธกเนเนเธ”เน');
    } finally {
      setProcessing(null);
    }
  };

  const handleRevoke = async (id) => {
    if (readOnly) return;
    const reason = window.prompt('เธฃเธฐเธเธธเน€เธซเธ•เธธเธเธฅเนเธเธเธฒเธฃเธขเธเน€เธฅเธดเธ (เธ–เนเธฒเธกเธต):', 'เธเธงเธฒเธกเธเธฑเธ”เธเนเธญเธเธ—เธฒเธเน€เธ—เธเธเธดเธ');
    if (reason === null) return; // Cancelled prompt

    try {
      setProcessing(id);
      await adminAPI.revokeCertificate(id, { reason });
      toast.success('เธขเธเน€เธฅเธดเธเน€เธเธตเธขเธฃเธ•เธดเธเธฑเธ•เธฃเน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง');
      fetchCertificates();
    } catch (error) {
      toast.error(error.response?.data?.message || 'เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธขเธเน€เธฅเธดเธเน€เธเธตเธขเธฃเธ•เธดเธเธฑเธ•เธฃเนเธ”เน');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VALID':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-100">
            <CheckCircle2 size={12} /> VALID
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-100">
            <Loader2 size={12} className="animate-spin" /> PENDING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 border border-rose-100">
            <AlertCircle size={12} /> FAILED
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500 border border-slate-100">
            <Ban size={12} /> REVOKED
          </span>
        );
      default:
        return <span className="text-slate-400 font-bold">{status}</span>;
    }
  };

  if (loading && certificates.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-slate-300" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {!hasCertificate && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-rose-100 p-3 rounded-full text-rose-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="font-black text-rose-800 text-lg">เธฃเธฐเธเธเน€เธเธตเธขเธฃเธ•เธดเธเธฑเธ•เธฃเธ–เธนเธเธเธดเธ”เนเธเนเธเธฒเธ</h4>
              <p className="text-rose-600 font-bold text-sm">เธเธญเธฃเนเธชเธเธตเนเนเธกเนเนเธ”เนเธ•เธฑเนเธเธเนเธฒเนเธซเนเธกเธตเธเธฒเธฃเธญเธญเธเน€เธเธตเธขเธฃเธ•เธดเธเธฑเธ•เธฃ เธเธฃเธธเธ“เธฒเนเธเธ—เธตเน "เธเนเธญเธกเธนเธฅเธเธทเนเธเธเธฒเธ" เน€เธเธทเนเธญเน€เธเธดเธ”เนเธเนเธเธฒเธ</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.hash = '#basic'} 
            className="btn btn-primary px-6"
          >
            เธ•เธฑเนเธเธเนเธฒเธเธญเธฃเนเธช
          </button>
        </div>
      )}
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'เธญเธญเธเนเธฅเนเธง (Valid)', value: summary.valid, color: 'emerald', icon: CheckCircle2 },
          { label: 'เธเธณเธฅเธฑเธเธฃเธญ (Pending)', value: summary.pending, color: 'amber', icon: Loader2 },
          { label: 'เธฅเนเธกเน€เธซเธฅเธง (Failed)', value: summary.failed, color: 'rose', icon: AlertCircle },
          { label: 'เธ–เธนเธเธขเธเน€เธฅเธดเธ (Revoked)', value: summary.revoked, color: 'slate', icon: Ban },
        ].map((item) => (
          <div key={item.label} className={`rounded-2xl border border-${item.color}-100 bg-${item.color}-50/30 p-4 shadow-sm`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-wider text-${item.color}-600/70`}>{item.label}</p>
                <p className={`mt-1 text-2xl font-black text-${item.color}-700`}>{item.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${item.color}-100 text-${item.color}-600`}>
                <item.icon size={20} className={item.label.includes('Pending') ? 'animate-spin' : ''} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="เธเนเธเธซเธฒเธเธทเนเธญเธเธนเนเน€เธฃเธตเธขเธ เธซเธฃเธทเธญเน€เธฅเธเธ—เธตเนเน€เธเธตเธขเธฃเธ•เธดเธเธฑเธ•เธฃ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-bold text-slate-900 transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchCertificates}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-primary disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700">
            Automatic grants
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-4 font-black uppercase tracking-wider text-slate-500">Learner</th>
                <th className="px-5 py-4 font-black uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-4 font-black uppercase tracking-wider text-slate-500">Certificate No</th>
                <th className="px-5 py-4 font-black uppercase tracking-wider text-slate-500">Issued Date</th>
                <th className="px-5 py-4 font-black uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCertificates.length > 0 ? filteredCertificates.map((cert) => (
                <tr key={cert.id} className="group transition-colors hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-black text-xs">
                        {cert.user?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{cert.user?.name || 'Unknown User'}</p>
                        <p className="text-[10px] font-bold text-slate-400">{cert.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {getStatusBadge(cert.status)}
                    {cert.status === 'FAILED' && cert.metadata?.lastError && (
                      <div className="mt-1 max-w-[150px] truncate text-[9px] font-bold text-rose-400" title={cert.metadata.lastError}>
                        Err: {cert.metadata.lastError}
                      </div>
                    )}
                    {cert.status === 'REVOKED' && cert.revokeReason && (
                      <div className="mt-1 max-w-[150px] truncate text-[9px] font-bold text-slate-400" title={cert.revokeReason}>
                        Reason: {cert.revokeReason}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs font-bold text-slate-500">
                    {cert.certificateNo || '-'}
                    {cert.metadata?.retryCount > 0 && (
                      <span className="ml-2 inline-flex items-center rounded bg-amber-50 px-1 text-[9px] text-amber-600">
                        Retry: {cert.metadata.retryCount}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs font-bold text-slate-500">
                    {cert.issuedAt ? formatThaiDateTime(cert.issuedAt) : '-'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {cert.status === 'VALID' && (
                        <button 
                          onClick={() => handleDownload(cert.id)}
                          disabled={processing === cert.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-emerald-600 disabled:opacity-50"
                          title="เธ”เธนเนเธเธฅเน PDF"
                        >
                          {processing === cert.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={16} />}
                        </button>
                      )}
                      {!readOnly && (
                        <>
                          {cert.status === 'FAILED' && (
                            <button
                              onClick={() => handleRetry(cert.id)}
                              disabled={processing === cert.id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-primary disabled:opacity-50"
                              title="เธฅเธญเธเนเธซเธกเน (Retry)"
                            >
                              <RefreshCw size={16} className={processing === cert.id ? 'animate-spin' : ''} />
                            </button>
                          )}
                          
                          {cert.status !== 'REVOKED' && (
                            <>
                              <button
                                onClick={() => handleReissue(cert.id)}
                                disabled={processing === cert.id}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-amber-600 disabled:opacity-50"
                                title={cert.status === 'PENDING' ? "เน€เธฃเนเธเธเธฒเธฃเธญเธญเธเนเธเธฅเน (Reissue)" : "เธญเธญเธเนเธซเธกเน (Reissue)"}
                              >
                                <RotateCcw size={16} className={processing === cert.id || cert.status === 'PENDING' ? 'animate-spin' : ''} />
                              </button>
                              
                              {cert.status !== 'PENDING' && (
                                <button
                                  onClick={() => handleRevoke(cert.id)}
                                  disabled={processing === cert.id}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-rose-600 disabled:opacity-50"
                                  title="เธขเธเน€เธฅเธดเธ (Revoke)"
                                >
                                  <Ban size={16} />
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                      <Award size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-500">เนเธกเนเธเธเธเนเธญเธกเธนเธฅเน€เธเธตเธขเธฃเธ•เธดเธเธฑเธ•เธฃ</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CourseCertificatesTab;

