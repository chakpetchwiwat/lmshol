import React from 'react';
import { 
  CheckCircle, 
  Download, 
  RefreshCw, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ClipboardCheck,
  Search
} from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';

const STATUS_CONFIG = {
  SUBMITTED: { label: 'รอตรวจ', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <AlertCircle size={14} /> },
  PASSED: { label: 'ผ่านแล้ว', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: <CheckCircle size={14} /> },
  FAILED: { label: 'ไม่ผ่าน', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: <XCircle size={14} /> },
  NEEDS_REVISION: { label: 'ต้องแก้ไข', color: 'text-sky-600 bg-sky-50 border-sky-100', icon: <RefreshCw size={14} /> },
};

const CourseAssessmentsTab = ({ courseId, readOnly }) => {
  const toast = useToast();
  const [submissions, setSubmissions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  
  const [gradingSubmission, setGradingSubmission] = React.useState(null);
  const [gradeForm, setGradeForm] = React.useState({ score: '', feedback: '', needsRevision: false });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchSubmissions = React.useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const response = await adminAPI.getCourseAssessmentSubmissions(courseId);
      setSubmissions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Fetch assessment submissions error:', error);
      toast.error('Unable to load assessment submissions');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  React.useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleGrade = (submission) => {
    setGradingSubmission(submission);
    setGradeForm({
      score: submission.score !== null ? submission.score.toString() : '',
      feedback: submission.feedback || '',
      needsRevision: submission.status === 'NEEDS_REVISION'
    });
  };

  const submitGrade = async () => {
    if (!gradingSubmission) return;

    const score = Number(gradeForm.score);
    const maxScore = gradingSubmission.lesson?.points || gradingSubmission.maxScore || 10;

    if (gradeForm.score === '' || !Number.isFinite(score) || score < 0) {
      toast.warning('Please enter a valid score');
      return;
    }

    if (score > maxScore) {
      toast.warning(`Score cannot be greater than ${maxScore}`);
      return;
    }

    try {
      setIsSubmitting(true);
      await adminAPI.gradeAssessmentSubmission(courseId, gradingSubmission.id, {
        score,
        maxScore,
        feedback: gradeForm.feedback,
        needsRevision: gradeForm.needsRevision
      });

      toast.success('Assessment graded successfully');
      setGradingSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error('Grade submission error:', error);
      toast.error('Unable to submit grade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openFile = async (submission) => {
    try {
      const response = await adminAPI.getAssessmentSubmissionDownloadUrl(courseId, submission.id);
      const url = response?.data?.url || response?.url;
      if (!url) throw new Error('No download URL');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Open assessment submission error:', error);
      toast.error('Unable to open submission file');
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesStatus = statusFilter === 'ALL' || sub.status === statusFilter;
    const matchesSearch = !searchTerm || 
      sub.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.lesson?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const waitingCount = submissions.filter(s => s.status === 'SUBMITTED').length;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck size={18} className="text-primary" />
            <h4 className="text-lg font-black text-slate-900">Assessment Reviews</h4>
          </div>
          <p className="text-sm font-bold text-slate-500">
            ตรวจงานและให้คะแนนผู้เรียนในคอร์สนี้ (รอตรวจ {waitingCount} รายการ)
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
            <input 
              type="text"
              placeholder="ค้นหา..."
              className="pl-9 pr-4 py-2 bg-white border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none w-full sm:w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={fetchSubmissions}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-primary hover:border-primary transition-all shadow-sm active:scale-95"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2">
        {['ALL', 'SUBMITTED', 'PASSED', 'NEEDS_REVISION'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${
              statusFilter === status 
                ? 'bg-primary text-white shadow-md' 
                : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
            }`}
          >
            {status === 'ALL' ? 'ทั้งหมด' : STATUS_CONFIG[status]?.label || status}
          </button>
        ))}
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">ผู้เรียน</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">บทเรียน</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">วันที่ส่ง</th>
                <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">สถานะ</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && submissions.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-6"><div className="h-4 bg-slate-50 rounded-full w-full" /></td>
                  </tr>
                ))
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold text-sm">
                    ไม่พบรายการงานส่ง
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-black text-slate-900">{sub.user?.name}</p>
                        <p className="text-[11px] font-bold text-slate-400">{sub.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{sub.lesson?.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-500">
                        {new Date(sub.submittedAt).toLocaleDateString('th-TH', { 
                          day: 'numeric', month: 'short'
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {sub.status && (
                        <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border ${STATUS_CONFIG[sub.status]?.color}`}>
                          {STATUS_CONFIG[sub.status]?.icon}
                          {STATUS_CONFIG[sub.status]?.label?.toUpperCase() || sub.status}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        disabled={readOnly}
                        onClick={() => handleGrade(sub)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-700 hover:text-primary hover:border-primary transition-all active:scale-95 disabled:opacity-50"
                      >
                        ตรวจงาน <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grading Modal - Using a nested modal approach within the tab */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setGradingSubmission(null)} />
          
          <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">ตรวจงานผู้เรียน</h3>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">{gradingSubmission.user?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setGradingSubmission(null)}
                className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">ไฟล์ที่ส่งมา</p>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center text-primary border border-slate-100">
                      <Download size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{gradingSubmission.fileName || 'Assessment_File'}</p>
                      <p className="text-[10px] font-bold text-slate-400">คลิกปุ่มเพื่อตรวจสอบไฟล์</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => openFile(gradingSubmission)}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black shadow-sm hover:bg-primary-hover transition-colors flex items-center gap-2 shrink-0"
                  >
                    เปิดดูไฟล์ <ExternalLink size={12} />
                  </button>
                </div>
                {gradingSubmission.note && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">บันทึกจากผู้เรียน</p>
                    <p className="text-xs font-bold text-slate-600 italic">"{gradingSubmission.note}"</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider ml-1">คะแนนที่ได้</label>
                  <div className="relative">
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                      placeholder="0"
                      value={gradeForm.score}
                      onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">
                      / {gradingSubmission.lesson?.points || gradingSubmission.maxScore || 10}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-end">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer w-full group">
                    <input 
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      checked={gradeForm.needsRevision}
                      onChange={(e) => setGradeForm({ ...gradeForm, needsRevision: e.target.checked })}
                    />
                    <div>
                      <p className="text-xs font-black text-slate-700 group-hover:text-primary transition-colors">ขอให้ส่งงานใหม่</p>
                      <p className="text-[9px] font-bold text-slate-400">ผู้เรียนต้องแก้ไขและส่งไฟล์อีกรอบ</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider ml-1">ข้อเสนอแนะจากผู้สอน (Feedback)</label>
                <textarea 
                  className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all min-h-20 resize-none"
                  placeholder="เขียนคำแนะนำเพื่อให้ผู้เรียนพัฒนาขึ้น..."
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
              <button 
                onClick={() => setGradingSubmission(null)}
                className="flex-1 py-3 text-xs font-black text-slate-500 hover:text-slate-900 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={submitGrade}
                disabled={isSubmitting}
                className="flex-[2] py-3 bg-primary text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw size={16} className="animate-spin mx-auto" /> : (
                  <div className="flex items-center justify-center gap-2">
                    บันทึกผลการตรวจ <CheckCircle size={16} />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseAssessmentsTab;
