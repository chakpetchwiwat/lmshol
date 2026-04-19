import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const QuizSection = ({
  lesson,
  answers,
  setAnswers,
  quizResult,
  setQuizResult,
  quizResultRef,
  handleQuizSubmit,
  updating,
  canEarnQuizPoints,
  quizRewardPoints
}) => {
  const toast = useToast();

  if (!lesson || !lesson.questions) return null;

  return (
    <div className="flex flex-col gap-8">
      {!quizResult && (
        <div className="group relative flex items-start gap-5 overflow-hidden rounded-[2rem] md:rounded-3xl border border-slate-800 bg-slate-950 p-5 md:p-7 shadow-[0_26px_60px_-38px_rgba(15,23,42,0.95)]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center shrink-0 font-black border border-primary/20 relative z-10">i</div>
          <div className="relative z-10">
            {canEarnQuizPoints && (
              <p className="mb-3 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black tracking-[0.04em] text-amber-300">
                ผ่านครั้งแรก รับ {quizRewardPoints.toLocaleString()} แต้ม
              </p>
            )}
            <p className="font-bold text-white mb-1">เกณฑ์การผ่าน</p>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">คุณต้องได้คะแนนอย่างน้อย {lesson.passScore || 60}% ({Math.ceil((lesson.passScore || 60)/100 * (lesson.questions?.length || 0))} ข้อ) จากทั้งหมด {lesson.questions?.length || 0} ข้อ เพื่อผ่านบทเรียนนี้</p>
          </div>
        </div>
      )}

      {quizResult && (
        <div ref={quizResultRef} className={`relative overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem] border-2 transition-all duration-500 shadow-2xl flex flex-col items-center gap-5 text-center p-8 md:p-12 ${
          quizResult.passed
            ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200'
            : 'bg-gradient-to-br from-red-50 to-white border-red-200'
        }`}>
          {/* Background glow */}
          <div className={`absolute inset-0 opacity-20 ${
            quizResult.passed
              ? 'bg-[radial-gradient(circle_at_top,_#10b981,_transparent_60%)]'
              : 'bg-[radial-gradient(circle_at_top,_#ef4444,_transparent_60%)]'
          }`} />

          {/* Icon */}
          <div className={`relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl ${
            quizResult.passed ? 'bg-emerald-500 shadow-emerald-300' : 'bg-red-500 shadow-red-300'
          }`}>
            {quizResult.passed
              ? <CheckCircle size={44} strokeWidth={2.5} />
              : <span className="text-3xl font-black">✕</span>}
          </div>

          {/* Title */}
          <div className="relative z-10">
            <h3 className={`text-2xl md:text-3xl font-black tracking-tighter mb-1 ${
              quizResult.passed ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {quizResult.passed ? '🎉 ยอดเยี่ยมมาก!' : 'เกือบผ่านแล้ว!'}
            </h3>
            <p className="text-sm font-semibold text-slate-500">ผลคะแนนของคุณ</p>
          </div>

          {/* Score bubble */}
          <div className={`relative z-10 px-10 py-6 rounded-3xl shadow-inner ${
            quizResult.passed ? 'bg-emerald-500' : 'bg-red-500'
          }`}>
            <p className="text-6xl md:text-7xl font-black text-white tracking-tighter">
              {quizResult.scorePercent}%
            </p>
            <p className="text-xs font-bold text-white/70 mt-1">คะแนนที่ได้</p>
          </div>

          {/* Points earned */}
          {quizResult.passed && (
            <div className="relative z-10 flex flex-col items-center gap-2">
              {quizResult.earnedQuizPoints > 0 && (
                <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-700 ring-1 ring-emerald-200">
                  +{quizResult.earnedQuizPoints.toLocaleString()} แต้มจากแบบทดสอบ
                </div>
              )}
              {quizResult.earnedCoursePoints > 0 && (
                <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-black text-primary ring-1 ring-primary/20">
                  +{quizResult.earnedCoursePoints.toLocaleString()} แต้มจากการเรียนจบคอร์ส
                </div>
              )}
              {quizResult.earnedPoints === 0 && canEarnQuizPoints && (
                <p className="text-xs font-bold text-slate-400">แต้มจะได้รับเฉพาะตอนผ่านครั้งแรกเท่านั้น</p>
              )}
            </div>
          )}

          {/* Action button */}
          <div className="relative z-10 mt-4">
            <button
              onClick={() => { setQuizResult(null); setAnswers({}); }}
              className={`rounded-2xl px-8 py-4 text-sm font-black tracking-[0.04em] text-white shadow-lg transition-all ${
                quizResult.passed
                  ? 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700'
                  : 'bg-red-600 shadow-red-200 hover:bg-red-700'
              }`}
            >
              {quizResult.passed ? 'ทบทวนอีกครั้ง' : 'ทำควิซอีกครั้ง'}
            </button>
          </div>
        </div>
      )}


      <div className="flex flex-col gap-6">
        {lesson.questions?.map((q, idx) => {
          const isSubmitted = !!quizResult;
          const userA = answers[q.id];
          const correctA = quizResult?.correctAnswers?.[q.id];
          const isCorrect = userA === correctA;
          const isWrong = userA && userA !== correctA;
          
          return (
            <div key={q.id} className={`bg-white border-[1.5px] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 transition-all ${isSubmitted && isWrong ? 'border-red-300 bg-red-50/40' : isSubmitted && isCorrect ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-100 hover:border-slate-200'}`}>
              <div className="flex justify-between items-start mb-10">
                 <h4 className="text-lg md:text-xl font-bold text-slate-900 leading-relaxed flex gap-4 md:gap-5">
                   <span className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs md:text-sm font-black shadow-lg shadow-slate-200">{idx + 1}</span>
                   {q.text}
                 </h4>
              </div>
              <div className="flex flex-col gap-3.5">
                {q.choices.map(c => {
                  let choiceState = "normal";
                  if (isSubmitted) {
                    if (c.id === correctA) choiceState = "correct";
                    else if (c.id === userA) choiceState = "wrong";
                    else choiceState = "untouched";
                  } else if (userA === c.id) {
                    choiceState = "selected";
                  }

                  return (
                    <label
                      key={c.id}
                      onClick={() => !isSubmitted && setAnswers({ ...answers, [q.id]: c.id })}
                      className={`flex items-center gap-4 md:gap-5 p-4 md:p-6 rounded-xl md:rounded-2xl border-2 transition-all cursor-pointer ${
                        choiceState === "selected" ? "border-primary bg-primary/5 shadow-[0_10px_30px_rgba(79,70,229,0.1)]" :
                        choiceState === "correct" ? "border-emerald-500 bg-emerald-50 text-emerald-900" :
                        choiceState === "wrong" ? "border-red-400 bg-red-50 text-red-900 opacity-90" :
                        choiceState === "untouched" ? "border-slate-50 bg-slate-50/50 opacity-40 grayscale" :
                        "border-slate-50 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200"
                      } hover:translate-x-1 active:scale-[0.98] group/choice`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        choiceState === "selected" ? "border-primary bg-primary text-white" :
                        choiceState === "correct" ? "border-emerald-500 bg-emerald-500 text-white" :
                        choiceState === "wrong" ? "border-red-400 bg-red-400 text-white" :
                        "border-slate-300 bg-white group-hover/choice:border-slate-400"
                      }`}>
                        {choiceState === "selected" && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        {choiceState === "correct" && <CheckCircle size={14} strokeWidth={3} />}
                        {choiceState === "wrong" && <span className="text-[10px] font-black">X</span>}
                      </div>
                      <span className={`text-[15px] font-medium leading-tight ${choiceState === 'normal' ? 'text-slate-600' : 'text-slate-900 font-black'}`}>{c.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!quizResult && (
        <div className="flex justify-center mt-8 px-6 md:px-0">
          <button
            onClick={handleQuizSubmit}
            disabled={updating || Object.keys(answers).length < (lesson.questions?.length || 0)}
            className="w-full rounded-2xl bg-primary py-5 text-sm font-black tracking-[0.04em] text-white shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 md:w-auto md:px-16"
          >
            {updating ? 'กำลังตรวจ...' : 'ส่งคำตอบควิซ →'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizSection;
