import React from 'react';
import { Target, X, Search } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import CustomDateTimePicker from '../common/CustomDateTimePicker';
import CustomSelect from '../common/CustomSelect';
import { REMINDER_TIME_OPTIONS } from '../../utils/dateUtils';

const CreateGoalModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  currentUser,
  departments,
  courses,
  onSave,
  isEditing,
  courseSearch,
  setCourseSearch,
  filteredCourses,
  toggleCourse
}) => {
  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-fade-in">
        <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between border-b border-border p-6">
            <h3 className="flex items-center gap-2 text-xl font-black text-slate-800">
              <Target className="text-primary" />
              {isEditing ? 'แก้ไขเป้าหมายการเรียน' : 'สร้างเป้าหมายการเรียนใหม่'}
            </h3>
            <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={onSave} className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">ชื่อเป้าหมาย</label>
              <input
                required
                type="text"
                placeholder="เช่น เป้าหมายการเรียนประจำเดือน"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-primary"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {currentUser?.role === 'admin' && (
              <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Scope</h4>
                <div className="grid grid-cols-2 gap-4">
                  <CustomSelect
                    label="ขอบเขตเป้าหมาย"
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      options={[
                        { value: '', label: '-- เลือกแผนก --' },
                        ...departments.map((dept) => ({ value: dept.id, label: dept.name }))
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
                    onClick={() => setFormData({ ...formData, type: 'ANY' })}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-bold transition-all ${formData.type === 'ANY' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400'}`}
                  >
                    คอร์สใดก็ได้
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'SPECIFIC' })}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-bold transition-all ${formData.type === 'SPECIFIC' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400'}`}
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
                  onChange={(e) => setFormData({
                    ...formData,
                    expiryDate: e.target.value,
                    preDeadlineReminderDays: e.target.value ? formData.preDeadlineReminderDays : '',
                    preDeadlineReminderTime: e.target.value ? formData.preDeadlineReminderTime : ''
                  })}
                  label="วันหมดเขต (ถ้ามี)"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Goal Notifications</h4>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CustomSelect
                  label="การแจ้งเตือนหลังมอบหมาย"
                  value={formData.postAssignmentReminderDays}
                  onChange={(e) => setFormData({
                    ...formData,
                    postAssignmentReminderDays: e.target.value,
                    postAssignmentReminderTime: e.target.value ? (formData.postAssignmentReminderTime || '09:00') : ''
                  })}
                  options={[
                    { value: '', label: 'ไม่ส่งแจ้งเตือน' },
                    { value: '0', label: 'ทันที' },
                    { value: '3', label: '3 วัน' },
                    { value: '7', label: '7 วัน' }
                  ]}
                />

                <CustomSelect
                  label="การแจ้งเตือนก่อนครบกำหนด"
                  value={formData.preDeadlineReminderDays}
                  onChange={(e) => setFormData({
                    ...formData,
                    preDeadlineReminderDays: e.target.value,
                    preDeadlineReminderTime: e.target.value ? (formData.preDeadlineReminderTime || '09:00') : ''
                  })}
                  options={[
                    { value: '', label: formData.expiryDate ? 'ไม่ส่งแจ้งเตือน' : 'ตั้งวันหมดเขตก่อน' },
                    { value: '3', label: '3 วัน' },
                    { value: '7', label: '7 วัน' }
                  ]}
                  disabled={!formData.expiryDate}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CustomSelect
                  label="เวลาแจ้งเตือนหลังมอบหมาย"
                  value={formData.postAssignmentReminderTime}
                  onChange={(e) => setFormData({ ...formData, postAssignmentReminderTime: e.target.value })}
                  options={REMINDER_TIME_OPTIONS}
                  disabled={!formData.postAssignmentReminderDays}
                  placeholder="เลือกเวลา"
                />

                <CustomSelect
                  label="เวลาแจ้งเตือนก่อนครบกำหนด"
                  value={formData.preDeadlineReminderTime}
                  onChange={(e) => setFormData({ ...formData, preDeadlineReminderTime: e.target.value })}
                  options={REMINDER_TIME_OPTIONS}
                  disabled={!formData.preDeadlineReminderDays || !formData.expiryDate}
                  placeholder="เลือกเวลา"
                />
              </div>

              <p className="text-xs font-medium text-slate-500">
                ระบบจะใช้เวลาไทย (Asia/Bangkok) ทั้งตอนคำนวณวันแจ้งเตือนและตอนแสดงผลบนฝั่งผู้ใช้
              </p>
            </div>

            {formData.type === 'ANY' ? (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">จำนวนคอร์สที่ต้องเรียนสำเร็จ</label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-primary"
                  value={formData.targetCount}
                  onChange={(e) => setFormData({ ...formData, targetCount: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">เลือกคอร์สที่กำหนด ({formData.courseIds.length})</label>

                <div className="mb-2 flex flex-wrap gap-2">
                  {formData.courseIds.map((id) => (
                    <div key={id} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                      {courses.find((course) => course.id === id)?.title}
                      <button type="button" onClick={() => toggleCourse(id)}><X size={14} /></button>
                    </div>
                  ))}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อคอร์ส..."
                    className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                </div>

                <div className="max-h-[200px] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50">
                  {filteredCourses.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => toggleCourse(course.id)}
                      className="w-full border-b border-slate-100 p-3 text-left text-sm transition-colors hover:bg-white last:border-0"
                    >
                      {course.title}
                    </button>
                  ))}
                  {filteredCourses.length === 0 && (
                    <div className="p-4 text-center text-xs text-muted">ไม่พบคอร์สที่ต้องการ</div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4">
              <button type="submit" className="btn btn-primary w-full py-4 text-lg shadow-lg shadow-primary/20">
                {isEditing ? 'บันทึกการแก้ไข' : 'สร้างเป้าหมายนี้'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CreateGoalModal;
