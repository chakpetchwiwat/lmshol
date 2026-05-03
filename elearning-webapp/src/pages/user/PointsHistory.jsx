import React from 'react';
import { ArrowLeft, Gift, CheckCircle, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../../utils/api';
import Skeleton from '../../components/common/Skeleton';
import { formatThaiDateTime } from '../../utils/dateUtils';

const PointsHistory = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('earned');
  const [history, setHistory] = React.useState([]);
  const [balance, setBalance] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await userAPI.getPointsHistory();
        setHistory(res.data.history);
        setBalance(res.data.balance);
      } catch (error) {
        console.error('Fetch points history error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const earnedLogs = history.filter((log) => log.points > 0);
  const usedLogs = history.filter((log) => log.points < 0);

  const renderLogIcon = (type, points) => {
    if (points > 0) {
      if (type === 'course') {
        return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500"><CheckCircle size={20} /></div>;
      }
      if (type === 'quiz') {
        return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-500"><TrendingUp size={20} /></div>;
      }
      if (type === 'admin_edit') {
        return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500"><TrendingUp size={20} /></div>;
      }

      return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500"><TrendingUp size={20} /></div>;
    }

    if (type === 'redeem') {
      return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500"><Gift size={20} /></div>;
    }

    return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500"><TrendingDown size={20} /></div>;
  };

  const getHistoryActionLabel = (sourceType) => {
    if (sourceType === 'course') return 'เรียนจบและรับแต้ม';
    if (sourceType === 'quiz') return 'ผ่านแบบทดสอบและรับแต้ม';
    if (sourceType === 'redeem') return 'ใช้แต้มแลกรางวัล';
    return 'ผู้ดูแลระบบปรับแต้ม';
  };

  const getHistoryTagLabel = (sourceType) => {
    if (sourceType === 'redeem') return 'แลกแต้ม';
    if (sourceType === 'course') return 'เรียนจบ';
    if (sourceType === 'quiz') return 'ควิซ';
    return 'ปรับโดยแอดมิน';
  };

  const getHistoryFallbackName = (sourceType) => {
    if (sourceType === 'course') return 'การเรียนรู้';
    if (sourceType === 'quiz') return 'แบบทดสอบ';
    return 'ของรางวัล';
  };

  const currentList = activeTab === 'earned' ? earnedLogs : usedLogs;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 animate-fade-in pt-4 md:pt-2">
      <button onClick={() => navigate(-1)} className="mb-2 flex w-max items-center gap-2 font-bold text-slate-500 transition-colors hover:text-slate-800">
        <ArrowLeft size={20} /> ย้อนกลับ
      </button>

      <div className="card mesh-bg relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border-none p-10 text-center shadow-sm ring-1 ring-slate-200/50">
        <span className="mb-4 inline-block rounded-full border border-white/40 bg-white/60 px-4 py-1 text-xs font-bold text-primary shadow-sm backdrop-blur-md">
          แต้มของคุณ
        </span>
        <h2 className="flex items-end justify-center gap-2 text-5xl font-black tracking-tight text-slate-800">
          {balance} <span className="mb-1 text-2xl font-bold text-slate-500">แต้ม</span>
        </h2>
      </div>

      <div className="flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
        <button
          onClick={() => setActiveTab('earned')}
          className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all ${activeTab === 'earned' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          แต้มที่ได้รับ
        </button>
        <button
          onClick={() => setActiveTab('used')}
          className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all ${activeTab === 'used' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          ประวัติการใช้แต้ม
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="mt-2 px-1 text-lg font-extrabold text-slate-800">ประวัติล่าสุด</h3>

        {loading ? (
          <Skeleton.List count={6} />
        ) : currentList.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border-dashed bg-white p-12 text-center shadow-sm ring-1 ring-slate-100">
            <Clock size={40} className="mb-4 text-slate-300" />
            <p className="font-medium text-slate-500">ยังไม่มีประวัติในหมวดนี้</p>
          </div>
        ) : (
          currentList.map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ring-1 ring-slate-100 transition-transform hover:-translate-y-0.5">
              <div className="flex items-center gap-4">
                {renderLogIcon(log.sourceType, log.points)}
                <div>
                  <h4 className="text-sm font-bold leading-tight text-slate-800 md:text-base">
                    {getHistoryActionLabel(log.sourceType)}: {log.note ? log.note.split(': ').pop() : getHistoryFallbackName(log.sourceType)}
                  </h4>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {formatThaiDateTime(log.createdAt)}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className={`text-lg font-black ${log.points > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {log.points > 0 ? '+' : ''}
                  {log.points}
                </span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{getHistoryTagLabel(log.sourceType)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="h-8"></div>
    </div>
  );
};

export default PointsHistory;
