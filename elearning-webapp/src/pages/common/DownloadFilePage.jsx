import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Download, Loader2 } from 'lucide-react';
import { userAPI } from '../../utils/api';
import AppLogo from '../../components/common/AppLogo';

const DownloadFilePage = () => {
  const [searchParams] = useSearchParams();
  const fileKey = searchParams.get('key');
  const fileName = searchParams.get('name') || 'ดาวน์โหลดไฟล์';
  
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [downloadUrl, setDownloadUrl] = React.useState(null);

  React.useEffect(() => {
    const fetchDownloadUrl = async () => {
      if (!fileKey) {
        setError('ไม่พบไฟล์ที่ต้องการดาวน์โหลด');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await userAPI.getProfileFileDownloadUrl(fileKey);
        const url = response?.data?.url || response?.url;
        if (url) {
          setDownloadUrl(url);
          // Auto-trigger download
          const link = document.createElement('a');
          link.href = url;
          // Set download attribute to suggest the file name
          link.setAttribute('download', fileName);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          setError('ไม่สามารถสร้างลิงก์ดาวน์โหลดได้');
        }
      } catch (err) {
        console.error('Error fetching file download URL:', err);
        const message = err.response?.data?.message || err.message;
        if (err.response?.status === 403) {
          setError('คุณไม่มีสิทธิ์เข้าถึงไฟล์นี้ (สิทธิ์ระดับผู้ดูแลระบบหรือเจ้าของไฟล์เท่านั้น)');
        } else if (err.response?.status === 401) {
          setError('เซสชันหมดอายุหรือไม่มีสิทธิ์ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
        } else {
          setError(message || 'เกิดข้อผิดพลาดในการเข้าถึงไฟล์');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDownloadUrl();
  }, [fileKey, fileName]);

  const handleManualDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 sm:p-8">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_32px_80px_-20px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/50 text-center">
        <AppLogo className="mb-8 justify-center" imageClassName="h-10 max-w-[150px]" />

        {loading ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-primary">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
            <h1 className="text-xl font-black text-slate-900">กำลังเตรียมการดาวน์โหลด</h1>
            <p className="text-sm font-medium text-slate-500 max-w-xs mx-auto truncate">
              {fileName}
            </p>
            <p className="text-xs text-slate-400">กรุณารอสักครู่ ระบบกำลังสร้างลิงก์ที่ปลอดภัยสำหรับคุณ</p>
          </div>
        ) : error ? (
          <div className="space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <ShieldAlert size={32} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">ไม่สามารถเข้าถึงไฟล์ได้</h1>
              <p className="mt-3 text-sm font-medium text-slate-500 leading-relaxed px-4">
                {error}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <Link 
                to="/login"
                className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-md hover:-translate-y-0.5 active:scale-95 transition-transform"
              >
                เข้าสู่ระบบใหม่
              </Link>
              <Link 
                to="/"
                className="w-full rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-transform"
              >
                กลับสู่หน้าหลัก
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">ดาวน์โหลดสำเร็จแล้ว</h1>
              <p className="mt-2 text-xs text-slate-400">ระบบได้เริ่มการดาวน์โหลดไฟล์ของคุณโดยอัตโนมัติ</p>
              <div className="mt-4 p-3 bg-slate-50 rounded-xl max-w-xs mx-auto">
                <p className="text-xs font-bold text-slate-600 truncate">{fileName}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={handleManualDownload}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <Download size={14} />
                หากดาวน์โหลดไม่เริ่มขึ้น คลิกที่นี่
              </button>
              <Link 
                to="/"
                className="w-full rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-transform"
              >
                กลับสู่หน้าหลัก
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadFilePage;
