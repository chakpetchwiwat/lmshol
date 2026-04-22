import React, { useEffect } from 'react';
import { X } from 'lucide-react';
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
  canEditRole = true,
}) => {
  // Sync Role with Tier managerAccess
  useEffect(() => {
    // Protected: Don't sync for superadmins (they shouldn't be downgraded by changing tier)
    if (formData.role === 'admin') return;

    if (formData.tierId) {
      const selectedTier = tiers.find((t) => t.id === formData.tierId);
      if (selectedTier) {
        const targetRole = selectedTier.managerAccess ? 'manager' : 'user';
        if (formData.role !== targetRole) {
          setFormData((prev) => ({ ...prev, role: targetRole }));
        }
      }
    }
  }, [formData.tierId, tiers, formData.role, setFormData]);

  if (!isOpen) {
    return null;
  }

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="card flex max-h-[95vh] w-full max-w-2xl flex-col border border-slate-100 bg-white shadow-2xl">
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
                  label="สิทธิ์ระบบ"
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

            <div className="grid gap-5 md:grid-cols-2">
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
