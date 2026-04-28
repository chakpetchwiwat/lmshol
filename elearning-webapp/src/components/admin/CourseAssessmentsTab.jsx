import React from 'react';
import { CheckCircle, Download, RefreshCw, XCircle } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';

const CourseAssessmentsTab = ({ courseId, readOnly }) => {
  const toast = useToast();
  const [submissions, setSubmissions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [gradingId, setGradingId] = React.useState(null);
  const [gradeForm, setGradeForm] = React.useState({});

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

  const updateGradeForm = (submissionId, patch) => {
    setGradeForm((current) => ({
      ...current,
      [submissionId]: {
        score: '',
        maxScore: '',
        feedback: '',
        needsRevision: false,
        ...(current[submissionId] || {}),
        ...patch,
      },
    }));
  };

  const gradeSubmission = async (submission, needsRevision = false) => {
    const form = gradeForm[submission.id] || {};
    const score = Number(form.score);
    const maxScore = Number(form.maxScore || submission.maxScore || submission.lesson?.points || 10);

    if (!Number.isFinite(score) || score < 0) {
      toast.warning('Please enter a valid score');
      return;
    }

    try {
      setGradingId(submission.id);
      await adminAPI.gradeAssessmentSubmission(courseId, submission.id, {
        score,
        maxScore,
        feedback: form.feedback || '',
        needsRevision,
      });
      toast.success('Assessment graded');
      await fetchSubmissions();
    } catch (error) {
      console.error('Grade assessment error:', error);
      toast.error(error.response?.data?.message || 'Unable to grade assessment');
    } finally {
      setGradingId(null);
    }
  };

  if (loading && submissions.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-lg font-black text-slate-900">Assessment reviews</h4>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Grade uploaded assessment files. Passing grades complete the lesson and can trigger automatic certificates.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchSubmissions}
          className="btn btn-outline btn-sm inline-flex items-center gap-2"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <p className="text-sm font-bold text-slate-500">No assessment submissions yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => {
            const form = gradeForm[submission.id] || {};
            const isBusy = gradingId === submission.id;
            const isPassed = submission.status === 'PASSED';

            return (
              <article key={submission.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                        {submission.status}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <h5 className="mt-3 text-lg font-black text-slate-900">{submission.lesson?.title}</h5>
                    <p className="mt-1 text-sm font-bold text-slate-600">
                      {submission.user?.name || 'Learner'} · {submission.user?.email}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">{submission.fileName || 'Uploaded assessment file'}</p>
                    {submission.score !== null && submission.score !== undefined && (
                      <p className="mt-2 text-sm font-black text-slate-700">
                        Current score: {submission.score}/{submission.maxScore}
                      </p>
                    )}
                    {submission.feedback && (
                      <p className="mt-2 text-sm font-medium text-slate-500">{submission.feedback}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openFile(submission)}
                    className="btn btn-outline btn-sm inline-flex shrink-0 items-center gap-2"
                  >
                    <Download size={14} /> Open file
                  </button>
                </div>

                {!readOnly && !isPassed && (
                  <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-[120px_120px_1fr_auto_auto]">
                    <input
                      type="number"
                      className="form-input w-full"
                      placeholder="Score"
                      value={form.score ?? ''}
                      onChange={(event) => updateGradeForm(submission.id, { score: event.target.value })}
                    />
                    <input
                      type="number"
                      className="form-input w-full"
                      placeholder="Max"
                      value={form.maxScore ?? submission.maxScore ?? submission.lesson?.points ?? 10}
                      onChange={(event) => updateGradeForm(submission.id, { maxScore: event.target.value })}
                    />
                    <input
                      type="text"
                      className="form-input w-full"
                      placeholder="Feedback"
                      value={form.feedback ?? ''}
                      onChange={(event) => updateGradeForm(submission.id, { feedback: event.target.value })}
                    />
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => gradeSubmission(submission, false)}
                      className="btn btn-primary btn-sm inline-flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={14} /> Grade
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => gradeSubmission(submission, true)}
                      className="btn btn-outline btn-sm inline-flex items-center justify-center gap-2"
                    >
                      <XCircle size={14} /> Revise
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourseAssessmentsTab;
