import React from 'react';
import { UserCheck, BookOpen, AlertCircle } from 'lucide-react';

const NewBelieversWidget = ({ data, onViewUser }) => {
  const safeData = data || [];

  return (
    <div className="card card-no-lift flex h-full min-w-0 flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <UserCheck size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900">ผู้เชื่อใหม่ (NB) รอติดตาม</h3>
            <p className="text-sm text-slate-500">ผู้เชื่อใหม่ที่ยังเรียน Welcome Lesson ไม่สำเร็จ</p>
          </div>
        </div>
        <span className="badge badge-warning badge-sm">{safeData.length} คน</span>
      </div>

      <div className="flex-1 overflow-auto max-h-[350px] pr-1">
        {safeData.length > 0 ? (
          <div className="flex flex-col gap-4">
            {safeData.map((user) => (
              <div
                key={user.id}
                className="flex flex-col rounded-2xl border border-slate-100 p-4 text-left transition-all duration-200 hover:border-amber-200 hover:bg-amber-50/30"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onViewUser?.(user.id)}
                      className="text-left font-bold text-slate-800 hover:text-primary hover:underline truncate"
                    >
                      {user.name} ({user.nickname})
                    </button>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      สังกัด {user.department || 'General'}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    user.status === 'IN_PROGRESS' 
                      ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}>
                    {user.status === 'IN_PROGRESS' ? 'กำลังเรียน' : 'ยังไม่เริ่ม'}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} />
                      Welcome Lesson
                    </span>
                    <span>{Math.round(user.progress)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        user.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-300'
                      }`}
                      style={{ width: `${user.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
              <UserCheck size={24} className="text-slate-200" />
            </div>
            <p className="text-sm font-bold text-slate-400">ไม่มีผู้เชื่อใหม่รอติดตาม</p>
            <p className="text-xs text-slate-300">ผู้เชื่อใหม่ทุกคนสำเร็จ Welcome Lesson แล้ว</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewBelieversWidget;
