import React, { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../utils/api';
import Skeleton from '../../components/common/Skeleton';
import { Save, Settings, Target, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { isSuperAdmin } from '../../utils/roles';

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    weekly_goal: '1',
    weekly_goal_scope: 'global',
    weekly_goal_departmentId: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const currentUser = useMemo(() => JSON.parse(localStorage.getItem('user') || 'null'), []);
  const isFullAdmin = isSuperAdmin(currentUser);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await adminAPI.getSettings();
        setSettings(res.data);
      } catch (err) {
        console.error('Failed to fetch settings', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (isFullAdmin) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [isFullAdmin]);

  const handleSave = async (key, value) => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await adminAPI.updateSetting(key, value);
      setSettings((prev) => ({
        ...prev,
        [key]: value,
        weekly_goal_scope: response.data?.scope || prev.weekly_goal_scope,
        weekly_goal_departmentId: response.data?.departmentId ?? prev.weekly_goal_departmentId,
      }));
      setMessage({ type: 'success', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' });
    } catch (err) {
      console.error('Failed to save setting', err);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!isFullAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
        <h2 className="text-2xl font-black mb-2">เข้าถึงไม่ได้</h2>
        <p className="text-muted">คุณไม่มีสิทธิ์ในการตั้งค่าระบบ</p>
      </div>
    );
  }


  if (loading) {
    return <Skeleton.List count={6} />;
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isFullAdmin ? 'ตั้งค่าระบบ' : 'ตั้งค่า Weekly Goal'}
            </h1>
            <p className="text-slate-500 font-medium">
              {isFullAdmin
                ? 'กำหนดค่าเริ่มต้นของระบบสำหรับผู้ใช้งานทั้งหมด'
                : `กำหนดเป้าหมายรายสัปดาห์สำหรับแผนก ${currentUser?.department || 'ของคุณ'}`}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-slide-up border ${
          message.type === 'success' ? 'bg-success-bg text-success-text border-success-border' : 'bg-danger-bg text-danger-text border-danger-border'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-slate-100 group transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)] hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-primary">
              <Target size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Weekly Goal</h3>
              <p className="text-xs font-medium text-slate-500">
                Scope: {settings.weekly_goal_scope === 'department' ? 'Department' : 'Global'}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                จำนวนคอร์สที่ต้องเรียนจบต่อสัปดาห์
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  min="1"
                  max="50"
                  value={settings.weekly_goal || '1'} 
                  onChange={(e) => setSettings((prev) => ({ ...prev, weekly_goal: e.target.value }))}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-primary focus:bg-white focus:outline-none font-black text-lg transition-all"
                />
                <button 
                  onClick={() => handleSave('weekly_goal', settings.weekly_goal)}
                  disabled={saving}
                  className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200"
                >
                  <Save size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-2xl flex gap-3 text-slate-500">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p className="text-xs font-medium leading-relaxed">
                {isFullAdmin
                  ? 'ค่านี้จะเป็นค่าเริ่มต้นของทั้งระบบ แต่ถ้าแผนกใดมี manager ตั้งค่าเฉพาะแผนกไว้ ผู้ใช้ในแผนกนั้นจะเห็นค่าเฉพาะแผนกแทน'
                  : 'ค่านี้จะถูกใช้เฉพาะผู้ใช้งานในแผนกของคุณ และจะ override ค่า global ของระบบ'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center opacity-60 transition-all hover:opacity-100">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-4 shadow-sm">
            <Settings size={22} />
          </div>
          <h4 className="font-black text-slate-400 text-sm">
            {isFullAdmin ? 'More Settings Coming Soon' : 'Manager Scope Enabled'}
          </h4>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
