import React from 'react';
import { Edit2, Plus, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import { formatThaiDateTime } from '../../utils/dateUtils';
import ModalPortal from '../common/ModalPortal';
import { useToast } from '../../context/useToast';

const ReferenceDataModal = ({
  isOpen,
  title,
  description,
  itemLabel,
  items,
  loading,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onReorder = null,
  showAccessToggle = false,
  showTypeSelection = false,
  typeOptions = [
    { value: 'LEADERSHIP', label: 'Leadership', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { value: 'FUNCTION', label: 'Function', color: 'text-slate-600 bg-slate-50 border-slate-200' },
    { value: 'INNOVATION', label: 'Innovation', color: 'text-amber-600 bg-amber-50 border-amber-200' }
  ]
}) => {
  const toast = useToast();
  const [draftName, setDraftName] = React.useState('');
  const [accessAdmin, setAccessAdmin] = React.useState(false);
  const [draftType, setDraftType] = React.useState('FUNCTION');
  const [editingItem, setEditingItem] = React.useState(null);

  const handleMove = async (index, direction) => {
    if (!onReorder) return;
    
    const reordered = [...items];
    if (direction === -1 && index > 0) {
      [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    } else if (direction === 1 && index < reordered.length - 1) {
      [reordered[index + 1], reordered[index]] = [reordered[index], reordered[index + 1]];
    } else {
      return;
    }

    await onReorder(reordered);
  };


  const submitLabel = React.useMemo(
    () => (editingItem ? `บันทึกการแก้ไข` : `เพิ่ม${itemLabel}ใหม่`),
    [editingItem, itemLabel]
  );

  if (!isOpen) {
    return null;
  }

  const resetForm = () => {
    setDraftName('');
    setAccessAdmin(false);
    setDraftType('FUNCTION');
    setEditingItem(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = draftName.trim();
    if (!name) {
      return;
    }

    try {
      const payload = {
        name,
        ...(showAccessToggle ? { accessAdmin } : {}),
        ...(showTypeSelection ? { type: draftType } : {}),
      };

      if (editingItem) {
        await onUpdate(editingItem.id, payload);
      } else {
        await onCreate(payload);
      }

      resetForm();
    } catch (error) {
      console.error(`Save ${itemLabel} error:`, error);
      toast.error(error.response?.data?.message || `ไม่สามารถบันทึก${itemLabel}ได้`);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setDraftName(item.name);
    if (showAccessToggle) {
      setAccessAdmin(item.accessAdmin || false);
    }
    if (showTypeSelection) {
      setDraftType(item.type || 'FUNCTION');
    }
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-md">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/65"
          onClick={() => {
            resetForm();
            onClose();
          }}
          aria-label={`ปิดหน้าต่าง${title}`}
        />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2.5rem] bg-white/95 shadow-[0_32px_100px_-32px_rgba(15,23,42,0.55)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-black text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={`ปิดหน้าต่าง${title}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form 
            onSubmit={handleSubmit} 
            className={`mb-6 flex flex-col gap-4 rounded-3xl border-2 p-5 transition-all duration-300 ${
              editingItem 
                ? 'border-primary/30 bg-primary/5 shadow-inner' 
                : 'border-slate-100 bg-slate-50/70'
            }`}
          >
            <div className="flex items-center justify-between px-1">
              <span className={`text-[10px] font-black uppercase tracking-widest ${editingItem ? 'text-primary' : 'text-slate-400'}`}>
                {editingItem ? `กำลังแก้ไข${itemLabel}` : `สร้าง${itemLabel}ใหม่`}
              </span>
              {editingItem && (
                <span className="text-[10px] font-bold text-slate-400 italic">
                  แก้ไขจาก: {editingItem.name}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder={editingItem ? `ชื่อ${itemLabel}ใหม่...` : `ตั้งชื่อ${itemLabel}...`}
                className={`form-input flex-1 bg-white px-5 py-3 text-sm font-bold transition-all focus:ring-4 ${
                  editingItem ? 'border-primary/50 focus:ring-primary/10' : 'border-slate-200'
                }`}
                required
              />
              {showTypeSelection && (
                <div className="flex gap-1.5 p-1 bg-white border border-slate-100 rounded-2xl">
                  {typeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDraftType(opt.value)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        draftType === opt.value
                          ? opt.color + ' border shadow-sm scale-105'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              {showAccessToggle && (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={accessAdmin}
                    onChange={(event) => setAccessAdmin(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">สิทธิ์ Manager Access</span>
                    <span className="text-[10px] text-slate-400">อนุญาตการใช้งานหน้าหลังบ้าน</span>
                  </div>
                </label>
              )}
              <div className="flex gap-2">
                {editingItem && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn border-2 border-slate-200 bg-white px-6 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                  >
                    ยกเลิก
                  </button>
                )}
                <button 
                  type="submit" 
                  className={`btn ${editingItem ? 'bg-slate-900 text-white' : 'btn-primary'} flex-1 px-8 py-3 text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 md:flex-none`}
                >
                  {editingItem ? <Edit2 size={16} /> : <Plus size={16} />}
                  {submitLabel}
                </button>
              </div>
            </div>
          </form>

          <div className="space-y-3">
            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : (!Array.isArray(items) || items.length === 0) ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                ยังไม่มี{itemLabel}ในระบบ
              </div>
            ) : (
              <>
                {onReorder && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="h-[2px] flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">ตำแหน่งสูงสุด</span>
                    <div className="h-[2px] w-4 bg-primary/30"></div>
                  </div>
                )}
                {items.map((item, index) => {
                const isEditing = editingItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 transition-all duration-300 ${
                      isEditing 
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary' 
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4 text-left">
                      {isEditing && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20 animate-pulse">
                          <Edit2 size={14} />
                        </div>
                      )}
                      <div>
                        <div className={`font-black tracking-tight ${isEditing ? 'text-primary' : 'text-slate-900 font-bold'}`}>
                          <div className="flex items-center gap-2">
                            {item.name}
                            {showTypeSelection && item.type && (
                              <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase ring-1 ring-inset ${
                                typeOptions.find(o => o.value === item.type)?.color || 'bg-slate-50 text-slate-500 ring-slate-200'
                              }`}>
                                {item.type}
                              </span>
                            )}
                            {showAccessToggle && item.accessAdmin && (
                              <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-500 ring-1 ring-inset ring-rose-200">
                                ADMIN
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          #{item.id.slice(-4)} • สร้างเมื่อ {item.createdAt ? formatThaiDateTime(item.createdAt) : 'ไม่ระบุ'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onReorder && (
                        <div className="flex flex-col rounded-lg border border-slate-100 bg-slate-50 overflow-hidden shadow-sm mr-2 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMove(index, -1)}
                            className="p-1 text-slate-400 hover:bg-white hover:text-primary disabled:opacity-30 transition-all border-b border-slate-100"
                          >
                            <ArrowUp size={14} strokeWidth={3} />
                          </button>
                          <button
                            type="button"
                            disabled={index === items.length - 1}
                            onClick={() => handleMove(index, 1)}
                            className="p-1 text-slate-400 hover:bg-white hover:text-primary disabled:opacity-30 transition-all"
                          >
                            <ArrowDown size={14} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="rounded-xl bg-slate-50 p-2.5 text-primary transition-all hover:bg-primary hover:text-white"
                            aria-label={`แก้ไข${itemLabel} ${item.name}`}
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(item.id, item.name)}
                          className="rounded-xl bg-slate-50 p-2.5 text-rose-500 transition-all hover:bg-rose-500 hover:text-white"
                          aria-label={`ลบ${itemLabel} ${item.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {onReorder && items.length > 1 && (
                <div className="flex items-center gap-2 mt-2 px-1">
                  <div className="h-[2px] flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">ตำแหน่งเริ่มต้น</span>
                  <div className="h-[2px] w-4 bg-slate-200"></div>
                </div>
              )}
              </>
            )}
          </div>
        </div>
      </div>
      </div>
    </ModalPortal>
  );
};

export default ReferenceDataModal;
