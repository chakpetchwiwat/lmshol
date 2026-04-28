import React from 'react';
import { Award, CheckCircle2, XCircle, Search, Loader2, User, BookOpen, Clock } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';
import { formatThaiDateTime } from '../../utils/dateUtils';
import Skeleton from '../../components/common/Skeleton';

const CertificateApprovals = () => {
  const toast = useToast();
  const [loading, setLoading] = React.useState(true);
  const [approving, setApproving] = React.useState(null);
  const [certificates, setCertificates] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('PENDING');

  const fetchPending = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPendingCertificates({ status: statusFilter });
      setCertificates(response.data || []);
    } catch (error) {
      console.error('Fetch pending certificates error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลการอนุมัติได้');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  React.useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (id) => {
    try {
      setApproving(id);
      const response = await adminAPI.reissueCertificate(id);
      
      if (response.data?.status === 'VALID') {
        toast.success('อนุมัติและสร้างไฟล์เกียรติบัตรเรียบร้อยแล้ว');
      } else {
        toast.error('การออกเกียรติบัตรขัดข้อง กรุณาลองใหม่อีกครั้ง');
      }
      await fetchPending();
    } catch (error) {
      toast.error('ไม่สามารถอนุมัติได้: ' + (error.response?.data?.message || error.message));
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('ระบุเหตุผลในการปฏิเสธ:', 'ข้อมูลไม่ถูกต้อง');
    if (reason === null) return;

    try {
      setApproving(id);
      await adminAPI.revokeCertificate(id, { reason });
      toast.success('ปฏิเสธรายการเรียบร้อยแล้ว');
      setCertificates(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      toast.error('ไม่สามารถดำเนินการได้');
    } finally {
      setApproving(null);
    }
  };

  const filtered = certificates.filter(c => 
    c.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.course?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">
      {/* Header Area */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Award size={24} className="animate-bounce-slow" />
            <h2 className="text-2xl font-black tracking-tight text-slate-900">การอนุมัติเกียรติบัตร</h2>
          </div>
          <p className="text-sm font-bold text-slate-400">
            รายการรอนุมัติออกเกียรติบัตรจากทุกหลักสูตรที่คุณดูแล
          </p>
        </div>
      </div>

      {/* Filters Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้เรียน หรือชื่อคอร์ส..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border-none bg-slate-50 py-3 pl-12 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {['PENDING', 'FAILED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  statusFilter === status 
                    ? 'bg-white text-primary shadow-sm ring-1 ring-slate-100' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List Area */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4">
          {filtered.map((cert) => (
            <div 
              key={cert.id}
              className="group relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                {/* User Info */}
                <div className="flex flex-1 items-center gap-5">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-400 font-black text-xl group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                    {cert.user?.name?.charAt(0) || <User size={28} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-black text-slate-900">{cert.user?.name}</h4>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {cert.user?.department || 'General'}
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <BookOpen size={14} className="text-primary" />
                      {cert.course?.title}
                    </p>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 lg:justify-center">
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5">
                    <Clock size={16} className="text-slate-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">วันที่มีสิทธิ์ได้รับ</span>
                      <span className="text-xs font-black text-slate-700">{formatThaiDateTime(cert.issuedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {approving === cert.id ? (
                    <div className="flex h-12 items-center gap-2 rounded-2xl bg-amber-50 px-6 text-sm font-black text-amber-600 border border-amber-100">
                      <Loader2 size={18} className="animate-spin" />
                      กำลังออกไฟล์...
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleReject(cert.id)}
                        className="flex h-12 items-center gap-2 rounded-2xl border border-slate-100 px-6 text-sm font-black text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
                      >
                        <XCircle size={18} />
                        ปฏิเสธ
                      </button>
                      <button
                        onClick={() => handleApprove(cert.id)}
                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-8 text-sm font-black text-white shadow-lg shadow-slate-200 transition-all hover:bg-primary hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 lg:flex-none"
                      >
                        <CheckCircle2 size={18} />
                        {cert.status === 'PENDING' && (cert.metadata?.lastRetryAt || cert.metadata?.retryCount > 0) 
                          ? 'ลองใหม่อีกครั้ง' 
                          : 'อนุมัติออกเกียรติบัตร'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {cert.status === 'FAILED' && cert.metadata?.lastError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-[11px] font-bold text-rose-600 border border-rose-100">
                  <XCircle size={14} />
                  Error: {cert.metadata.lastError}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-slate-100 border-dashed">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-slate-50 text-slate-200">
            <Award size={48} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">ไม่มีรายการรอนุมัติ</h3>
          <p className="text-sm font-bold text-slate-400">เมื่อมีผู้เรียนขอรับเกียรติบัตร รายการจะแสดงที่นี่</p>
        </div>
      )}
    </div>
  );
};

export default CertificateApprovals;
