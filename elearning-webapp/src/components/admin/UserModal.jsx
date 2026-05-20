import React from 'react';
import { Building2, Check, Tags, X } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import CustomDateTimePicker from '../common/CustomDateTimePicker';
import CustomSelect from '../common/CustomSelect';

const UserModal = ({
  isOpen,
  onClose,
  onSave,
  editingUser,
  formData,
  setFormData,
  departments,
  tiers,
  cohortRoles = [],
  canEditRole = true,
}) => {
  const [assignmentMode, setAssignmentMode] = React.useState('department');
  const assignmentInitRef = React.useRef(null);

  // Sync Role with Tier managerAccess
  React.useEffect(() => {
    // Protected: Don't sync for superadmins (they shouldn't be downgraded by changing tier)
    if (formData.role === 'admin') return;

    if (formData.tierId) {
      const selectedTier = tiers.find((t) => t.id === formData.tierId);
      if (selectedTier) {
        const targetRole = selectedTier.accessAdmin ? 'manager' : 'user';
        if (formData.role !== targetRole) {
          setFormData((prev) => ({ ...prev, role: targetRole }));
        }
      }
    }
  }, [formData.tierId, tiers, formData.role, setFormData]);

  React.useEffect(() => {
    if (!isOpen) {
      assignmentInitRef.current = null;
      return;
    }

    const modalKey = editingUser?.id || 'new-user';
    if (assignmentInitRef.current === modalKey) return;

    const hasRoles = (formData.roles || []).length > 0;
    assignmentInitRef.current = modalKey;
    setAssignmentMode(hasRoles && !formData.departmentId ? 'role' : 'department');
  }, [editingUser?.id, formData.departmentId, formData.roles, isOpen]);

  const roleOptions = React.useMemo(() => {
    const configured = cohortRoles
      .filter((role) => role?.key)
      .map((role) => ({ key: role.key, name: role.name || role.key }));
    const configuredKeys = new Set(configured.map((role) => role.key));
    const legacySelections = (formData.roles || [])
      .filter((roleKey) => roleKey && !configuredKeys.has(roleKey))
      .map((roleKey) => ({ key: roleKey, name: roleKey }));

    return [...configured, ...legacySelections];
  }, [cohortRoles, formData.roles]);

  const selectedDepartmentName = React.useMemo(
    () => departments.find((department) => department.id === formData.departmentId)?.name || 'ยังไม่ได้กำหนดแผนก',
    [departments, formData.departmentId]
  );

  const selectedRoleLabels = React.useMemo(() => {
    const labelMap = Object.fromEntries(roleOptions.map((role) => [role.key, role.name]));
    return (formData.roles || []).map((roleKey) => labelMap[roleKey] || roleKey);
  }, [formData.roles, roleOptions]);

  const toggleCohortRole = (roleKey) => {
    const currentRoles = formData.roles || [];
    const nextRoles = currentRoles.includes(roleKey)
      ? currentRoles.filter((item) => item !== roleKey)
      : [...currentRoles, roleKey];
    setFormData((prev) => ({ ...prev, roles: nextRoles }));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="card flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              {editingUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              กำหนดแผนก ระดับ และสิทธิ์การใช้งานของบัญชีนี้
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="ปิดหน้าต่างจัดการผู้ใช้งาน"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form id="user-form" onSubmit={onSave} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">ชื่อ - นามสกุล</label>
                <input
                  required
                  type="text"
                  className="form-input w-full"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">อีเมล</label>
                <input
                  required
                  type="email"
                  className="form-input w-full"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  placeholder="employee@company.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                รหัสผ่าน {editingUser && <span className="text-xs font-medium text-slate-400">(เว้นว่างหากไม่ต้องการเปลี่ยน)</span>}
              </label>
              <input
                required={!editingUser}
                type="password"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="form-input w-full"
                value={formData.password}
                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              />
            </div>

            {canEditRole && (
              <div className="relative">
                <CustomSelect
                  label="สิทธิ์ระบบ (Permission)"
                  value={formData.role}
                  disabled={!!formData.tierId && formData.role !== 'admin'}
                  onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                  options={[
                    { value: 'user', label: 'User' },
                    { value: 'manager', label: 'Manager' },
                    ...(canEditRole || formData.role === 'admin' ? [{ value: 'admin', label: 'Admin (Superadmin)' }] : [])
                  ]}
                />
                {formData.tierId && formData.role !== 'admin' && (
                  <p className="mt-1 ml-1 text-[11px] font-medium text-slate-400 italic">
                    * สิทธิ์ระบบจะถูกกำหนดโดยอัตโนมัติตาม "ระดับ" ที่คุณเลือก
                  </p>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <label className="block text-sm font-black text-slate-900">Assign ผู้ใช้งาน</label>
                  <p className="mt-1 text-xs font-semibold text-slate-500">จัดแผนกและ Cohort Role ไว้ในส่วนเดียวกัน</p>
                </div>
                <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setAssignmentMode('department')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition-all ${
                      assignmentMode === 'department'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Building2 size={15} />
                    แผนก
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentMode('role')}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition-all ${
                      assignmentMode === 'role'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Tags size={15} />
                    Role
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                {assignmentMode === 'department' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <CustomSelect
                      label="แผนก"
                      value={formData.departmentId}
                      onChange={(event) => setFormData({ ...formData, departmentId: event.target.value })}
                      options={[
                        { value: '', label: 'ยังไม่ได้กำหนดแผนก' },
                        ...departments.map((d) => ({ value: d.id, label: d.name }))
                      ]}
                    />

                    <CustomSelect
                      label="ระดับ"
                      value={formData.tierId}
                      onChange={(event) => setFormData({ ...formData, tierId: event.target.value })}
                      options={[
                        { value: '', label: 'ยังไม่ได้กำหนดระดับ' },
                        ...tiers.map((t) => ({ value: t.id, label: t.name }))
                      ]}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">Cohort Roles</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">เลือกได้หลาย role เช่น Trainee G1, G2, G3</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">
                        {selectedRoleLabels.length} selected
                      </span>
                    </div>

                    {roleOptions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-400">
                        ยังไม่มี Cohort Role ในระบบ
                      </div>
                    ) : (
                      <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {roleOptions.map((role) => {
                          const isSelected = (formData.roles || []).includes(role.key);
                          return (
                            <button
                              key={role.key}
                              type="button"
                              onClick={() => toggleCohortRole(role.key)}
                              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition-all ${
                                isSelected
                                  ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span className="min-w-0 truncate">{role.name}</span>
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                isSelected
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-slate-300 bg-white text-transparent'
                              }`}
                              >
                                <Check size={13} strokeWidth={3} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">แผนก</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-800">{selectedDepartmentName}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cohort Role</p>
                  {selectedRoleLabels.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedRoleLabels.map((label) => (
                        <span key={label} className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm font-black text-slate-400">ยังไม่ได้กำหนด Role</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
              การมองเห็นคอร์สแบบลำดับขั้นจะอิงจาก "ระดับ" เช่น ถ้าเปิดให้เริ่มจาก Supervisor ผู้ที่อยู่ระดับสูงกว่าอย่าง Manager และ Director จะเห็นด้วย
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col">
                <CustomDateTimePicker
                  showTime={false}
                  value={formData.employmentDate}
                  onChange={(event) => setFormData({ ...formData, employmentDate: event.target.value })}
                  label="วันที่เริ่มงาน"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">แต้มสะสม</label>
                <input
                  type="number"
                  className="form-input w-full font-bold text-warning"
                  value={formData.pointsBalance}
                  onChange={(event) => setFormData({
                    ...formData,
                    pointsBalance: parseInt(event.target.value, 10) || 0,
                  })}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="btn btn-outline flex-1">
            ยกเลิก
          </button>
          <button type="submit" form="user-form" className="btn btn-primary flex-1">
            บันทึกข้อมูล
          </button>
        </div>
      </div>
      </div>
    </ModalPortal>
  );
};

export default UserModal;
