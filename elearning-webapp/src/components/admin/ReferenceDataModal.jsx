import React from 'react';
import { Check, Edit2, Plus, Search, Trash2, X, ArrowUp, ArrowDown, Shield, Users, UserCheck, Sparkles } from 'lucide-react';
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
  memberUsers = [],
  getMembers = null,
  getMemberIds = null,
  onUpdateMembers = null,
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
  const [draftLevelsList, setDraftLevelsList] = React.useState([]);
  const [levelInput, setLevelInput] = React.useState('');
  const [editingItem, setEditingItem] = React.useState(null);
  const [memberEditorItem, setMemberEditorItem] = React.useState(null);
  const [memberSearch, setMemberSearch] = React.useState('');
  const [selectedMemberIds, setSelectedMemberIds] = React.useState([]);
  const [selectedMembersMap, setSelectedMembersMap] = React.useState({});
  const [savingMembers, setSavingMembers] = React.useState(false);
  const modalScrollRef = React.useRef(null);
  const canManageMembers = Boolean(onUpdateMembers && (getMembers || getMemberIds));

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

  const resetForm = () => {
    setDraftName('');
    setAccessAdmin(false);
    setDraftType('FUNCTION');
    setDraftLevelsList([]);
    setLevelInput('');
    setEditingItem(null);
  };

  const closeMemberEditor = () => {
    setMemberEditorItem(null);
    setMemberSearch('');
    setSelectedMemberIds([]);
    setSelectedMembersMap({});
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
        ...(itemLabel === 'Role' ? { levels: draftLevelsList, adminLevels: [] } : {})
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
    // If we were editing members for this role, close it first to avoid confusion
    if (memberEditorItem?.id === item.id) {
      closeMemberEditor();
    }
    setEditingItem(item);
    setDraftName(item.name);
    if (showAccessToggle) {
      setAccessAdmin(item.accessAdmin || false);
    }
    if (showTypeSelection) {
      setDraftType(item.type || 'FUNCTION');
    }
    if (itemLabel === 'Role') {
      setDraftLevelsList(Array.isArray(item.levels) ? item.levels : []);
      setLevelInput('');
    }
    requestAnimationFrame(() => {
      modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const addDraftLevel = () => {
    const val = levelInput.trim();
    if (val && !draftLevelsList.includes(val)) {
      setDraftLevelsList([...draftLevelsList, val]);
      setLevelInput('');
    }
  };

  const removeDraftLevel = (level) => {
    setDraftLevelsList(draftLevelsList.filter((lvl) => lvl !== level));
  };

  const openMemberEditor = (item) => {
    // Close role editing state to switch context to member management
    resetForm();
    setMemberEditorItem(item);
    if (getMembers) {
      const initialMembers = getMembers(item) || [];
      const map = {};
      initialMembers.forEach((m) => {
        map[m.userId] = {
          level: m.level || '',
          isSupervisor: Boolean(m.isSupervisor)
        };
      });
      setSelectedMembersMap(map);
    } else {
      setSelectedMemberIds(getMemberIds?.(item) || []);
    }
    setMemberSearch('');
    requestAnimationFrame(() => {
      modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const toggleMember = (userId) => {
    if (getMembers) {
      setSelectedMembersMap((current) => {
        const next = { ...current };
        if (userId in next) {
          delete next[userId];
        } else {
          const roleLevels = memberEditorItem?.levels || [];
          next[userId] = {
            level: roleLevels[0] || '',
            isSupervisor: false
          };
        }
        return next;
      });
    } else {
      setSelectedMemberIds((current) => (
        current.includes(userId)
          ? current.filter((id) => id !== userId)
          : [...current, userId]
      ));
    }
  };

  const handleMemberLevelChange = (userId, newLevel) => {
    setSelectedMembersMap((current) => ({
      ...current,
      [userId]: {
        ...(typeof current[userId] === 'object' ? current[userId] : { isSupervisor: false }),
        level: newLevel
      }
    }));
  };

  const handleMemberSupervisorToggle = (userId) => {
    setSelectedMembersMap((current) => {
      const currentMember = typeof current[userId] === 'object'
        ? current[userId]
        : { level: current[userId] || '', isSupervisor: false };
      return {
        ...current,
        [userId]: {
          ...currentMember,
          isSupervisor: !currentMember.isSupervisor
        }
      };
    });
  };

  const handleMemberSupervisorAdd = handleMemberSupervisorToggle;
  const handleMemberSupervisorRemove = handleMemberSupervisorToggle;

  const handleSaveMembers = async () => {
    if (!memberEditorItem || !onUpdateMembers) return;

    try {
      setSavingMembers(true);
      if (getMembers) {
        const membersPayload = Object.entries(selectedMembersMap).map(([userId, value]) => {
          const member = typeof value === 'object' ? value : { level: value || '', isSupervisor: false };
          return {
            userId,
            level: member.level || null,
            isSupervisor: Boolean(member.isSupervisor)
          };
        });
        await onUpdateMembers(memberEditorItem.id, membersPayload);
      } else {
        await onUpdateMembers(memberEditorItem.id, selectedMemberIds);
      }
      closeMemberEditor();
    } catch (error) {
      console.error(`Update ${itemLabel} members error:`, error);
      toast.error(error.response?.data?.message || `ไม่สามารถบันทึกสมาชิก${itemLabel}ได้`);
    } finally {
      setSavingMembers(false);
    }
  };

  const filteredMemberUsers = React.useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    return (memberUsers || []).filter((user) => {
      if (!keyword) return true;
      return `${user.name || ''} ${user.email || ''} ${user.department || user.departmentRef?.name || ''}`.toLowerCase().includes(keyword);
    });
  }, [memberSearch, memberUsers]);

  if (!isOpen) {
    return null;
  }

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-md">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/60 transition-opacity"
          onClick={() => {
            resetForm();
            closeMemberEditor();
            onClose();
          }}
          aria-label={`ปิดหน้าต่าง${title}`}
        />
        
        <div className="relative flex h-[85vh] max-h-[800px] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_100px_-32px_rgba(15,23,42,0.45)] border border-slate-100/80 animate-in fade-in zoom-in-95 duration-250">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-8 py-5 shrink-0 bg-white">
            <div>
              <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Shield size={18} />
                </span>
                {title}
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-400">{description}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                closeMemberEditor();
                onClose();
              }}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              aria-label={`ปิดหน้าต่าง${title}`}
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Split Body */}
          <div className="flex flex-1 flex-col md:flex-row overflow-hidden min-h-0 bg-slate-50/20">
            
            {/* LEFT WORKSPACE PANEL: Form or Member Manager */}
            <div ref={modalScrollRef} className="w-full md:w-[38%] border-r border-slate-100/85 flex flex-col bg-white overflow-y-auto p-6">
              {memberEditorItem ? (
                /* SECTION A: Member Editor Workspace */
                <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="mb-5 flex items-start justify-between gap-2">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100/60 px-2.5 py-0.5 text-[9px] font-black text-emerald-700 tracking-wider uppercase mb-1">
                        <Users size={10} /> จัดการสมาชิก
                      </div>
                      <h4 className="text-base font-black text-slate-900 leading-tight">
                        สมาชิกของ {memberEditorItem.name}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-400 mt-1">
                        เลือกผู้ใช้ที่ต้องการจัดกลุ่มเข้าใน Role นี้
                      </p>
                    </div>
                  </div>

                  {/* Search users */}
                  <div className="relative mb-4 shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(event) => setMemberSearch(event.target.value)}
                      placeholder="ค้นหาพนักงาน..."
                      className="form-input w-full bg-slate-50/50 hover:bg-slate-50 border-slate-200/80 focus:bg-white pl-10 pr-4 py-2 text-xs font-bold transition-all"
                    />
                    {memberSearch && (
                      <button
                        type="button"
                        onClick={() => setMemberSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Users selection list */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-none">
                    {filteredMemberUsers.map((user) => {
                      const isSelected = getMembers ? (user.id in selectedMembersMap) : selectedMemberIds.includes(user.id);
                      const memberValue = getMembers && typeof selectedMembersMap[user.id] === 'object'
                        ? selectedMembersMap[user.id]
                        : { level: getMembers ? (selectedMembersMap[user.id] || '') : '', isSupervisor: false };
                      const currentLevel = memberValue.level || '';
                      const isRoleSupervisor = Boolean(memberValue.isSupervisor);
                      const roleLevels = memberEditorItem?.levels || [];

                      return (
                        <div
                          key={user.id}
                          className={`flex flex-col gap-2 rounded-xl border p-3 transition-all duration-200 ${
                            isSelected
                              ? 'border-indigo-200 bg-indigo-50/20 shadow-sm shadow-indigo-100/30'
                              : 'border-slate-100 hover:border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleMember(user.id)}
                              className="flex flex-1 items-start gap-2.5 min-w-0 text-left"
                            >
                              <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all ${
                                isSelected 
                                  ? 'border-indigo-600 bg-indigo-600 text-white scale-105' 
                                  : 'border-slate-300 bg-white text-transparent'
                              }`}>
                                <Check size={10} strokeWidth={3} />
                              </div>
                              <div className="min-w-0">
                                <span className="block truncate text-xs font-black text-slate-800">{user.name || user.email}</span>
                                <span className="block truncate text-[10px] text-slate-400 font-bold mt-0.5">
                                  {user.email} • {user.department || user.departmentRef?.name || '-'}
                                </span>
                              </div>
                            </button>
                          </div>
                          
                          {getMembers && isSelected && (
                            <div className="flex flex-col gap-2 border-t border-slate-100/80 pt-2.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                              {roleLevels.length > 0 && (
                                <div className="flex flex-col gap-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-0.5">
                                    ระดับระดับชั้น (Level)
                                  </label>
                                  <select
                                    value={currentLevel}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '') {
                                        setSelectedMembersMap((current) => {
                                          const next = { ...current };
                                          delete next[user.id];
                                          return next;
                                        });
                                      } else {
                                        handleMemberLevelChange(user.id, val);
                                      }
                                    }}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                                  >
                                    <option value="">เลือกระดับ (Level)...</option>
                                    {roleLevels.map((lvl) => (
                                      <option key={lvl} value={lvl}>
                                        {lvl}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              
                              <button
                                type="button"
                                onClick={() => handleMemberSupervisorToggle(user.id)}
                                className={`flex items-center justify-between rounded-lg border px-3 py-1.5 transition-all text-left ${
                                  isRoleSupervisor
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm font-black'
                                    : 'border-slate-200 bg-slate-50 text-slate-500 font-bold hover:bg-white hover:text-slate-700'
                                }`}
                              >
                                <span className="text-[10px]">สิทธิ์ผู้ดูแลประจำ Role</span>
                                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-black tracking-wider ${
                                  isRoleSupervisor 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-slate-200 text-slate-500'
                                }`}>
                                  {isRoleSupervisor ? 'SUPERVISOR' : 'OFF'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {filteredMemberUsers.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-xs font-bold text-slate-400">
                        ไม่พบผู้ใช้ที่ค้นหา
                      </div>
                    )}
                  </div>

                  {/* Actions buttons sticky at the bottom of left panel */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0 bg-white">
                    <button
                      type="button"
                      onClick={closeMemberEditor}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveMembers}
                      disabled={savingMembers}
                      className="rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      {savingMembers ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          <span>กำลังบันทึก...</span>
                        </>
                      ) : (
                        <span>บันทึกสมาชิก</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* SECTION B: Role Creation / Editing Form Workspace */
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="mb-4">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100/60 px-2.5 py-0.5 text-[9px] font-black text-indigo-700 tracking-wider uppercase mb-1">
                      <Sparkles size={10} /> {editingItem ? 'กำลังแก้ไข Role' : 'สร้าง Role ใหม่'}
                    </div>
                    <h4 className="text-base font-black text-slate-900 leading-tight">
                      {editingItem ? `แก้ไขข้อมูล: ${editingItem.name}` : `เพิ่ม Role ใหม่เข้าระบบ`}
                    </h4>
                  </div>

                  <div className="space-y-4 flex-1">
                    {/* Role Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                        ชื่อ Role
                      </label>
                      <input
                        type="text"
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        placeholder={`ตั้งชื่อ ${itemLabel}...`}
                        className={`form-input w-full px-4 py-2.5 text-xs font-bold transition-all focus:ring-2 ${
                          editingItem 
                            ? 'border-indigo-400 focus:ring-indigo-500/10 focus:border-indigo-500' 
                            : 'border-slate-200/80 focus:border-indigo-500'
                        }`}
                        required
                      />
                    </div>

                    {/* Access switch (if generic ReferenceDataModal is used for other types) */}
                    {showTypeSelection && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                          ประเภท (Type)
                        </label>
                        <div className="flex gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                          {typeOptions.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setDraftType(opt.value)}
                              className={`flex-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                draftType === opt.value
                                  ? opt.color + ' border shadow-sm scale-102'
                                  : 'text-slate-400 hover:text-slate-600 bg-transparent border-transparent'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {showAccessToggle && (
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={accessAdmin}
                          onChange={(event) => setAccessAdmin(event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-700">สิทธิ์ Manager Access</span>
                          <span className="text-[9px] text-slate-400 font-medium">อนุญาตการใช้งานหน้าหลังบ้าน</span>
                        </div>
                      </label>
                    )}

                    {/* Levels definition (Only for Role) */}
                    {itemLabel === 'Role' && (
                      <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                          ระดับย่อยความเชี่ยวชาญ (เช่น G1, G2, G3)
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={levelInput}
                            onChange={(event) => setLevelInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                addDraftLevel();
                              }
                            }}
                            placeholder="พิมพ์ชื่อระดับแล้วกด Add..."
                            className="form-input flex-1 bg-white px-3 py-2 text-xs font-bold border-slate-200/80 focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={addDraftLevel}
                            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 transition-colors flex items-center gap-1 shrink-0"
                          >
                            <Plus size={14} />
                            Add
                          </button>
                        </div>

                        {draftLevelsList.length > 0 ? (
                          <div className="mt-2 space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                            {draftLevelsList.map((lvl, index) => (
                              <div 
                                key={lvl} 
                                className="group flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm animate-in fade-in slide-in-from-top-1 duration-150"
                              >
                                <span className="flex items-center gap-2">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-400">
                                    {index + 1}
                                  </span>
                                  <span>{lvl}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeDraftLevel(lvl)}
                                  className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                  aria-label={`ลบระดับ ${lvl}`}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-[10px] text-slate-400 font-bold italic py-3">
                            ยังไม่มีการระบุระดับย่อย (พิมพ์เพิ่มตามลำดับชั้น)
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                    {editingItem && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                      >
                        ยกเลิก
                      </button>
                    )}
                    <button 
                      type="submit" 
                      className={`rounded-xl px-5 py-2.5 text-xs font-black text-white transition-all shadow-md active:scale-98 flex items-center gap-1.5 ${
                        editingItem ? 'bg-slate-900 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {editingItem ? <Edit2 size={14} /> : <Plus size={14} />}
                      {submitLabel}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* RIGHT SCROLLABLE LIST PANEL: Roles List */}
            <div className="flex-1 flex flex-col overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between shrink-0">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  รายการ {itemLabel} ทั้งหมด ({items.length || 0})
                </h4>
              </div>

              <div className="flex-1 space-y-3">
                {loading ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    <span className="text-xs font-bold text-slate-400">กำลังดาวน์โหลดข้อมูล...</span>
                  </div>
                ) : (!Array.isArray(items) || items.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
                    <Shield size={24} className="text-slate-300" />
                    <span>ยังไม่มี {itemLabel} ในระบบ</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {items.map((item, index) => {
                      const isEditing = editingItem?.id === item.id;
                      const isMemberOpen = memberEditorItem?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`group relative flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-300 ${
                            isEditing 
                              ? 'border-indigo-500 bg-indigo-50/10 shadow-lg shadow-indigo-100/10 ring-1 ring-indigo-500' 
                              : isMemberOpen
                                ? 'border-slate-800 bg-slate-900 text-white shadow-lg'
                                : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md hover:scale-[1.005]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            {/* Role Name and Code */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                isEditing 
                                  ? 'bg-indigo-600 text-white' 
                                  : isMemberOpen
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                              }`}>
                                <Shield size={16} />
                              </div>
                              <div className="min-w-0">
                                <div className={`font-black tracking-tight text-sm truncate flex items-center gap-2 ${
                                  isEditing ? 'text-indigo-600' : isMemberOpen ? 'text-white' : 'text-slate-900'
                                }`}>
                                  {item.name}
                                  {showTypeSelection && item.type && (
                                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase ring-1 ring-inset ${
                                      typeOptions.find(o => o.value === item.type)?.color || 'bg-slate-50 text-slate-500 ring-slate-200'
                                    }`}>
                                      {item.type}
                                    </span>
                                  )}
                                  {showAccessToggle && item.accessAdmin && (
                                    <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-rose-500 ring-1 ring-inset ring-rose-200">
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5">
                                  <span>#{item.id.slice(-4)}</span>
                                  <span>•</span>
                                  <span>สร้างเมื่อ {item.createdAt ? formatThaiDateTime(item.createdAt).split(' ')[0] : 'ไม่ระบุ'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Reordering */}
                            {onReorder && (
                              <div className={`flex items-center gap-0.5 rounded-lg border p-0.5 shadow-sm shrink-0 ${
                                isMemberOpen ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'
                              }`}>
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleMove(index, -1)}
                                  className={`p-1 rounded-md transition-all ${
                                    isMemberOpen 
                                      ? 'text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-20' 
                                      : 'text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30'
                                  }`}
                                  title="เลื่อนขึ้น"
                                >
                                  <ArrowUp size={12} strokeWidth={3} />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === items.length - 1}
                                  onClick={() => handleMove(index, 1)}
                                  className={`p-1 rounded-md transition-all ${
                                    isMemberOpen 
                                      ? 'text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-20' 
                                      : 'text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30'
                                  }`}
                                  title="เลื่อนลง"
                                >
                                  <ArrowDown size={12} strokeWidth={3} />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Level Summary Chips & Member Counts */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {item.levels && item.levels.length > 0 && (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black border ${
                                isMemberOpen 
                                  ? 'bg-slate-800 border-slate-700 text-slate-300' 
                                  : 'bg-indigo-50 border-indigo-100/50 text-indigo-700'
                              }`}>
                                {item.levels.length} ระดับย่อย
                              </span>
                            )}
                            {canManageMembers && (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black ${
                                isMemberOpen 
                                  ? 'bg-slate-800 text-slate-300' 
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                สมาชิก {item.memberCount || 0} คน
                              </span>
                            )}
                            {canManageMembers && item.roleSupervisors && item.roleSupervisors.length > 0 && (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black border ${
                                isMemberOpen 
                                  ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400' 
                                  : 'bg-emerald-50 border-emerald-100/50 text-emerald-700'
                              }`}>
                                ผู้ดูแล {item.roleSupervisors.length} คน
                              </span>
                            )}
                          </div>

                          {/* Footer Action buttons */}
                          <div className={`flex items-center justify-between border-t pt-3 mt-1 ${
                            isMemberOpen ? 'border-slate-850' : 'border-slate-50'
                          }`}>
                            <div>
                              {canManageMembers && (
                                <button
                                  type="button"
                                  onClick={() => isMemberOpen ? closeMemberEditor() : openMemberEditor(item)}
                                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
                                    isMemberOpen
                                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white'
                                  }`}
                                >
                                  <Users size={12} />
                                  {isMemberOpen ? 'กำลังเปิดจัดการ...' : 'จัดการสมาชิก'}
                                </button>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {!isEditing && (
                                <button
                                  type="button"
                                  onClick={() => handleEdit(item)}
                                  className={`rounded-lg p-1.5 transition-colors ${
                                    isMemberOpen 
                                      ? 'text-slate-400 hover:bg-slate-800 hover:text-white' 
                                      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                                  }`}
                                  title={`แก้ไข ${itemLabel}`}
                                >
                                  <Edit2 size={13} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onDelete(item.id, item.name)}
                                className={`rounded-lg p-1.5 transition-colors ${
                                  isMemberOpen 
                                    ? 'text-rose-400 hover:bg-rose-950/50 hover:text-rose-300' 
                                    : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                                }`}
                                title={`ลบ ${itemLabel}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ReferenceDataModal;
