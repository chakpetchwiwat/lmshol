import React from 'react';
import { Award, CheckCircle2, AlertCircle, RotateCcw, Ban, FileText, Loader2, Search, ExternalLink, RefreshCw } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';
import { formatThaiDateTime } from '../../utils/dateUtils';
import ModalPortal from '../common/ModalPortal';

const CourseCertificatesTab = ({ courseId, readOnly }) => {
  const toast = useToast();
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState(null); // id of record being processed
  const [certificates, setCertificates] = React.useState([]);
  const [summary, setSummary] = React.useState({ total: 0, valid: 0, pending: 0, failed: 0, revoked: 0, expired: 0 });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [hasCertificate, setHasCertificate] = React.useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = React.useState(false);
  const [eligibleUsers, setEligibleUsers] = React.useState([]);
  const [eligibleLoading, setEligibleLoading] = React.useState(false);
  const [manualIssueLoading, setManualIssueLoading] = React.useState(false);
  const [manualSearchQuery, setManualSearchQuery] = React.useState('');

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getCourseCertificates(courseId);
      setCertificates(response.data || []);
      setHasCertificate(response.hasCertificate ?? true);
      if (response.summary) setSummary(response.summary);
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
      toast.error('ไม่สามารถดึงข้อมูลเกียรติบัตรได้');
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
      toast.error('ไม่สามารถดึงลิงก์ดาวน์โหลดได้');
    } finally {
      setProcessing(null);
    }
  };

  const handleRetry = async (id) => {
    if (readOnly) return;
    try {
      setProcessing(id);
      await adminAPI.retryCertificate(id);
      toast.success('เริ่มสร้างไฟล์ใบรับรองใหม่แล้ว');
      fetchCertificates();
    } catch (error) {
      toast.error(error.response?.data?.message || 'ไม่สามารถเริ่มกระบวนการใหม่ได้');
    } finally {
      setProcessing(null);
    }
  };

  const handleReissue = async (id) => {
    if (readOnly) return;
    
    // Explicit confirmation
    const confirmed = window.confirm('คุณต้องการออกเกียรติบัตรใหม่ (Reissue) ใช่หรือไม่? \nระบบจะอัปเดตข้อมูลผู้ลงนามและรูปแบบตามการตั้งค่าปัจจุบัน');
    if (!confirmed) return;

    try {
      console.log(`[Certificate] Starting reissue for id=${id}`);
      setProcessing(id);
      const response = await adminAPI.reissueCertificate(id);
      console.log(`[Certificate] Reissue API response:`, response);
      
      toast.success('กำลังดำเนินการออกเกียรติบัตรใหม่...');
      
      // Delay fetch slightly to allow backend async process to start/show PENDING
      setTimeout(fetchCertificates, 500);
    } catch (error) {
      console.error(`[Certificate] Reissue failed for id=${id}:`, error);
      toast.error(error.response?.data?.message || 'ไม่สามารถออกเกียรติบัตรใหม่ได้');
      fetchCertificates();
    } finally {
      setProcessing(null);
    }
  };

  const handleRevoke = async (id) => {
    if (readOnly) return;
    const reason = window.prompt('ระบุเหตุผลในการยกเลิก (ถ้ามี):', 'ความขัดข้องทางเทคนิค');
    if (reason === null) return; // Cancelled prompt

    try {
      setProcessing(id);
      await adminAPI.revokeCertificate(id, { reason });
      toast.success('ยกเลิกเกียรติบัตรเรียบร้อยแล้ว');
      fetchCertificates();
    } catch (error) {
      toast.error(error.response?.data?.message || 'ไม่สามารถยกเลิกเกียรติบัตรได้');
    } finally {
      setProcessing(null);
    }
  };

  const fetchEligibleUsers = async () => {
    try {
      setEligibleLoading(true);
      const response = await adminAPI.getCourseHistory(courseId);
      // Filter out those who already have certificates (any status except REVOKED)
      const certificateUserIds = new Set(
        certificates
          .filter(c => c.status !== 'REVOKED')
          .map(c => c.user?.id)
      );
      
      const eligible = (response.data || []).filter(record => 
        !certificateUserIds.has(record.user?.id)
      );
      
      setEligibleUsers(eligible);
      setManualSearchQuery(''); // Reset search on open
    } catch (error) {
      console.error('Failed to fetch eligible users:', error);
      toast.error('ไม่สามารถดึงข้อมูลรายชื่อผู้เรียนได้');
    } finally {
      setEligibleLoading(false);
    }
  };

  const handleManualIssue = async (userId) => {
    if (readOnly || manualIssueLoading) return;
    
    try {
      setManualIssueLoading(true);
      await adminAPI.issueManual(courseId, userId);
      toast.success('กำลังสร้างเกียรติบัตรสำหรับผู้เรียนคนนี้...');
      setIsManualModalOpen(false);
      fetchCertificates();
    } catch (error) {
      toast.error(error.response?.data?.message || 'ไม่สามารถออกเกียรติบัตรได้');
    } finally {
      setManualIssueLoading(false);
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
              <h4 className="font-black text-rose-800 text-lg">ระบบเกียรติบัตรถูกปิดใช้งาน</h4>
              <p className="text-rose-600 font-bold text-sm">คอร์สนี้ไม่ได้ตั้งค่าให้มีการออกเกียรติบัตร กรุณาไปที่ "ข้อมูลพื้นฐาน" เพื่อเปิดใช้งาน</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.hash = '#basic'} 
            className="btn btn-primary px-6"
          >
            ตั้งค่าคอร์ส
          </button>
        </div>
      )}
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'ออกแล้ว (Valid)', value: summary.valid, color: 'emerald', icon: CheckCircle2 },
          { label: 'กำลังรอ (Pending)', value: summary.pending, color: 'amber', icon: Loader2 },
          { label: 'ล้มเหลว (Failed)', value: summary.failed, color: 'rose', icon: AlertCircle },
          { label: 'ถูกยกเลิก (Revoked)', value: summary.revoked, color: 'slate', icon: Ban },
        ].map((item) => (
          <div key={item.label} className={`rounded-2xl border border-${item.color}-100 bg-${item.color}-50/30 p-4 shadow-sm`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-wider text-${item.color}-600/70`}>{item.label}</p>
                <p className={`mt-1 text-2xl font-black text-${item.color}-700`}>{item.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${item.color}-100 text-${item.color}-600`}>
                <item.icon size={20} className={item.label.includes('Pending') && item.value > 0 ? 'animate-spin' : ''} />
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
            placeholder="ค้นหาชื่อผู้เรียน หรือเลขที่เกียรติบัตร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-bold text-slate-900 transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {!readOnly && hasCertificate && (
            <button
              onClick={() => {
                setIsManualModalOpen(true);
                fetchEligibleUsers();
              }}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
            >
              <Award size={16} />
              ออกเกียรติบัตรด้วยมือ
            </button>
          )}
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
                          title="ดูไฟล์ PDF"
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
                              title="ลองใหม่ (Retry)"
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
                                title={cert.status === 'PENDING' ? "เร่งการออกไฟล์ (Reissue)" : "ออกใหม่ (Reissue)"}
                              >
                                <RotateCcw size={16} className={processing === cert.id || cert.status === 'PENDING' ? 'animate-spin' : ''} />
                              </button>
                              
                              {cert.status !== 'PENDING' && (
                                <button
                                  onClick={() => handleRevoke(cert.id)}
                                  disabled={processing === cert.id}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-rose-600 disabled:opacity-50"
                                  title="ยกเลิก (Revoke)"
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
                    <p className="text-sm font-bold text-slate-500">ไม่พบข้อมูลเกียรติบัตร</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Issue Modal */}
      <ModalPortal isOpen={isManualModalOpen}>
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-300 rounded-[2.5rem] bg-white shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[900px]">
            <div className="border-b border-slate-100 p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
                    <Award size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-xl tracking-tight">ออกเกียรติบัตรด้วยมือ</h3>
                    <p className="text-sm font-bold text-slate-400">เลือกผู้เรียนที่ต้องการมอบใบรับรองให้ทันที</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsManualModalOpen(false)}
                  className="group flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500"
                >
                  <RotateCcw size={20} className="transition-transform group-hover:rotate-90" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden p-8 gap-6">
              {eligibleLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-indigo-500" size={40} />
                  <p className="text-sm font-black text-slate-400">กำลังโหลดรายชื่อผู้เรียน...</p>
                </div>
              ) : eligibleUsers.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-200">
                    <Search size={32} />
                  </div>
                  <h4 className="font-black text-slate-900 text-lg">ไม่พบรายชื่อผู้เรียน</h4>
                  <p className="mt-1 text-sm font-bold text-slate-400 max-w-xs mx-auto">ผู้เรียนทุกคนในคอร์สนี้ได้รับเกียรติบัตรครบถ้วนแล้ว</p>
                </div>
              ) : (
                <>
                  {/* Search box for manual modal */}
                  <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อผู้เรียนที่ต้องการมอบใบเซอร์..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-4 pl-14 pr-6 text-base font-bold text-slate-900 transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                      value={manualSearchQuery}
                      onChange={(e) => setManualSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-4">
                    {eligibleUsers
                      .filter(u => u.user?.name?.toLowerCase().includes(manualSearchQuery.toLowerCase()))
                      .map((record) => (
                    <div 
                      key={record.user?.id}
                      className="group flex items-center justify-between rounded-3xl border border-slate-100 bg-slate-50/30 p-5 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-lg hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-black text-base shadow-sm">
                          {record.user?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-base">{record.user?.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {record.status === 'COMPLETED' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600 border border-emerald-100">
                                <CheckCircle2 size={10} /> สำเร็จการเรียน
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-600 border border-amber-100">
                                <RotateCcw size={10} className="animate-spin" /> กำลังเรียน ({record.progressPercent}%)
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-300">|</span>
                            <span className="text-[10px] font-bold text-slate-400">{record.user?.email}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleManualIssue(record.user?.id)}
                        disabled={manualIssueLoading}
                        className="rounded-2xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        {manualIssueLoading ? <Loader2 size={16} className="animate-spin" /> : 'มอบเกียรติบัตร'}
                      </button>
                    </div>
                    ))}
                    
                    {eligibleUsers.filter(u => u.user?.name?.toLowerCase().includes(manualSearchQuery.toLowerCase())).length === 0 && (
                      <div className="py-20 text-center">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-2">
                          <Search size={20} />
                        </div>
                        <p className="text-sm font-bold text-slate-400">ไม่พบรายชื่อผู้เรียนที่ตรงกับการค้นหา</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-100 p-8 bg-slate-50/50">
              <button 
                onClick={() => setIsManualModalOpen(false)}
                className="w-full rounded-2xl bg-white border border-slate-200 py-4 text-sm font-black text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};

export default CourseCertificatesTab;
