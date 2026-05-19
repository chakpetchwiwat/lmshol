import React from 'react';
import { Building2, Check, ChevronRight, Search, Target, UserRound, UsersRound, X } from 'lucide-react';
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
  departments = [],
  users = [],
  courses,
  onSave,
  isEditing,
  courseSearch,
  setCourseSearch,
  filteredCourses,
  toggleCourse
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const selectedDepartmentIds = React.useMemo(() => (
    Array.isArray(formData.departmentIds)
      ? formData.departmentIds
      : (formData.departmentId ? [formData.departmentId] : [])
  ), [formData.departmentId, formData.departmentIds]);
  const selectedUserIds = Array.isArray(formData.userIds) ? formData.userIds : [];
  const [userSearch, setUserSearch] = React.useState('');
  const isPostAssignmentImmediate = formData.postAssignmentReminderDays === '0';
  const hasTimedPostAssignmentReminder = Boolean(formData.postAssignmentReminderDays) && !isPostAssignmentImmediate;

  const availableDepartments = React.useMemo(() => (
    isAdmin ? departments : departments.filter((dept) => dept.id === currentUser?.departmentId)
  ), [currentUser?.departmentId, departments, isAdmin]);

  const scopedUsers = React.useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();

    return (users || [])
      .filter((user) => selectedDepartmentIds.length === 0 || selectedDepartmentIds.includes(user.departmentId))
      .filter((user) => {
        if (!keyword) return true;
        const departmentName = user.departmentRef?.name || user.department || '';
        return `${user.name || ''} ${user.email || ''} ${departmentName}`.toLowerCase().includes(keyword);
      });
  }, [selectedDepartmentIds, userSearch, users]);

  const setAllOrganization = () => {
    setFormData({
      ...formData,
      scope: 'GLOBAL',
      departmentId: '',
      departmentIds: [],
      userIds: []
    });
  };

  const toggleDepartment = (departmentId) => {
    const nextDepartmentIds = selectedDepartmentIds.includes(departmentId)
      ? selectedDepartmentIds.filter((id) => id !== departmentId)
      : [...selectedDepartmentIds, departmentId];
    const nextUserIds = selectedUserIds.filter((userId) => {
      const user = users.find((item) => item.id === userId);
      return nextDepartmentIds.includes(user?.departmentId);
    });

    setFormData({
      ...formData,
      scope: nextUserIds.length > 0 ? 'USER' : (nextDepartmentIds.length > 0 ? 'DEPARTMENT' : 'GLOBAL'),
      departmentId: nextDepartmentIds[0] || '',
      departmentIds: nextDepartmentIds,
      userIds: nextUserIds
    });
  };

  const toggleUser = (userId) => {
    const nextUserIds = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId];

    setFormData({
      ...formData,
      scope: nextUserIds.length > 0 ? 'USER' : (selectedDepartmentIds.length > 0 ? 'DEPARTMENT' : 'GLOBAL'),
      userIds: nextUserIds
    });
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="card w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-border p-6">
            <h3 className="flex items-center gap-2 text-xl font-black text-slate-800">
              <Target className="text-primary" />
              {isEditing ? 'แก้ไขเป้าหมายการเรียนรู้' : 'สร้างเป้าหมายการเรียนรู้ใหม่'}
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
                placeholder="เช่น เป้าหมายการเรียนรู้ประจำเดือน"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-primary"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <span>Audience</span>
                <ChevronRight size={14} />
                <span className={formData.scope === 'GLOBAL' ? 'text-primary' : ''}>ทั้งองค์กร</span>
                <ChevronRight size={14} />
                <span className={selectedDepartmentIds.length > 0 ? 'text-primary' : ''}>แผนก</span>
                <ChevronRight size={14} />
                <span className={selectedUserIds.length > 0 ? 'text-primary' : ''}>รายบุคคล</span>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={setAllOrganization}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                    formData.scope === 'GLOBAL'
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-primary/30'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <UsersRound size={18} />
                    <span>
                      <span className="block text-sm font-black">ทั้งองค์กร</span>
                      <span className="block text-xs font-semibold text-slate-400">ทุกคนในระบบจะได้รับเป้าหมายนี้</span>
                    </span>
                  </span>
                  {formData.scope === 'GLOBAL' && <Check size={18} />}
                </button>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-slate-700">เลือกแผนก</label>
                  {selectedDepartmentIds.length > 0 && (
                    <span className="text-xs font-bold text-primary">{selectedDepartmentIds.length} แผนก</span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {availableDepartments.map((dept) => {
                    const isSelected = selectedDepartmentIds.includes(dept.id);
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => toggleDepartment(dept.id)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition-all ${
                          isSelected
                            ? 'border-primary bg-white text-primary shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-primary/30'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Building2 size={16} className="shrink-0" />
                          <span className="truncate">{dept.name}</span>
                        </span>
                        {isSelected && <Check size={16} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedDepartmentIds.length > 0 && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="text-sm font-bold text-slate-700">เลือกรายบุคคล</label>
                    <span className="text-xs font-bold text-slate-400">
                      {selectedUserIds.length > 0 ? `${selectedUserIds.length} คนที่เลือก` : 'ไม่เลือก = ทั้งแผนกที่เลือก'}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ อีเมล หรือแผนก..."
                      className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>

                  <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1">
                    {scopedUsers.map((user) => {
                      const isSelected = selectedUserIds.includes(user.id);
                      const departmentName = user.departmentRef?.name || user.department || '';
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => toggleUser(user.id)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-slate-100 bg-slate-50 text-slate-700 hover:bg-white'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-400">
                              <UserRound size={16} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-black">{user.name || user.email}</span>
                              <span className="block truncate text-xs font-semibold text-slate-400">{departmentName || user.email}</span>
                            </span>
                          </span>
                          {isSelected && <Check size={16} className="shrink-0" />}
                        </button>
                      );
                    })}
                    {scopedUsers.length === 0 && (
                      <div className="rounded-xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">
                        ไม่พบผู้ใช้ในเงื่อนไขนี้
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
                    postAssignmentReminderTime: e.target.value && e.target.value !== '0' ? (formData.postAssignmentReminderTime || '09:00') : ''
                  })}
                  options={[
                    { value: '', label: 'ไม่ส่งแจ้งเตือน' },
                    { value: '0', label: 'แจ้งทันที (Immediately)' },
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
                    { value: '0', label: 'วันครบกำหนดพอดี' },
                    { value: '3', label: '3 วัน' },
                    { value: '7', label: '7 วัน' }
                  ]}
                  disabled={!formData.expiryDate}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CustomSelect
                  label="เวลาแจ้งเตือนหลังมอบหมาย"
                  value={isPostAssignmentImmediate ? '' : formData.postAssignmentReminderTime}
                  onChange={(e) => setFormData({ ...formData, postAssignmentReminderTime: e.target.value })}
                  options={REMINDER_TIME_OPTIONS}
                  disabled={!hasTimedPostAssignmentReminder}
                  placeholder={isPostAssignmentImmediate ? 'ส่งทันที' : 'เลือกเวลา'}
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
