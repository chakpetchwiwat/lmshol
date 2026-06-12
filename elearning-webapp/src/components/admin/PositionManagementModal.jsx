import React, { useState, useEffect } from 'react';
import { Plus, GripVertical, Trash2, Shield } from 'lucide-react';
import useConfirm from '../../hooks/useConfirm';
import ConfirmDialog from '../common/ConfirmDialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useToast } from '../../context/useToast';
import { adminAPI } from '../../utils/api';
import ModalPortal from '../common/ModalPortal';

export default function PositionManagementModal({ isOpen, onClose, onPositionsChange }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { confirm, ConfirmDialogProps } = useConfirm();

  const [newItemName, setNewItemName] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const posRes = await adminAPI.getTiers();
      setPositions(posRes.data || []);
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
      await adminAPI.createTier({ name: newItemName.trim() });
      toast.success('เพิ่มตำแหน่งคริสตจักรเรียบร้อย');
      setNewItemName('');
      loadData();
      if (onPositionsChange) {
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
      await adminAPI.deleteTier(item.id);
      toast.success('ลบตำแหน่งคริสตจักรเรียบร้อย');
      loadData();
      if (onPositionsChange) {
        onPositionsChange();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'ไม่สามารถลบข้อมูลได้');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    let items = Array.from(positions);

    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPositions(items);

    try {
      await adminAPI.reorderTiers(items.map(i => i.id));
      if (onPositionsChange) {
        onPositionsChange();
      }
    } catch (err) {
      toast.error('ไม่สามารถบันทึกลำดับได้');
      loadData(); // rollback
    }
  };

  const toggleAccessAdmin = async (item) => {
    try {
      await adminAPI.updateTier(item.id, { accessAdmin: !item.accessAdmin });
      toast.success('อัปเดตสิทธิ์เรียบร้อย');
      loadData();
      if (onPositionsChange) onPositionsChange();
    } catch (err) {
      toast.error('อัปเดตไม่สำเร็จ');
    }
  };

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
            <h2 className="text-xl font-bold text-slate-800 mb-2">จัดการตำแหน่งคริสตจักร</h2>
            <p className="text-sm text-slate-500 mb-6">
              คุณสามารถเพิ่ม แก้ไข ลำดับ และลบข้อมูลตำแหน่งคริสตจักร เพื่อให้เป็นตัวเลือกในหน้าผู้ใช้งานได้
            </p>

            <form onSubmit={handleAddItem} className="flex gap-2 mb-6">
              <input
                type="text"
                className="input flex-1"
                placeholder="เพิ่มตำแหน่งคริสตจักรใหม่..."
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
                <Droppable droppableId="droppable-positions">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"
                    >
                      {positions.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
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
                      {positions.length === 0 && (
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
