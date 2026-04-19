import React from 'react';
import { AlertCircle, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const RiskIdentificationWidget = ({ data }) => {
  return (
    <div className="card flex min-w-0 flex-col p-6 card-no-lift h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} className="text-error" />
          <h3 className="text-lg font-bold">Risk Identification</h3>
        </div>
        <span className="badge badge-error badge-sm">Critical</span>
      </div>
      
      <div className="flex-1 overflow-auto">
        {(data || []).length > 0 ? (
          <div className="flex flex-col gap-4">
            {data.map((risk, index) => (
              <div 
                key={`${risk.userName}-${index}`}
                className="group flex flex-col p-3 rounded-xl border border-slate-100 hover:border-error/30 hover:bg-error/5 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{risk.userName}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{risk.department || 'General'}</p>
                  </div>
                  {risk.isOverdue && (
                    <span className="text-[10px] font-black text-error animate-pulse">LATE</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                  <div className="p-1 rounded bg-slate-100 group-hover:bg-error/10">
                    <Clock size={12} className={risk.isOverdue ? "text-error" : "text-slate-400"} />
                  </div>
                  <span className="truncate font-medium">{risk.courseTitle}</span>
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <Calendar size={10} />
                    <span>Due: {risk.deadline ? format(new Date(risk.deadline), 'd MMM yy', { locale: th }) : 'N/A'}</span>
                  </div>
                  <button className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">NUDGE</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <AlertCircle size={24} className="text-slate-200" />
            </div>
            <p className="text-sm font-bold text-slate-400">No immediate risks detected</p>
            <p className="text-xs text-slate-300">All learners are currently within safe deadlines.</p>
          </div>
        )}
      </div>
      
      <div className="mt-6">
        <button className="btn btn-ghost btn-sm w-full text-xs font-bold text-slate-500 hover:text-primary">
          View All At-Risk Learners
        </button>
      </div>
    </div>
  );
};

export default RiskIdentificationWidget;
