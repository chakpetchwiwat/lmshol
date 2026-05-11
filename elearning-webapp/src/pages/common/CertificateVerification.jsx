import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { BadgeCheck, ShieldAlert, ShieldCheck, FileText, Calendar, Building2, User, Globe } from 'lucide-react';
import { userAPI } from '../../utils/api';
import { formatThaiDateTime } from '../../utils/dateUtils';
import Skeleton from '../../components/common/Skeleton';
import AppLogo from '../../components/common/AppLogo';

const CertificateVerification = () => {
  const { token } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [certificate, setCertificate] = React.useState(null);

  React.useEffect(() => {
    const verify = async () => {
      try {
        setLoading(true);
        const response = await userAPI.verifyLmsCertificate(token);
        setCertificate(response.data);
      } catch (err) {
        console.error('Verification error:', err);
        setError(err.response?.data?.message || 'ไม่สามารถตรวจสอบข้อมูลเกียรติบัตรนี้ได้');
      } finally {
        setLoading(false);
      }
    };

    if (token) verify();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md animate-pulse space-y-4">
          <div className="mx-auto h-20 w-20 rounded-full bg-slate-200" />
          <div className="h-8 rounded-xl bg-slate-200" />
          <div className="h-4 rounded-xl bg-slate-200" />
          <div className="h-40 rounded-3xl bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-500 shadow-sm">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">การตรวจสอบไม่สำเร็จ</h1>
          <p className="mt-3 text-slate-500 font-medium leading-relaxed">
            {error || 'ข้อมูลเกียรติบัตรไม่ถูกต้อง หรืออาจถูกลบออกจากระบบแล้ว'}
          </p>
          <div className="mt-8">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              กลับสู่หน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const snapshot = certificate.metadata?.snapshot || certificate.metadata || {};
  const learner = snapshot.learner || {};
  const course = snapshot.course || {};
  const signer = snapshot.signer || {};

  const isValid = certificate.status === 'VALID';
  const isRevoked = certificate.status === 'REVOKED';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 sm:p-8">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_32px_80px_-20px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/50">
        
        {/* Status Banner */}
        <div className={`flex flex-col items-center justify-center gap-3 py-10 px-6 text-center ${
          isValid ? 'bg-gradient-to-b from-emerald-50/50 to-white' : 'bg-gradient-to-b from-rose-50/50 to-white'
        }`}>
          <div className={`flex h-20 w-20 items-center justify-center rounded-[2rem] shadow-sm transition-transform duration-500 hover:scale-110 ${
            isValid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
          }`}>
            {isValid ? <ShieldCheck size={40} /> : <ShieldAlert size={40} />}
          </div>
          <div>
            <h1 className={`text-2xl font-black ${isValid ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isValid ? 'เกียรติบัตรฉบับนี้เป็นข้อมูลจริง' : 'เกียรติบัตรฉบับนี้ถูกยกเลิกแล้ว'}
            </h1>
            <p className="mt-2 text-sm font-bold tracking-wide text-slate-400 uppercase">
              {isValid ? 'AUTHENTICATED BY SCALEUP LMS' : 'REVOKED CERTIFICATE'}
            </p>
          </div>
        </div>

        {/* Certificate Details */}
        <div className="grid gap-6 p-8 sm:grid-cols-2">
          
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recipient Name</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                  <User size={18} />
                </div>
                <p className="text-[17px] font-black text-slate-900">{learner.name || certificate.learnerName || 'ไม่ระบุชื่อ'}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Course Information</p>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-primary">
                  <BadgeCheck size={18} />
                </div>
                <div>
                  <p className="text-[15px] font-black text-slate-900 leading-tight">{course.title || certificate.courseTitle || 'หลักสูตรทั่วไป'}</p>
                  <AppLogo compact className="mt-2" imageClassName="h-8 max-w-[120px]" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Certificate Number</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <FileText size={18} />
                </div>
                <p className="font-mono text-sm font-black text-slate-700 tracking-tight">{certificate.certificateNo}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Issued Date</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Calendar size={18} />
                </div>
                <p className="text-sm font-black text-slate-700">{formatThaiDateTime(certificate.issuedAt)}</p>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 pt-6 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signed By</p>
                  <p className="text-sm font-black text-slate-700">{signer.name || 'LMS Administrator'}</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-5 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <Globe size={12} />
            Verified Security by ScaleUp Connect Infrastructure
          </p>
        </div>
      </div>

      <div className="mt-12 text-center">
        <AppLogo className="mb-6 justify-center" imageClassName="h-12 max-w-[180px]" />
        <Link 
          to="/" 
          className="text-sm font-black text-slate-900 hover:text-primary transition-colors flex items-center gap-2 justify-center"
        >
          กลับสู่ระบบการเรียนรู้
          <BadgeCheck size={18} className="text-primary" />
        </Link>
      </div>
    </div>
  );
};

export default CertificateVerification;
