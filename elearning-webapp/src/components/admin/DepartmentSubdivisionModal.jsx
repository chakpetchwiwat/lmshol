import React, { useState, useEffect } from 'react';
import { Settings2, Plus, GripVertical, Trash2, Shield } from 'lucide-react';
import useConfirm from '../../hooks/useConfirm';
import ConfirmDialog from '../common/ConfirmDialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useToast } from '../../context/useToast';
import { adminAPI } from '../../utils/api';
import ModalPortal from '../common/ModalPortal';

export default function PositionManagementModal({ isOpen, onClose, onPositionsChange }) {
  const [activeTab, setActiveTab] = useState('position');
  
  const [positions, setPositions] = useState([]);
  const [levels, setLevels] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { confirm, ConfirmDialogProps } = useConfirm();

  const [newItemName, setNewItemName] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [posRes, lvlRes, typeRes] = await Promise.all([
        adminAPI.getTiers(),
        adminAPI.getSetting('SUBDIVISIONS'),
        adminAPI.getSetting('POSITION_TYPES')
      ]);
      setDepartments(posRes.data?.data || []);
      setLevels(lvlRes.data?.data || []);
      setTypes(typeRes.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      if (activeTab === 'position') {
        await adminAPI.createTier({ name: newItemName.trim() });
        toast.success('เพิ่มแผนกเรียบร้อย');
      } else if (activeTab === 'level') {
        const newLevels = [...levels, { name: newItemName.trim() }];
        await adminAPI.updateSetting('SUBDIVISIONS', newLevels.map(l => l.name));
        toast.success('เพิ่มกลุ่มงานเรียบร้อย');
      
      setNewItemName('');
      loadData();
      if (activeTab === 'position' && onPositionsChange) {
        onPositionsChange();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'ไม่สามารถเพิ่มข้อมูลได้');
    }
  };

  const handleDeleteItem = async (item) => {
    const ok = await confirm({
      title: 'ยืนยันการลบ',
      message: `คุณต้องการลบ "${item.name}" ใช่หรือไม่? ข้อมูลที่ใช้งานตัวเลือกนี้อยู่จะไม่ได้รับผลกระทบ`,
      confirmLabel: 'ลบข้อมูล',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      if (activeTab === 'position') {
        await adminAPI.deleteTier(item.id);
        toast.success('ลบแผนกเรียบร้อย');
      } else if (activeTab === 'level') {
        const newLevels = levels.filter(l => l.name !== item.name);
        await adminAPI.updateSetting('SUBDIVISIONS', newLevels.map(l => l.name));
        toast.success('ลบกลุ่มงานเรียบร้อย');
      
      loadData();
      if (activeTab === 'position' && onPositionsChange) {
        onPositionsChange();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'ไม่สามารถลบข้อมูลได้');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    let items = [];
    if (activeTab === 'position') items = Array.from(positions);
    if (activeTab === 'level') items = Array.from(levels);
    if (activeTab === 'type') items = Array.from(types);

    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    if (activeTab === 'position') setPositions(items);
    if (activeTab === 'level') setLevels(items);
    if (activeTab === 'type') setTypes(items);

    try {
      if (activeTab === 'position') {
        await adminAPI.reorderTiers(items.map(i => i.id));
      } else if (activeTab === 'level') {
        await adminAPI.updateSetting('SUBDIVISIONS', items.map(l => l.name));
      
      if (activeTab === 'position' && onPositionsChange) {
        onPositionsChange();
      }
    } catch (err) {
      toast.error('ไม่สามารถบันทึกลำดับได้');
      loadData(); // rollback
    }
  };

  const toggleAccessAdmin = async (item) => {
    if (activeTab !== 'position') return;
    try {
      await adminAPI.updateTier(item.id, { accessAdmin: !item.accessAdmin });
      toast.success('อัปเดตสิทธิ์เรียบร้อย');
      loadData();
      if (onPositionsChange) onPositionsChange();
    } catch (err) {
      toast.error('อัปเดตไม่สำเร็จ');
    }
  };

  const getItems = () => {
    if (activeTab === 'position') return positions;
    if (activeTab === 'level') return levels;
    if (activeTab === 'type') return types;
    return [];
  };

  const renderTab = (id, label) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`pb-2 px-1 border-b-2 transition-colors ${
        activeTab === id
          ? 'border-indigo-500 text-indigo-600 font-medium'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="card flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden border border-slate-100 bg-white shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 z-10"
          >
            ✕
          </button>
          <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">จัดการแผนกและกลุ่มงาน</h2>
        <p className="text-sm text-slate-500 mb-6">
          คุณสามารถเพิ่ม แก้ไข ลำดับ และลบข้อมูลตำแหน่ง เพื่อให้เป็นตัวเลือกในหน้าผู้ใช้งานได้
        </p>

        <div className="flex gap-6 border-b border-slate-200 mb-6">
          {renderTab('position', 'แผนก (Department)')}
          {renderTab('level', 'กลุ่มงาน (Sub-division)')}
          {renderTab('type', '')}
        </div>

        <form onSubmit={handleAddItem} className="flex gap-2 mb-6">
          <input
            type="text"
            className="input flex-1"
            placeholder={`เพิ่ม${activeTab === 'position' ? 'ตำแหน่ง' : activeTab === 'level' ? 'ระดับตำแหน่ง' : 'ประเภทตำแหน่ง'}ใหม่...`}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary whitespace-nowrap" disabled={!newItemName.trim() || loading}>
            <Plus size={18} />
            เพิ่ม
          </button>
        </form>

        {loading ? (
          <div className="py-8 text-center text-slate-500">กำลังโหลด...</div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={`droppable-${activeTab}`}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"
                >
                  {getItems().map((item, index) => (
                    <Draggable key={item.id || item.name} draggableId={item.id || item.name} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            snapshot.isDragging
                              ? 'bg-white border-indigo-300 shadow-lg scale-[1.02]'
                              : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              {...provided.dragHandleProps}
                              className="text-slate-400 hover:text-indigo-500 cursor-grab active:cursor-grabbing p-1"
                            >
                              <GripVertical size={18} />
                            </div>
                            <span className="font-medium text-slate-700">{item.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {activeTab === 'position' && (
                              <button
                                type="button"
                                onClick={() => toggleAccessAdmin(item)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  item.accessAdmin
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                                }`}
                                title={item.accessAdmin ? 'สิทธิ์เข้าถึงระบบจัดการ' : 'ไม่มีสิทธิ์เข้าถึงระบบจัดการ'}
                              >
                                <Shield size={14} className={item.accessAdmin ? 'text-indigo-500' : 'text-slate-400'} />
                                {item.accessAdmin ? 'เข้าถึงระบบหลังบ้าน' : 'ผู้ใช้งานทั่วไป'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {getItems().length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      ยังไม่มีข้อมูล
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          )}
        </div>
      </div>
      </div>
      <ConfirmDialog {...ConfirmDialogProps} />
    </ModalPortal>
  );
}
