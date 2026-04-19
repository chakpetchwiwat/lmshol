import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Archive, ArrowDown, ArrowUp, ChevronDown, Clock, LayoutGrid, Plus, RotateCcw, Trash2, Edit2 
} from 'lucide-react';
import { ICON_LIST } from '../../utils/icons';
import { adminAPI } from '../../utils/api';
import { toUTCISOString, toLocalInputValue, formatThaiDateTime } from '../../utils/dateUtils';
import ModalPortal from '../common/ModalPortal';
import CustomDateTimePicker from '../common/CustomDateTimePicker';
import CustomSelect from '../common/CustomSelect';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import useConfirm from '../../hooks/useConfirm';
import { ENTITY_VIEW_STATUS } from '../../utils/constants/statuses';

const getDefaultCategoryForm = () => ({
  name: '',
  icon: 'Grid',
  type: 'STRAT_BUSINESS',
  order: 0,
  visibleToAll: true,
  visibleDepartmentIds: [],
  visibleTierIds: [],
  isTemporary: false,
  expiredAt: '',
});

const CategoryManagementModal = ({ 
  isOpen, 
  onClose, 
  categories, 
  departments, 
  tiers, 
  onRefresh 
}) => {
  const toast = useToast();
  const { confirm, ConfirmDialogProps } = useConfirm();
  const iconPickerRef = useRef(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [categoryForm, setCategoryForm] = useState(getDefaultCategoryForm());
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryView, setCategoryView] = useState(ENTITY_VIEW_STATUS.ACTIVE);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target)) {
        setShowIconPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetCategoryEditor = () => {
    setEditingCategoryId(null);
    setCategoryForm(getDefaultCategoryForm());
  };

  const handleSaveCategory = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...categoryForm,
        expiredAt: categoryForm.isTemporary ? toUTCISOString(categoryForm.expiredAt) : null,
      };

      if (editingCategoryId) {
        await adminAPI.updateCategory(editingCategoryId, payload);
      } else {
        await adminAPI.createCategory(payload);
      }

      resetCategoryEditor();
      toast.success(editingCategoryId ? 'อัปเดตหมวดหมู่เรียบร้อย' : 'สร้างหมวดหมู่เรียบร้อย');
      onRefresh();
    } catch (error) {
      console.error('Save category error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถบันทึกหมวดหมู่ได้');
    }
  };

  const handleRepublishCategory = async (id) => {
    try {
      await adminAPI.republishCategory(id);
      onRefresh();
      toast.success('นำหมวดหมู่กลับมาเผยแพร่แล้ว');
    } catch (error) {
      console.error('Republish category error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถนำกลับมาเผยแพร่ได้');
    }
  };

  const handleDeleteCategory = async (id) => {
    const ok = await confirm({
      title: 'ยืนยันการลบหมวดหมู่ถาวร',
      message: 'ยืนยันการลบหมวดหมู่นี้อย่างถาวรใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
      confirmLabel: 'ลบถาวร',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.deleteCategory(id);
      onRefresh();
      toast.success('ลบหมวดหมู่ถาวรเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Delete category error:', error);
      toast.error(error.response?.data?.message || 'ลบหมวดหมู่ไม่สำเร็จ');
    }
  };

  const handleArchiveCategory = async (id) => {
    const ok = await confirm({
      title: 'ยืนยันการเก็บเข้าคลัง (Archive)',
      message: 'หมวดหมู่นี้จะหายไปจากหน้ารายการปกติและผู้ใช้ทั่วไปจะไม่เห็น แต่คุณยังสามารถกู้คืนได้จากแถบ Archive',
      confirmLabel: 'เก็บเข้าคลัง',
      variant: 'warning',
    });
    if (!ok) return;

    try {
      await adminAPI.archiveCategory(id);
      onRefresh();
      toast.success('เก็บหมวดหมู่เข้าคลังเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Archive category error:', error);
      toast.error(error.response?.data?.message || 'เก็บเข้าคลังไม่สำเร็จ');
    }
  };

  const handleMoveCategory = async (index, direction) => {
    if (categoryView === ENTITY_VIEW_STATUS.ARCHIVED) return;

    const activeCategories = categories.filter((category) => !category.isArchived);
    const reordered = [...activeCategories];

    if (direction === -1 && index > 0) {
      [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    } else if (direction === 1 && index < reordered.length - 1) {
      [reordered[index + 1], reordered[index]] = [reordered[index], reordered[index + 1]];
    } else {
      return;
    }

    try {
      await adminAPI.reorderCategories({
        categoryIds: reordered.map((category) => category.id),
      });
      onRefresh();
    } catch (error) {
      console.error('Reorder categories error:', error);
      toast.error(error.response?.data?.message || 'บันทึกลำดับหมวดหมู่ไม่สำเร็จ');
    }
  };

  const filteredCategories = useMemo(() => (
    categories.filter((category) => (categoryView === ENTITY_VIEW_STATUS.ARCHIVED ? Boolean(category.isArchived) : !category.isArchived))
  ), [categories, categoryView]);

  if (!isOpen) return null;

  return (
    <>
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          className="card flex max-h-[90vh] w-full max-w-4xl flex-col bg-white p-6 shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 id="category-modal-title" className="text-xl font-bold">จัดการหมวดหมู่</h3>
            <button 
              type="button"
              onClick={() => { onClose(); resetCategoryEditor(); }} 
              className="text-muted hover:text-gray-800"
            >
              ปิด
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[
              { key: ENTITY_VIEW_STATUS.ACTIVE, label: `หมวดหมู่ที่เผยแพร่อยู่ (${categories.filter((c) => !c.isArchived).length})`, icon: LayoutGrid },
              { key: ENTITY_VIEW_STATUS.ARCHIVED, label: `Archive (${categories.filter((c) => c.isArchived).length})`, icon: Archive },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setCategoryView(key); resetCategoryEditor(); }}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all ${
                  categoryView === key
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {key === ENTITY_VIEW_STATUS.ACTIVE ? <LayoutGrid size={16} /> : <Archive size={16} />}
                {label}
              </button>
            ))}
          </div>

          <form 
            onSubmit={handleSaveCategory} 
            className={`mb-5 space-y-4 rounded-3xl border-2 p-5 transition-all duration-300 ${
              editingCategoryId 
                ? 'border-primary/30 bg-primary/5 shadow-inner' 
                : 'border-slate-100 bg-slate-50/70'
            }`}
          >
            <div className="flex items-center justify-between px-1">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {editingCategoryId ? 'กำลังแก้ไขหมวดหมู่' : 'สร้างหมวดหมู่ใหม่'}
                </label>
                {editingCategoryId && (
                  <button 
                    type="button"
                    onClick={resetCategoryEditor}
                    className="text-xs font-bold text-primary hover:underline uppercase tracking-widest"
                  >
                    ยกเลิกการแก้ไข
                  </button>
                )}
              </div>

            <CustomSelect
              label="กลุ่มหลัก (Module)"
              value={categoryForm.type}
              onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
              options={[
                { value: 'STRAT_BUSINESS', label: 'Business Acumen / Corporate Knowledge' },
                { value: 'STRAT_CORE', label: 'Core / Soft Skills' },
                { value: 'STRAT_FUNCTIONAL', label: 'Functional Skills' },
                { value: 'STRAT_LEADERSHIP', label: 'Leadership Skills' },
                { value: 'STRAT_COMPLIANCE', label: 'Compliance' },
                { value: 'STRAT_DIGITAL', label: 'Digital / Future Skills' }
              ]}
            />

            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">ชื่อหมวดหมู่</label>
                <input
                  required
                  type="text"
                  placeholder="เช่น AI, Business, ..."
                  className={`form-input w-full bg-white px-4 py-3 text-sm font-bold transition-all ${
                    editingCategoryId ? 'border-primary/50 ring-2 ring-primary/10' : 'border-slate-200'
                  }`}
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
                />
              </div>

              <div className="w-full md:w-64 space-y-1.5" ref={iconPickerRef}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">ไอคอนแสดงผล</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm font-bold transition-all ${
                      showIconPicker ? 'border-primary ring-2 ring-primary/10' : editingCategoryId ? 'border-primary/50' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-primary">
                        {React.createElement(ICON_LIST[categoryForm.icon || 'LayoutGrid'] || ICON_LIST.LayoutGrid, { size: 18 })}
                      </div>
                      <span className="text-slate-900">{categoryForm.icon || 'LayoutGrid'}</span>
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${showIconPicker ? 'rotate-180' : ''}`} />
                  </button>

                  {showIconPicker && (
                    <div className="absolute left-0 lg:left-auto lg:right-0 top-full z-[100] mt-3 w-72 sm:w-80 max-h-80 overflow-y-auto rounded-3xl border border-slate-100 bg-white p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                      <div className="grid grid-cols-3 gap-2">
                        {Object.keys(ICON_LIST).map((iconName) => {
                          const Icon = ICON_LIST[iconName];
                          const isSelected = (categoryForm.icon || 'LayoutGrid') === iconName;
                          return (
                            <button
                              key={iconName}
                              type="button"
                              title={iconName}
                              onClick={() => {
                                setCategoryForm({ ...categoryForm, icon: iconName });
                                setShowIconPicker(false);
                              }}
                              className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-3 transition-all duration-300 ${
                                isSelected 
                                  ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105 z-10' 
                                  : 'text-slate-500 hover:bg-slate-50 hover:text-primary hover:scale-105'
                              }`}
                            >
                              <div className={`${isSelected ? 'text-white' : 'text-slate-600'}`}>
                                <Icon size={20} />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-tighter truncate w-full text-center">
                                {iconName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                className={`btn shrink-0 ${editingCategoryId ? 'bg-slate-900 text-white' : 'btn-primary'} h-[46px] px-8 text-xs font-black uppercase tracking-widest shadow-lg transition-transform active:scale-95`}
              >
                {editingCategoryId ? 'บันทึก' : 'เพิ่ม'}
              </button>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-amber-200/50 bg-gradient-to-br from-amber-50/80 to-amber-100/40 p-6 backdrop-blur-md shadow-sm transition-all hover:shadow-md">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl animate-pulse"></div>
              <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-amber-300/10 blur-2xl animate-pulse delay-700"></div>

              <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-700 shadow-inner">
                    <Clock size={24} className="animate-spin-slow" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black uppercase tracking-widest text-amber-900/70">หมวดหมู่ชั่วคราว</p>
                      <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-relaxed text-amber-900/80">
                      หมวดนี้จะย้ายไปยัง <span className="font-bold">Archive</span> อัตโนมัติเมื่อครบกำหนดเวลา
                    </p>
                  </div>
                </div>
                
                <label className="group flex cursor-pointer select-none items-center gap-3 self-end rounded-2xl border border-amber-300/40 bg-white/80 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-amber-900 shadow-sm transition-all hover:bg-white hover:shadow-md active:scale-95 md:self-start">
                  <div className="relative inline-flex h-5 w-5 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={Boolean(categoryForm.isTemporary)}
                      onChange={(event) =>
                        setCategoryForm({
                          ...categoryForm,
                          isTemporary: event.target.checked,
                          expiredAt: event.target.checked ? categoryForm.expiredAt : '',
                        })
                      }
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-amber-300 transition-all checked:bg-amber-500 checked:border-transparent"
                    />
                    <Plus size={14} className="absolute text-white opacity-0 transition-opacity peer-checked:opacity-100 rotate-45" />
                  </div>
                  ใช้งานระบบชั่วคราว
                </label>
              </div>

              {categoryForm.isTemporary && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <CustomDateTimePicker
                    value={categoryForm.expiredAt}
                    onChange={(e) => setCategoryForm({ ...categoryForm, expiredAt: e.target.value })}
                    label="ระบุวันและเวลาหมดอายุ (พ.ศ.)"
                  />
                </div>
              )}
            </div>

            {/* Visibility Toggle */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-muted">สิทธิ์การมองเห็น</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryForm({ ...categoryForm, visibleToAll: true, visibleDepartmentIds: [], visibleTierIds: [] })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    categoryForm.visibleToAll
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  ทุกคน (ALL)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryForm({ ...categoryForm, visibleToAll: false })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    !categoryForm.visibleToAll
                      ? 'bg-primary text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  เลือกเฉพาะกลุ่ม
                </button>
              </div>
            </div>

            {!categoryForm.visibleToAll && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">  
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">แผนก (Department)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {departments.map((dept) => {
                      const isSelected = (categoryForm.visibleDepartmentIds || []).includes(dept.id);
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => {
                            const ids = categoryForm.visibleDepartmentIds || [];
                            setCategoryForm({
                              ...categoryForm,
                              visibleDepartmentIds: isSelected
                                ? ids.filter((i) => i !== dept.id)
                                : [...ids, dept.id],
                            });
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {dept.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">ระดับผู้ใช้งาน (Tier)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tiers.map((tier) => {
                      const isSelected = (categoryForm.visibleTierIds || []).includes(tier.id);
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => {
                            const ids = categoryForm.visibleTierIds || [];
                            setCategoryForm({
                              ...categoryForm,
                              visibleTierIds: isSelected
                                ? ids.filter((i) => i !== tier.id)
                                : [...ids, tier.id],
                            });
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30'
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {tier.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </form>

          <div className="flex-1 overflow-y-auto">
            <p className="mb-2 text-xs font-bold uppercase text-muted">ลำดับหมวดหมู่ปัจจุบัน</p>
            <div className="flex flex-col gap-2">
              {filteredCategories.map((category, index) => {
                const isEditing = editingCategoryId === category.id;
                return (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 ${
                      isEditing 
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary' 
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${isEditing ? 'border-primary/30 bg-primary/10 text-primary' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                        {React.createElement(ICON_LIST[category.icon] || LayoutGrid, { size: 18 })}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-black tracking-tight ${isEditing ? 'text-primary' : 'text-slate-900 font-bold'}`}>
                          <div className="flex items-center gap-2">
                            {category.name}
                            {category.type && (
                              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase ring-1 ring-inset ${
                                category.type === 'STRAT_BUSINESS' ? 'text-indigo-600 bg-indigo-50 ring-indigo-200' :
                                category.type === 'STRAT_CORE' ? 'text-emerald-600 bg-emerald-50 ring-emerald-200' :
                                category.type === 'STRAT_FUNCTIONAL' ? 'text-amber-600 bg-amber-50 ring-amber-200' :
                                category.type === 'STRAT_LEADERSHIP' ? 'text-blue-600 bg-blue-50 ring-blue-200' :
                                category.type === 'STRAT_COMPLIANCE' ? 'text-purple-600 bg-purple-50 ring-purple-200' :
                                category.type === 'STRAT_DIGITAL' ? 'text-rose-600 bg-rose-50 ring-rose-200' :
                                'text-slate-500 bg-slate-50 ring-slate-200'
                              }`}>
                                {category.type === 'STRAT_BUSINESS' ? 'Business / Corporate' :
                                 category.type === 'STRAT_CORE' ? 'Core / Soft' :
                                 category.type === 'STRAT_FUNCTIONAL' ? 'Functional' :
                                 category.type === 'STRAT_LEADERSHIP' ? 'Leadership' :
                                 category.type === 'STRAT_COMPLIANCE' ? 'Compliance' :
                                 category.type === 'STRAT_DIGITAL' ? 'Digital' : category.type}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {category.isTemporary && (
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[13px] font-black text-amber-700">
                              หมดอายุ {formatThaiDateTime(category.expiredAt, true)}
                            </span>
                          )}
                          {category.visibleToAll ? (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black uppercase text-emerald-700">ทุกคน</span>
                          ) : (
                            <>
                              {(category.visibleDepartments || []).map(d => (
                                <span key={d.id} className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase text-primary">{d.name}</span>
                              ))}
                              {(category.visibleTiers || []).map(t => (
                                <span key={t.id} className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700">{t.name}</span>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!category.isArchived && (
                        <>
                          <div className="flex flex-col gap-1 mr-2">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveCategory(index, -1)}
                              className="rounded-md bg-slate-50 p-1 text-slate-400 transition-all hover:bg-slate-100 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveCategory(index, 1)}
                              disabled={index === filteredCategories.length - 1}
                              className="rounded-md bg-slate-50 p-1 text-slate-400 transition-all hover:bg-slate-100 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(category.id);
                              setCategoryForm({
                                name: category.name,
                                icon: category.icon || 'Grid',
                                type: category.type || 'STRAT_BUSINESS',
                                order: category.order,
                                visibleToAll: category.visibleToAll ?? true,
                                visibleDepartmentIds: (category.visibleDepartments || []).map(d => d.id),
                                visibleTierIds: (category.visibleTiers || []).map(t => t.id),
                                isTemporary: Boolean(category.isTemporary),
                                expiredAt: toLocalInputValue(category.expiredAt),
                              });
                            }}
                            className="rounded-xl bg-slate-50 p-2 text-primary transition-all hover:bg-primary hover:text-white"
                            title="แก้ไขหมวดหมู่"
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleArchiveCategory(category.id)}
                            className="rounded-xl bg-amber-50 p-2 text-amber-500 transition-all hover:bg-amber-500 hover:text-white"
                            title="เก็บเข้าคลัง (Archive)"
                          >
                            <Archive size={16} />
                          </button>
                        </>
                      )}

                      {category.isArchived && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRepublishCategory(category.id)}
                            className="rounded-xl bg-emerald-50 p-2 text-emerald-600 transition-all hover:bg-emerald-500 hover:text-white"
                            title="กู้คืนหมวดหมู่"
                          >
                            <RotateCcw size={16} />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="rounded-xl bg-rose-50 p-2 text-rose-500 transition-all hover:bg-rose-500 hover:text-white"
                            title="ลบถาวร"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
    <ConfirmDialog {...ConfirmDialogProps} />
    </>
  );
};

export default CategoryManagementModal;
