import React from 'react';
import { Layers } from 'lucide-react';
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableLessonItem from './SortableLessonItem';

const CourseContentEditor = ({
  lessons,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onSaveDraft,
  onPublishCourse,
  sensors,
  handleDragEnd,
  readOnly
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold text-muted uppercase">บทเรียนทั้งหมด</p>
        {!readOnly && (
          <button 
            type="button" 
            onClick={onAddLesson} 
            className="btn btn-primary btn-sm rounded-lg text-xs"
          >
            + เพิ่มบทเรียน
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={lessons.map(l => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {lessons.map((lesson, idx) => (
              <SortableLessonItem
                key={lesson.id}
                lesson={lesson}
                idx={idx}
                onEdit={onEditLesson}
                onDelete={onDeleteLesson}
                readOnly={readOnly}
              />
            ))}
          </SortableContext>
        </DndContext>
        
        {lessons.length === 0 && (
          <div className="py-12 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400">
            <Layers size={32} className="mb-2 opacity-20" />
            <p className="text-sm">ยังไม่มีเนื้อหาในคอร์สนี้</p>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onSaveDraft} className="btn border-2 border-indigo-700 bg-indigo-700 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-indigo-700/20 hover:border-indigo-800 hover:bg-indigo-800">
            บันทึกแบบร่าง
          </button>
          <button
            type="button"
            onClick={onPublishCourse}
            disabled={lessons.length === 0}
            className="btn border-2 border-emerald-600 bg-emerald-600 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-emerald-600/20 hover:border-emerald-700 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            เผยแพร่คอร์ส
          </button>
        </div>
      )}
    </div>
  );
};

export default CourseContentEditor;
