import React from 'react';
import { Droplet, Flame, CheckCircle2, HelpCircle, Search, Calendar } from 'lucide-react';
import { formatThaiDateTime } from '../../utils/dateUtils';

const formatShortThaiDate = (value) => {
  const formattedValue = formatThaiDateTime(value);
  return formattedValue === '-' ? '-' : formattedValue.split(' ')[0] || formattedValue;
};

const BaptismMilestonesWidget = ({ data, onViewUser }) => {
  const {
    waterBaptizedCount = 0,
    spiritBaptizedCount = 0,
    pendingWaterCount = 0,
    pendingSpiritCount = 0,
    users = []
  } = data || {};

  const totalUsers = users.length;
  
  const waterRate = totalUsers > 0 ? Math.round((waterBaptizedCount / totalUsers) * 100) : 0;
  const spiritRate = totalUsers > 0 ? Math.round((spiritBaptizedCount / totalUsers) * 100) : 0;

  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('all'); // all, pendingWater, pendingSpirit

  const filteredUsers = React.useMemo(() => {
    return users.filter(user => {
      // Search filter
      const matchesSearch = 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.nickname && user.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Tab filter
      if (activeTab === 'pendingWater') {
        return !user.waterBaptismDate;
      }
      if (activeTab === 'pendingSpirit') {
        return !user.spiritBaptismDate;
      }
      return true;
    });
  }, [users, searchTerm, activeTab]);

  return (
    <div className="card card-no-lift flex h-full min-w-0 flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Droplet size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900">หลักหมายการบัพติศมา (Baptism)</h3>
            <p className="text-sm text-slate-500">ติดตามความคืบหน้าการรับบัพติศมาน้ำและพระวิญญาณ</p>
          </div>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
        {/* Water Baptism card */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Droplet size={14} className="text-blue-500" />
              บัพติศมาในน้ำ
            </span>
            <span className="text-sm font-bold text-blue-600">{waterRate}%</span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{waterBaptizedCount} <span className="text-xs font-semibold text-slate-400">/ {totalUsers} คน</span></p>
          <div className="h-1.5 w-full rounded-full bg-slate-100 mt-2 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${waterRate}%` }} />
          </div>
        </div>

        {/* Spirit Baptism card */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Flame size={14} className="text-rose-500" />
              บัพติศมาในพระวิญญาณ
            </span>
            <span className="text-sm font-bold text-rose-600">{spiritRate}%</span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{spiritBaptizedCount} <span className="text-xs font-semibold text-slate-400">/ {totalUsers} คน</span></p>
          <div className="h-1.5 w-full rounded-full bg-slate-100 mt-2 overflow-hidden">
            <div className="h-full rounded-full bg-rose-500" style={{ width: `${spiritRate}%` }} />
          </div>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อ, ชื่อเล่น..."
            className="form-input w-full bg-slate-50 py-2 pl-9 pr-4 text-xs font-semibold rounded-xl"
          />
        </div>
        
        <div className="flex gap-2 border-b border-slate-100 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'all' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pendingWater')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'pendingWater' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ยังไม่ได้บัพติศมาน้ำ ({pendingWaterCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pendingSpirit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'pendingSpirit' ? 'bg-rose-50 text-rose-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ยังไม่ได้บัพติศมาพระวิญญาณ ({pendingSpiritCount})
          </button>
        </div>
      </div>

      {/* Member List */}
      <div className="flex-1 overflow-auto max-h-[300px] pr-1">
        {filteredUsers.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="flex flex-col md:flex-row md:items-center justify-between rounded-xl border border-slate-50 p-3 hover:bg-slate-50/50 transition-all"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => onViewUser?.(u.id)}
                    className="text-sm font-bold text-slate-800 hover:text-primary hover:underline text-left block"
                  >
                    {u.name} ({u.nickname})
                  </button>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mt-0.5">
                    {u.tier.split(' - ')[0] || u.tier} · {u.department}
                  </span>
                </div>
                
                <div className="flex gap-2 mt-2 md:mt-0">
                  {/* Water badge */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black ${
                    u.waterBaptismDate 
                      ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}>
                    {u.waterBaptismDate ? <CheckCircle2 size={10} /> : <HelpCircle size={10} />}
                    น้ำ: {u.waterBaptismDate ? formatShortThaiDate(u.waterBaptismDate) : 'ยังไม่รับ'}
                  </span>
                  
                  {/* Spirit badge */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black ${
                    u.spiritBaptismDate 
                      ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}>
                    {u.spiritBaptismDate ? <CheckCircle2 size={10} /> : <HelpCircle size={10} />}
                    พระวิญญาณ: {u.spiritBaptismDate ? formatShortThaiDate(u.spiritBaptismDate) : 'ยังไม่รับ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <p className="text-xs font-bold text-slate-400">ไม่พบสมาชิกในเงื่อนไขนี้</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BaptismMilestonesWidget;
