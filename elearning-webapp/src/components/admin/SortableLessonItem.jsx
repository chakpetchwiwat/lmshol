import React from 'react';
import { GripVertical, Play, FileText, Edit, Trash2, ClipboardCheck } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableLessonItem = ({ lesson, idx, onEdit, onDelete, readOnly }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lesson.id, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 group transition-all hover:border-primary/20 ${isDragging ? 'shadow-lg border-primary/40 bg-white ring-2 ring-primary/10' : 'hover:shadow-sm'}`}
    >
      {!readOnly && (
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <GripVertical size={18} />
        </div>
      )}
      
      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 font-bold text-xs text-muted">
        {idx + 1}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {lesson.type === 'video' ? (
            <Play size={12} className="text-primary" />
          ) : lesson.type === 'assessment' ? (
            <ClipboardCheck size={12} className="text-emerald-500" />
          ) : (
            <FileText size={12} className="text-blue-500" />
          )}
          <h4 className="text-sm font-bold truncate">{lesson.title}</h4>
        </div>
        <p className="text-[10px] text-gray-400 truncate font-medium">{lesson.type === 'assessment' ? 'Assessment upload' : (lesson.contentUrl || 'ไม่มีที่อยู่ไฟล์')}</p>
      </div>
      
      {!readOnly && (
        <div className="flex gap-1 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(lesson)}
            className="p-1.5 hover:bg-white rounded transition-colors text-primary"
          >
            <Edit size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(lesson.id)}
            className="p-1.5 hover:bg-white rounded transition-colors text-danger"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SortableLessonItem;
