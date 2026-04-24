import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Archive,
  LayoutGrid,
} from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { toUTCISOString } from '../../utils/dateUtils';
import ModalPortal from '../common/ModalPortal';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../../context/useToast';
import useConfirm from '../../hooks/useConfirm';
import { ENTITY_VIEW_STATUS } from '../../utils/constants/statuses';
import CategoryEditorForm from './category/CategoryEditorForm';
import CategoryList from './category/CategoryList';
import { getDefaultCategoryForm } from './category/categoryForm.utils';

const CategoryManagementModal = ({
  isOpen,
  onClose,
  categories,
  departments,
  tiers,
  onRefresh,
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
    setShowIconPicker(false);
    setCategoryForm(getDefaultCategoryForm());
  };

  const closeModal = () => {
    onClose();
    resetCategoryEditor();
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

  const filteredCategories = useMemo(() => {
    const subset = categories.filter((category) => (
      categoryView === ENTITY_VIEW_STATUS.ARCHIVED ? Boolean(category.isArchived) : !category.isArchived
    ));

    // Explicitly sort by isTemporary desc, then order asc
    return subset.sort((a, b) => {
      if (a.isTemporary !== b.isTemporary) {
        return a.isTemporary ? -1 : 1;
      }
      return (a.order || 0) - (b.order || 0);
    });
  }, [categories, categoryView]);

  const activeCount = categories.filter((category) => !category.isArchived).length;
  const archivedCount = categories.filter((category) => category.isArchived).length;

  if (!isOpen) return null;

  return (
    <>
      <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            className="card flex max-h-[92vh] w-full max-w-[min(94vw,88rem)] flex-col overflow-hidden bg-white p-5 shadow-xl sm:p-6 xl:p-7"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="category-modal-title" className="text-xl font-bold">จัดการหมวดหมู่</h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-muted hover:text-gray-800"
              >
                ปิด
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              {[
                { key: ENTITY_VIEW_STATUS.ACTIVE, label: `หมวดหมู่ที่เผยแพร่อยู่ (${activeCount})`, icon: LayoutGrid },
                { key: ENTITY_VIEW_STATUS.ARCHIVED, label: `Archive (${archivedCount})`, icon: Archive },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setCategoryView(key);
                    resetCategoryEditor();
                  }}
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

            <div className="min-h-0 flex-1 overflow-hidden xl:grid xl:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)] xl:gap-6">
              <CategoryEditorForm
                categoryForm={categoryForm}
                departments={departments}
                editingCategoryId={editingCategoryId}
                iconPickerRef={iconPickerRef}
                onCancelEdit={resetCategoryEditor}
                onSave={handleSaveCategory}
                setCategoryForm={setCategoryForm}
                setShowIconPicker={setShowIconPicker}
                showIconPicker={showIconPicker}
                tiers={tiers}
              />

              <CategoryList
                categories={filteredCategories}
                editingCategoryId={editingCategoryId}
                onArchive={handleArchiveCategory}
                onDelete={handleDeleteCategory}
                onEdit={(categoryId, formData) => {
                  setEditingCategoryId(categoryId);
                  setCategoryForm(formData);
                }}
                onMove={handleMoveCategory}
                onRepublish={handleRepublishCategory}
              />
            </div>
          </div>
        </div>
      </ModalPortal>
      <ConfirmDialog {...ConfirmDialogProps} />
    </>
  );
};

export default CategoryManagementModal;
