import React from 'react';
import { Building2, Check, Tags, X } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import CustomDateTimePicker from '../common/CustomDateTimePicker';
import CustomSelect from '../common/CustomSelect';
import ProfileEducationSection from '../user/ProfileEducationSection';
import ProfileFilesSection from '../user/ProfileFilesSection';
import ProfileCertificates from '../user/ProfileCertificates';

const UserModal = ({
  isOpen,
  onClose,
  onSave,
  editingUser,
  formData,
  setFormData,
  departments,
  tiers,
  positionLevels = [],
  positionTypes = [],
  subdivisions = [],
  cohortRoles = [],
  canEditRole = true,
  profileCertificates = [],
  lmsCertificates = [],
  competencies = [],
  savingProfileDetails = false,
  uploadingProfileFile = false,
  savingCertificate = false,
  uploadingCertificate = false,
  onUploadProfileFile,
  onOpenProfileFile,
  onCreateCertificate,
  onUpdateCertificate,
  onDeleteCertificate,
  onUploadCertificate,
}) => {
  const [assignmentMode, setAssignmentMode] = React.useState('department');
  const roleOptions = cohortRoles;
  const selectedRoleLabels = (formData.roles || []).map(key => cohortRoles.find(r => r.key === key)?.name).filter(Boolean);
  
  const toggleCohortRole = (roleKey) => {
    const current = formData.roles || [];
    const isSelected = current.includes(roleKey);
    let nextRoles = [];
    let nextRoleLevels = { ...(formData.roleLevels || {}) };

    if (isSelected) {
      nextRoles = current.filter(k => k !== roleKey);
      delete nextRoleLevels[roleKey];
    } else {
      nextRoles = [...current, roleKey];
      const role = cohortRoles.find(r => r.key === roleKey);
      const roleLevels = role?.levels || [];
      nextRoleLevels[roleKey] = roleLevels[0] || '';
    }

    setFormData(prev => ({
      ...prev,
      roles: nextRoles,
      roleLevels: nextRoleLevels
    }));
  };

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

  const selectedDepartmentName = React.useMemo(
    () => departments.find((department) => department.id === formData.departmentId)?.name || 'ยังไม่ได้กำหนดแผนก',
    [departments, formData.departmentId]
  );

  const handleSaveEducation = async (educationHistory) => {
    setFormData((current) => ({ ...current, educationHistory }));
    return true;
  };

  const handleUploadProfileFile = async (file) => {
    const uploaded = await onUploadProfileFile?.(file);
    if (!uploaded) return;

    const nextFile = {
      id: `${Date.now()}`,
      title: file.name,
      fileName: uploaded?.fileName || file.name,
      fileKey: uploaded?.fileKey || '',
      fileUrl: uploaded?.fileUrl || '',
      fileMimeType: uploaded?.fileMimeType || file.type,
      uploadedAt: new Date().toISOString(),
    };

    setFormData((current) => ({
      ...current,
      profileFiles: [nextFile, ...((current.profileFiles || []))]
    }));
  };

  const handleDeleteProfileFile = async (fileId) => {
    setFormData((current) => ({
      ...current,
      profileFiles: (current.profileFiles || []).filter((file) => file.id !== fileId)
    }));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="card flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden border border-slate-100 bg-white shadow-2xl">
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
                placeholder="อย่างน้อย 8 ตัวอักษร"
                className="form-input w-full"
                value={formData.password}
                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="mustChangePassword"
                  checked={formData.mustChangePassword || false}
                  onChange={(event) => setFormData({ ...formData, mustChangePassword: event.target.checked })}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <label htmlFor="mustChangePassword" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  บังคับเปลี่ยนรหัสผ่านในการเข้าสู่ระบบครั้งแรก
                </label>
              </div>
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
                    ...(canEditRole || formData.role === 'admin' ? [{ value: 'admin', label: 'Admin' }] : [])
                  ]}
                />
                {formData.tierId && formData.role !== 'admin' && (
                  <p className="mt-1 ml-1 text-[11px] font-medium text-slate-400 italic">
                    * สิทธิ์ระบบจะถูกกำหนดโดยอัตโนมัติตาม "ตำแหน่ง (Position)" ที่คุณเลือก
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
                      label="กลุ่มงาน (SUB-DIVISION)"
                      value={formData.subdivision || ''}
                      onChange={(event) => setFormData({ ...formData, subdivision: event.target.value })}
                      options={[
                        { value: '', label: 'ไม่ได้ระบุ' },
                        ...subdivisions.map(s => ({ value: s.name, label: s.name }))
                      ]}
                    />

                    <CustomSelect
                      label="ตำแหน่ง (POSITION)"
                      value={formData.tierId}
                      onChange={(event) => setFormData({ ...formData, tierId: event.target.value })}
                      options={[
                        { value: '', label: 'ไม่ได้ระบุ' },
                        ...tiers.map((t) => ({ value: t.id, label: t.name }))
                      ]}
                    />

                    <CustomSelect
                      label="ระดับตำแหน่ง (LEVEL)"
                      value={formData.positionLevel || ''}
                      onChange={(event) => setFormData({ ...formData, positionLevel: event.target.value })}
                      options={[
                        { value: '', label: 'ไม่ได้ระบุ' },
                        ...positionLevels.map(l => ({ value: l.name, label: l.name }))
                      ]}
                    />

                    <CustomSelect
                      label="ประเภทตำแหน่ง (TYPE)"
                      value={formData.positionType || ''}
                      onChange={(event) => setFormData({ ...formData, positionType: event.target.value })}
                      options={[
                        { value: '', label: 'ไม่ได้ระบุ' },
                        ...positionTypes.map(t => ({ value: t.name, label: t.name }))
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
                      <div className="max-h-[350px] overflow-y-auto pr-1 space-y-4">
                        {Object.entries(
                          roleOptions.reduce((acc, role) => {
                            const groupName = role.group || 'ทั่วไป';
                            if (!acc[groupName]) acc[groupName] = [];
                            acc[groupName].push(role);
                            return acc;
                          }, {})
                        ).map(([groupName, roles]) => (
                          <div key={groupName} className="space-y-2 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                            <h6 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                              {groupName} ({roles.length})
                            </h6>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {roles.map((role) => {
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
                                    <span className="truncate block flex-1">{role.name}</span>
                                    <span
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
              การมองเห็นคอร์สแบบลำดับขั้นจะอิงจาก "ระดับ" เช่น ถ้าเปิดให้เริ่มจาก Supervisor ผู้ที่อยู่ระดับสูงกว่าอย่าง Manager และ Director จะเห็นด้วย
            </div>

            {editingUser && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-black text-slate-900">Profile information</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    แก้ข้อมูลแทนผู้ใช้ได้จากที่นี่ แล้วกดบันทึกข้อมูลด้านล่างเพื่อบันทึกประวัติการศึกษาและไฟล์ข้อมูลอื่นๆ
                  </p>
                </div>

                <ProfileEducationSection
                  education={Array.isArray(formData.educationHistory) ? formData.educationHistory : []}
                  saving={savingProfileDetails}
                  onSave={handleSaveEducation}
                />

                <ProfileFilesSection
                  files={Array.isArray(formData.profileFiles) ? formData.profileFiles : []}
                  saving={savingProfileDetails}
                  uploading={uploadingProfileFile}
                  onUpload={handleUploadProfileFile}
                  onDelete={handleDeleteProfileFile}
                  onOpen={onOpenProfileFile}
                />

                <ProfileCertificates
                  certificates={profileCertificates}
                  lmsCertificates={lmsCertificates}
                  competencies={competencies}
                  saving={savingCertificate}
                  uploading={uploadingCertificate}
                  onCreate={onCreateCertificate}
                  onUpdate={onUpdateCertificate}
                  onDelete={onDeleteCertificate}
                  onUpload={onUploadCertificate}
                />
              </div>
            )}

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
