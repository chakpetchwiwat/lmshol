import React from 'react';
import { 
  Award, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  BookOpen
} from 'lucide-react';
import { adminAPI } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { useToast } from '../../context/useToast';
import { formatThaiDateTime } from '../../utils/dateUtils';
import Skeleton from '../../components/common/Skeleton';
import CustomSelect from '../../components/common/CustomSelect';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'ทุกสถานะ' },
  { value: 'VALID', label: 'ออกสำเร็จ (Valid)' },
  { value: 'PENDING', label: 'กำลังประมวลผล (Pending)' },
  { value: 'FAILED', label: 'ล้มเหลว (Failed)' },
  { value: 'REVOKED', label: 'ถูกยกเลิก (Revoked)' }
];

const CertificationMonitor = () => {
  const toast = useToast();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [pagination, setPagination] = React.useState({ total: 0, pages: 0, currentPage: 1 });
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('ALL');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [retryingIds, setRetryingIds] = React.useState(new Set());

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCertificates = React.useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllCertificates({
        page,
        status: selectedStatus,
        search: debouncedSearch,
        limit: 15
      });
      setItems(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Fetch certificates error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลใบเซอร์ได้');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedStatus, toast]);

  React.useEffect(() => {
    fetchCertificates(1);
  }, [fetchCertificates]);

  const handleRetry = async (certId) => {
    if (retryingIds.has(certId)) return;
    
    try {
      setRetryingIds(prev => new Set(prev).add(certId));
      await adminAPI.retryCertificatePdf(certId);
      toast.success('กำลังเริ่มประมวลผลใบเซอร์ใหม่อีกครั้ง...');
      
      // Refresh after a short delay
      setTimeout(() => fetchCertificates(pagination.currentPage), 2000);
    } catch (error) {
      console.error('Retry error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถสั่งประมวลผลใหม่ได้');
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(certId);
        return next;
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VALID':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 size={12} /> ออกสำเร็จ
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
            <Clock size={12} className="animate-spin-slow" /> กำลังประมวลผล
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
            <AlertCircle size={12} /> ล้มเหลว
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
            ถูกยกเลิก
          </span>
        );
      default:
        return <span className="text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <AdminPageHeader
        title="Certification Overview"
        subtitle="มอนิเตอร์และจัดการการออกใบเซอร์ทั้งระบบ ตรวจสอบสถานะและสั่งประมวลผลใหม่เมื่อเกิดข้อผิดพลาด"
        icon={<Award size={32} className="text-primary" />}
      />

      {/* Filters Card */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ค้นหาเลขใบเซอร์, ชื่อผู้เรียน หรือชื่อคอร์ส..."
              className="input pl-11 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">กรองสถานะ:</span>
            <CustomSelect
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={STATUS_OPTIONS}
              className="w-full md:w-56"
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ข้อมูลใบเซอร์</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้เรียน</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">คอร์สเรียน</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">วันที่ออกใบ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-6 py-4"><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <Award size={48} className="text-slate-200" />
                      <p className="font-medium">ไม่พบข้อมูลใบเซอร์ตามเงื่อนไขที่เลือก</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{cert.certificateNo}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">{cert.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <UserIcon size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700 text-sm">{cert.user?.name}</span>
                          <span className="text-xs text-slate-500">{cert.user?.department || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 max-w-[240px]">
                        <BookOpen size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-600 truncate" title={cert.course?.title}>
                          {cert.course?.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(cert.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">{formatThaiDateTime(cert.issuedAt, true)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {cert.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(cert.id)}
                            disabled={retryingIds.has(cert.id)}
                            className="btn btn-primary btn-sm gap-1.5 h-8 px-3"
                            title="Retry Generation"
                          >
                            <RefreshCw size={14} className={retryingIds.has(cert.id) ? 'animate-spin' : ''} />
                            <span>Retry</span>
                          </button>
                        )}
                        {cert.status === 'VALID' && cert.pdfUrl && (
                          <a
                            href={cert.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-primary transition-colors bg-slate-100 hover:bg-primary/10 rounded-lg"
                            title="View PDF"
                          >
                            <ExternalLink size={18} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">
              แสดงหน้าที่ {pagination.currentPage} จากทั้งหมด {pagination.pages} หน้า (ทั้งหมด {pagination.total} รายการ)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.currentPage === 1}
                onClick={() => fetchCertificates(pagination.currentPage - 1)}
                className="p-2 rounded-xl hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                disabled={pagination.currentPage === pagination.pages}
                onClick={() => fetchCertificates(pagination.currentPage + 1)}
                className="p-2 rounded-xl hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="flex items-center gap-2 px-2 text-[11px] text-slate-400 italic">
        <AlertCircle size={12} />
        <span>หมายเหตุ: การกด Retry จะสั่งล้างข้อมูลเดิมและพยายามสร้างไฟล์ PDF ใหม่อีกครั้งจาก Template ปัจจุบัน</span>
      </div>
    </div>
  );
};

export default CertificationMonitor;
