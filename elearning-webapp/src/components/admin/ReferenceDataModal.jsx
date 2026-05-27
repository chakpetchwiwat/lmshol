import React from 'react';
import { Check, Edit2, Plus, Search, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
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
          className="absolute inset-0 bg-slate-950/65"
          onClick={() => {
            resetForm();
            closeMemberEditor();
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
              closeMemberEditor();
              onClose();
            }}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={`ปิดหน้าต่าง${title}`}
          >
            <X size={18} />
          </button>
        </div>

        <div ref={modalScrollRef} className="flex-1 overflow-y-auto px-6 py-5">
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

            <div className="flex flex-col gap-3">
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
              </div>
              
              {itemLabel === 'Role' && (
                <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1">
                    ระดับของ Role (เช่น Trainee G1, Trainee G2, Trainee G3)
                  </label>
                  <div className="flex gap-2">
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
                      placeholder="พิมพ์ชื่อระดับความเชี่ยวชาญ แล้วกด Add..."
                      className="form-input flex-1 bg-white px-4 py-2.5 text-sm border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={addDraftLevel}
                      className="btn btn-primary px-4 py-2.5 text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>

                  {draftLevelsList.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {draftLevelsList.map((lvl, index) => (
                        <div key={lvl} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                          <span className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-400">
                              {index + 1}
                            </span>
                            <span>{lvl}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDraftLevel(lvl)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                            aria-label={`ลบระดับ ${lvl}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-slate-400 italic py-2">
                      ยังไม่มีการกำหนดระดับ (เพิ่มระดับความเชี่ยวชาญ/ตำแหน่งย่อยตามลำดับ)
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2">
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
                  className={`btn ${editingItem ? 'bg-slate-900 text-white' : 'btn-primary'} px-8 py-3 text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95`}
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
                {items.map((item, index) => {
                const isEditing = editingItem?.id === item.id;
                const isMemberOpen = memberEditorItem?.id === item.id;
                return (
                  <React.Fragment key={item.id}>
                  <div
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 transition-all duration-300 ${
                      isEditing 
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary' 
                        : isMemberOpen
                          ? 'border-slate-300 bg-slate-50 shadow-md rounded-b-none'
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
                          {canManageMembers && <span> • สมาชิก {item.memberCount || 0} คน</span>}
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
                        {canManageMembers && (
                          <button
                            type="button"
                            onClick={() => isMemberOpen ? closeMemberEditor() : openMemberEditor(item)}
                            className={`rounded-xl px-3 py-2.5 text-xs font-black transition-all ${
                              isMemberOpen
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white'
                            }`}
                          >
                            {isMemberOpen ? 'ปิด' : 'สมาชิก'}
                          </button>
                        )}
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

                  {canManageMembers && isMemberOpen && (
                    <div className="-mt-3 rounded-2xl rounded-t-none border border-t-0 border-slate-300 bg-slate-50/80 p-5 pt-6 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-base font-black text-slate-900">สมาชิก {memberEditorItem.name}</h4>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {getMembers ? Object.keys(selectedMembersMap).length : selectedMemberIds.length} คนที่เลือก
                          </p>
                        </div>
                        <button type="button" onClick={closeMemberEditor} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-500 hover:text-slate-900 border border-slate-200">
                          ปิด
                        </button>
                      </div>

                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          value={memberSearch}
                          onChange={(event) => setMemberSearch(event.target.value)}
                          placeholder="ค้นหาชื่อ อีเมล หรือแผนก..."
                          className="form-input w-full bg-white py-2 pl-10 pr-4 text-sm"
                        />
                      </div>

                      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {filteredMemberUsers.map((user) => {
                          const isSelected = getMembers ? (user.id in selectedMembersMap) : selectedMemberIds.includes(user.id);
                          const memberValue = getMembers && typeof selectedMembersMap[user.id] === 'object'
                            ? selectedMembersMap[user.id]
                            : { level: getMembers ? (selectedMembersMap[user.id] || '') : '', isSupervisor: false };
                          const currentLevel = memberValue.level || '';
                          const isRoleSupervisor = Boolean(memberValue.isSupervisor);
                          const currentSupervisorIds = [];
                          const roleLevels = memberEditorItem?.levels || [];
                          const supervisorOptions = [];

                          return (
                            <div
                              key={user.id}
                              className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all bg-white ${
                                isSelected
                                  ? 'border-primary shadow-sm ring-1 ring-primary/20'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleMember(user.id)}
                                className="flex-1 min-w-0 text-left"
                              >
                                <span className="block truncate text-sm font-black">{user.name || user.email}</span>
                                <span className="block truncate text-xs font-semibold text-slate-400">
                                  {user.email} • {user.department || user.departmentRef?.name || '-'}
                                </span>
                              </button>
                              
                              {getMembers && isSelected && (
                                <div className="flex w-full max-w-md flex-col gap-2">
                                  {roleLevels.length > 0 && (
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
                                    className={`rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary transition-all ${
                                      isSelected
                                        ? 'border-primary bg-white text-slate-900'
                                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-white'
                                    }`}
                                  >
                                    <option value="">เลือกระดับ (Level)...</option>
                                    {roleLevels.map((lvl) => (
                                      <option key={lvl} value={lvl}>
                                        {lvl}
                                      </option>
                                    ))}
                                  </select>
                                  )}
                                  <div className="hidden">
                                    <select
                                      value=""
                                      onChange={(event) => handleMemberSupervisorAdd(user.id, event.target.value)}
                                      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                      <option value="">เพิ่มผู้ดูแลจากชื่อ user...</option>
                                      {supervisorOptions
                                        .filter((candidate) => !currentSupervisorIds.includes(candidate.id))
                                        .map((candidate) => (
                                          <option key={candidate.id} value={candidate.id}>
                                            {candidate.department || candidate.departmentRef?.name
                                              ? `${candidate.name || candidate.email} (${candidate.department || candidate.departmentRef?.name})`
                                              : candidate.name || candidate.email}
                                          </option>
                                        ))}
                                    </select>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {currentSupervisorIds.length === 0 ? (
                                        <span className="text-[10px] font-semibold text-slate-400">ยังไม่ได้เลือกผู้ดูแล</span>
                                      ) : currentSupervisorIds.map((supervisorId) => {
                                        const supervisor = supervisorOptions.find((candidate) => candidate.id === supervisorId);
                                        return (
                                          <span key={supervisorId} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                            {supervisor?.name || supervisor?.email || 'Supervisor'}
                                            <button
                                              type="button"
                                              onClick={() => handleMemberSupervisorRemove(user.id, supervisorId)}
                                              className="text-emerald-500 hover:text-emerald-800"
                                              aria-label="ลบผู้ดูแล"
                                            >
                                              <X size={11} />
                                            </button>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-all ${
                                    isRoleSupervisor
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-white'
                                  }`}>
                                    <span className="text-xs font-black">ผู้ดูแลประจำ Role</span>
                                    <input
                                      type="checkbox"
                                      checked={isRoleSupervisor}
                                      onChange={() => handleMemberSupervisorToggle(user.id)}
                                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                  </label>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => toggleMember(user.id)}
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                                  isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 text-transparent hover:border-slate-400'
                                }`}
                              >
                                <Check size={13} strokeWidth={3} />
                              </button>
                            </div>
                          );
                        })}
                        {filteredMemberUsers.length === 0 && (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-xs font-bold text-slate-400">
                            ไม่พบผู้ใช้
                          </div>
                        )}
                      </div>

                      <button type="button" onClick={handleSaveMembers} disabled={savingMembers} className="btn btn-primary mt-4 w-full">
                        {savingMembers ? 'กำลังบันทึก...' : 'บันทึกสมาชิก'}
                      </button>
                    </div>
                  )}
                  </React.Fragment>
                );
              })}
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
