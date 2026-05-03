import React from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';

const STATUS_CONFIG = {
  SUBMITTED: { label: 'Waiting', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <AlertCircle size={14} /> },
  PASSED: { label: 'Passed', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: <CheckCircle size={14} /> },
  FAILED: { label: 'Failed', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: <XCircle size={14} /> },
  NEEDS_REVISION: { label: 'Revision', color: 'text-sky-600 bg-sky-50 border-sky-100', icon: <RefreshCw size={14} /> },
};

const AssessmentGrading = () => {
  const toast = useToast();
  const [submissions, setSubmissions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('SUBMITTED'); // Default to waiting
  const [gradingSubmission, setGradingSubmission] = React.useState(null);
  const [gradeForm, setGradeForm] = React.useState({ score: '', feedback: '', needsRevision: false });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchSubmissions = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchTerm || undefined
      };
      const response = await adminAPI.getAllAssessmentSubmissions(params);
      setSubmissions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Fetch assessments error:', error);
      toast.error('Unable to load assessment submissions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, toast]);

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
    // Prioritize lesson points as the master max score
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
      // We use the same grading endpoint but it requires courseId. 
      // Luckily our submission object now includes the course via the new service.
      const courseId = gradingSubmission.lesson.course.id;
      
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
      const courseId = submission.lesson?.course?.id;
      if (!courseId) throw new Error('Course ID not found');
      
      const response = await adminAPI.getAssessmentSubmissionDownloadUrl(courseId, submission.id);
      const url = response?.data?.url || response?.url;
      if (!url) throw new Error('No download URL');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Open file error:', error);
      toast.error('Unable to open submission file');
    }
  };

  const waitingCount = submissions.filter(s => s.status === 'SUBMITTED').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <ClipboardCheck size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">ตรวจงานผู้เรียน</h1>
              <p className="text-slate-500 font-bold text-sm mt-0.5">ศูนย์รวมการประเมินผลและให้คะแนน</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                type="text"
                placeholder="ค้นหาชื่อผู้เรียน..."
                className="w-full md:w-64 pl-11 pr-4 py-3 bg-slate-50 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => fetchSubmissions()}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-primary hover:border-primary transition-all shadow-sm active:scale-95"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-500 uppercase tracking-wider">รอตรวจ</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{waitingCount}</p>
              </div>
            </div>
          </div>
          {/* Add more stats if needed */}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button 
            onClick={() => setStatusFilter('SUBMITTED')}
            className={`px-6 py-2.5 rounded-full text-sm font-black transition-all ${statusFilter === 'SUBMITTED' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            รอตรวจ
          </button>
          <button 
            onClick={() => setStatusFilter('PASSED')}
            className={`px-6 py-2.5 rounded-full text-sm font-black transition-all ${statusFilter === 'PASSED' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            ผ่านแล้ว
          </button>
          <button 
            onClick={() => setStatusFilter('ALL')}
            className={`px-6 py-2.5 rounded-full text-sm font-black transition-all ${statusFilter === 'ALL' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            ทั้งหมด
          </button>
        </div>

        {/* Table Content */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">ผู้เรียน</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">คอร์ส / บทเรียน</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">วันที่ส่ง</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-slate-400 uppercase tracking-widest">สถานะ</th>
                  <th className="px-6 py-5 text-right text-xs font-black text-slate-400 uppercase tracking-widest">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8 text-center">
                        <div className="h-4 bg-slate-100 rounded-full w-3/4 mx-auto mb-2" />
                      </td>
                    </tr>
                  ))
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
                          <ClipboardCheck size={32} />
                        </div>
                        <p className="text-slate-400 font-bold">ไม่พบรายการงานส่ง</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black text-sm">
                            {sub.user?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{sub.user?.name}</p>
                            <p className="text-xs font-bold text-slate-400">{sub.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="max-w-xs">
                          <p className="text-xs font-black text-primary uppercase tracking-wider mb-1 line-clamp-1">
                            {sub.lesson?.course?.title}
                          </p>
                          <p className="text-sm font-bold text-slate-700 line-clamp-1">{sub.lesson?.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-600">
                          {new Date(sub.submittedAt).toLocaleDateString('th-TH', { 
                            day: 'numeric', month: 'short', year: 'numeric' 
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        {sub.status && (
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${STATUS_CONFIG[sub.status]?.color}`}>
                            {STATUS_CONFIG[sub.status]?.icon}
                            {STATUS_CONFIG[sub.status]?.label?.toUpperCase() || sub.status}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={() => handleGrade(sub)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:text-primary hover:border-primary hover:shadow-md transition-all active:scale-95"
                        >
                          ตรวจงาน <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setGradingSubmission(null)} />
          
          <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <ClipboardCheck size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">ตรวจงานผู้เรียน</h3>
                  <p className="text-sm font-bold text-slate-500 mt-1">{gradingSubmission.user?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setGradingSubmission(null)}
                className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Submission File */}
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">ไฟล์ที่ส่งมา</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary border border-slate-200 shadow-sm">
                      <Download size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 line-clamp-1">{gradingSubmission.fileName || 'Assessment_File'}</p>
                      <p className="text-xs font-bold text-slate-400">คลิกปุ่มเพื่อตรวจสอบไฟล์</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => openFile(gradingSubmission)}
                    className="btn btn-primary btn-sm !rounded-xl"
                  >
                    เปิดดูไฟล์ <ExternalLink size={14} className="ml-1.5" />
                  </button>
                </div>
                {gradingSubmission.note && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">บันทึกจากผู้เรียน</p>
                    <p className="text-sm font-bold text-slate-600 italic">"{gradingSubmission.note}"</p>
                  </div>
                )}
              </div>

              {/* Grading Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-700 ml-1">คะแนนที่ได้</label>
                  <div className="relative">
                    <input 
                      type="number"
                      className="form-input w-full !py-4 pr-16 font-black text-lg"
                      placeholder="0"
                      value={gradeForm.score}
                      onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">
                      / {gradingSubmission.lesson?.points || gradingSubmission.maxScore || 10}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-end">
                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer w-full group">
                    <input 
                      type="checkbox"
                      className="h-5 w-5 rounded-lg border-2 border-slate-300 text-primary focus:ring-primary transition-all cursor-pointer"
                      checked={gradeForm.needsRevision}
                      onChange={(e) => setGradeForm({ ...gradeForm, needsRevision: e.target.checked })}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-700 group-hover:text-primary transition-colors">ขอให้ส่งงานใหม่</p>
                      <p className="text-[10px] font-bold text-slate-400">ผู้เรียนต้องแก้ไขและส่งไฟล์อีกรอบ</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 ml-1">ข้อเสนอแนะจากผู้สอน (Feedback)</label>
                <textarea 
                  className="form-input w-full min-h-24 resize-none !py-4"
                  placeholder="เขียนคำแนะนำเพื่อให้ผู้เรียนพัฒนาขึ้น..."
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                />
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
              <button 
                onClick={() => setGradingSubmission(null)}
                className="flex-1 py-4 text-sm font-black text-slate-600 hover:text-slate-900 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={submitGrade}
                disabled={isSubmitting}
                className="flex-[2] btn btn-primary py-4 font-black shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <>บันทึกผลการตรวจ <CheckCircle size={20} className="ml-2" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentGrading;
