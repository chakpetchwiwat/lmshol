import React from 'react';
import { Target, X, Search } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import CustomDateTimePicker from '../common/CustomDateTimePicker';
import CustomSelect from '../common/CustomSelect';

const CreateGoalModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  currentUser,
  departments,
  courses,
  onSave,
  courseSearch,
  setCourseSearch,
  filteredCourses,
  toggleCourse
}) => {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-slide-up">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Target className="text-primary" />
              สร้างเป้าหมายการเรียนใหม่
            </h3>
            <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={onSave} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">ชื่อเป้าหมาย</label>
              <input 
                required
                type="text" 
                placeholder="เช่น เป้าหมายประจำสัปดาห์แรกของเดือน"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none transition-all"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            {currentUser?.role === 'admin' && (
              <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">การขยายผล (Scope)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <CustomSelect
                    label="ขอบเขตเป้าหมาย"
                    value={formData.scope}
                    onChange={e => setFormData({...formData, scope: e.target.value})}
                    options={[
                      { value: 'GLOBAL', label: 'ทั้งองค์กร (Global)' },
                      { value: 'DEPARTMENT', label: 'เฉพาะแผนก (Department)' }
                    ]}
                  />
                  {formData.scope === 'DEPARTMENT' && (
                    <CustomSelect
                      label="ระบุแผนก"
                      required
                      value={formData.departmentId}
                      onChange={e => setFormData({...formData, departmentId: e.target.value})}
                      options={[
                        { value: '', label: '-- เลือกแผนก --' },
                        ...departments.map(dept => ({ value: dept.id, label: dept.name }))
                      ]}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">ประเภทเป้าหมาย</label>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, type: 'ANY'})}
                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${formData.type === 'ANY' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400'}`}
                  >
                    คอร์สใดก็ได้
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, type: 'SPECIFIC'})}
                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${formData.type === 'SPECIFIC' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400'}`}
                  >
                    เลือกคอร์ส
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <CustomDateTimePicker
                  showTime={false}
                  isEndOfDay={true}
                  value={formData.expiryDate}
                  onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                  label="วันหมดอายุ (ถ้ามี)"
                />
              </div>
            </div>

            {formData.type === 'ANY' ? (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">จำนวนคอร์สที่ต้องเรียนสำเร็จ</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none transition-all"
                  value={formData.targetCount}
                  onChange={e => setFormData({...formData, targetCount: e.target.value})}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">เลือกคอร์สที่กำหนด ({formData.courseIds.length})</label>
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.courseIds.map(id => (
                    <div key={id} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold">
                      {courses.find(c => c.id === id)?.title}
                      <button type="button" onClick={() => toggleCourse(id)}><X size={14} /></button>
                    </div>
                  ))}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่อคอร์ส..."
                    className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200"
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                  />
                </div>

                <div className="border border-slate-100 rounded-xl max-h-[200px] overflow-y-auto bg-slate-50">
                  {filteredCourses.map(course => (
                    <button 
                      key={course.id} 
                      type="button"
                      onClick={() => toggleCourse(course.id)}
                      className="w-full text-left p-3 text-sm hover:bg-white border-b border-slate-100 last:border-0 transition-colors"
                    >
                      {course.title}
                    </button>
                  ))}
                  {filteredCourses.length === 0 && <div className="p-4 text-center text-xs text-muted">ไม่พบคอร์สที่ต้องการ</div>}
                </div>
              </div>
            )}

            <div className="pt-4">
              <button type="submit" className="w-full btn btn-primary py-4 text-lg shadow-lg shadow-primary/20">
                สร้างเป้าหมายเดี๋ยวนี้
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CreateGoalModal;
