import React from 'react';
import { CheckCircle, Download, FileText, Upload } from 'lucide-react';

const STATUS_STYLES = {
  SUBMITTED: 'border-amber-100 bg-amber-50 text-amber-800',
  PASSED: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  FAILED: 'border-rose-100 bg-rose-50 text-rose-800',
  NEEDS_REVISION: 'border-sky-100 bg-sky-50 text-sky-800',
};

const STATUS_LABELS = {
  SUBMITTED: 'Waiting for review',
  PASSED: 'Passed',
  FAILED: 'Not passed',
  NEEDS_REVISION: 'Needs revision',
};

const AssessmentSection = ({
  lesson,
  submission,
  selectedFile,
  setSelectedFile,
  note,
  setNote,
  uploading,
  updating,
  onSubmit,
  onDownload,
}) => {
  const fileInputRef = React.useRef(null);
  const passScore = lesson.passScore || 60;
  const maxScore = lesson.points || submission?.maxScore || 10;
  const canSubmit = !submission || ['FAILED', 'NEEDS_REVISION'].includes(submission.status);
  const isWaitingForReview = submission?.status === 'SUBMITTED';
  const statusClass = STATUS_STYLES[submission?.status] || STATUS_STYLES.SUBMITTED;

  return (
    <div className="space-y-6">
      <div className="rich-text-content rounded-[2rem] border border-slate-100 bg-slate-50/70 px-6 py-7 text-[1.05rem] text-slate-700 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.2)] md:px-8 md:py-9 md:text-[1.1rem]">
        <p className="text-sm font-black uppercase tracking-[0.04em] text-primary">Assessment</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{lesson.title}</h2>
        <div className="mt-4 grid gap-3 text-sm font-bold text-slate-600 sm:grid-cols-2">
          <div className="rounded-2xl border border-white bg-white px-4 py-3">Max score: {maxScore}</div>
          <div className="rounded-2xl border border-white bg-white px-4 py-3">Pass standard: {passScore}%</div>
        </div>
        {lesson.content ? (
          <div className="mt-6" dangerouslySetInnerHTML={{ __html: lesson.content }} />
        ) : (
          <p className="mt-6 font-medium text-slate-500">Upload your assessment file for instructor review.</p>
        )}
      </div>

      {submission && (
        <section className={`rounded-[2rem] border px-6 py-5 ${statusClass}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.04em]">Latest submission</p>
              <h3 className="mt-1 text-lg font-black">{STATUS_LABELS[submission.status] || submission.status}</h3>
              <p className="mt-1 text-sm font-bold opacity-80">{submission.fileName || 'Uploaded file'}</p>
              {submission.score !== null && submission.score !== undefined && (
                <p className="mt-2 text-sm font-black">
                  Score: {submission.score}/{submission.maxScore}
                </p>
              )}
              {submission.feedback && (
                <p className="mt-3 text-sm font-medium leading-relaxed">{submission.feedback}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDownload(submission)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-current/20 bg-white/80 px-5 py-3 text-sm font-black shadow-sm transition hover:bg-white"
            >
              <Download size={16} /> Open file
            </button>
          </div>
        </section>
      )}

      {canSubmit && (
        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          />
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center text-slate-600 transition hover:border-primary/40 hover:bg-primary/5"
            >
              {selectedFile ? <CheckCircle className="text-emerald-500" size={28} /> : <Upload size={28} />}
              <span className="text-sm font-black">
                {selectedFile ? selectedFile.name : 'Choose assessment file'}
              </span>
            </button>
            <textarea
              className="form-input min-h-24 w-full resize-y"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional note for the instructor"
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={!selectedFile || uploading || updating}
              className="btn btn-primary inline-flex items-center justify-center gap-2 rounded-2xl py-4 font-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading || updating ? 'Submitting...' : 'Submit assessment'}
              <FileText size={18} />
            </button>
          </div>
        </section>
      )}

      {isWaitingForReview && (
        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 px-6 py-5 text-sm font-bold text-amber-800">
          Your file has been submitted. This lesson will be completed automatically after the instructor gives a passing grade.
        </section>
      )}
    </div>
  );
};

export default AssessmentSection;
