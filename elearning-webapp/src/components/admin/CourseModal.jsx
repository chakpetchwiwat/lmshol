import React from 'react';
import { X } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

// Sub-components
import CourseQuizReports from './CourseQuizReports';
import CourseBasicInfoForm from './CourseBasicInfoForm';
import CourseContentEditor from './CourseContentEditor';
import CourseStaffEditor from './CourseStaffEditor';
import CourseCertificatesTab from './CourseCertificatesTab';
import { getCourseAccess } from '../../utils/coursePermissions';

const CourseModal = ({
  isOpen,
  onClose,
  isEditing,
  editingId,
  activeTab,
  setActiveTab,
  courseForm,
  setCourseForm,
  categories,
  instructorPresets,
  departments,
  tiers,
  lessons,
  loadingReports,
  quizReports,
  onSaveCourse,
  onImageUpload,
  onEditLesson,
  onDeleteLesson,
  onAddLesson,
  onReorderLessons,
  onSaveDraft,
  onPublishCourse,
  fetchQuizReports,
  uploading,
  currentUser,
  onStaffChanged
}) => {
  const [canEdit, setCanEdit] = React.useState(true);
  const imageInputRef = React.useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex((l) => l.id === active.id);
      const newIndex = lessons.findIndex((l) => l.id === over.id);
      
      const reorderedLessons = arrayMove(lessons, oldIndex, newIndex);
      onReorderLessons(reorderedLessons);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md lg:p-8">
        <div className="card m-auto flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-xl" style={{ isolation: 'isolate' }}>
          {/* Header & Tabs */}
          <div className="flex items-center justify-between border-b border-border bg-gray-50 p-4 rounded-t-[inherit]">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold">{isEditing ? 'แก้ไขคอร์สเรียน' : 'สร้างคอร์สใหม่'}</h3>
              {!canEdit && (
                <span className="flex items-center gap-1 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full border border-slate-200">
                  <X size={12} /> Read Only
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-muted hover:text-gray-900"><X size={20} /></button>
          </div>

          {isEditing && (
            <div className="flex border-b border-border px-4 bg-white">
              <button
                onClick={() => setActiveTab('basic')}
                className={`py-3 px-6 text-sm font-bold transition-colors border-b-2 ${activeTab === 'basic' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-gray-700'}`}
              >
                ข้อมูลทั่วไป
              </button>
              <button
                onClick={() => setActiveTab('content')}
                className={`py-3 px-6 text-sm font-bold transition-colors border-b-2 ${activeTab === 'content' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-gray-700'}`}
              >
                เนื้อหาหลักสูตร ({lessons.length})
              </button>
              <button
                onClick={() => { setActiveTab('reports'); fetchQuizReports(editingId); }}
                className={`py-3 px-6 text-sm font-bold transition-colors border-b-2 ${activeTab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-gray-700'}`}
              >
                รายงานผลสอบ
              </button>
              <button
                onClick={() => setActiveTab('staff')}
                className={`py-3 px-6 text-sm font-bold transition-colors border-b-2 ${activeTab === 'staff' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-gray-700'}`}
              >
                ทีมงาน
              </button>
              <button
                onClick={() => setActiveTab('certificates')}
                className={`py-3 px-6 text-sm font-bold transition-colors border-b-2 ${activeTab === 'certificates' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-gray-700'}`}
              >
                หนังสือรับรอง
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 bg-white rounded-b-[inherit]">
            {activeTab === 'reports' ? (
              <CourseQuizReports 
                quizReports={quizReports} 
                loadingReports={loadingReports} 
              />
            ) : activeTab === 'basic' ? (
              <CourseBasicInfoForm 
                courseForm={courseForm}
                setCourseForm={setCourseForm}
                isPersisted={isEditing}
                lessonCount={lessons.length}
                categories={categories}
                instructorPresets={instructorPresets}
                departments={departments}
                tiers={tiers}
                onSaveCourse={onSaveCourse}
                onImageUpload={onImageUpload}
                uploading={uploading}
                imageInputRef={imageInputRef}
                onClose={onClose}
                readOnly={!canEdit}
              />
            ) : activeTab === 'content' ? (
              <CourseContentEditor 
                lessons={lessons}
                onAddLesson={onAddLesson}
                onEditLesson={onEditLesson}
                onDeleteLesson={onDeleteLesson}
                onSaveDraft={onSaveDraft}
                onPublishCourse={onPublishCourse}
                sensors={sensors}
                handleDragEnd={handleDragEnd}
                readOnly={!canEdit}
              />
            ) : activeTab === 'certificates' ? (
              <CourseCertificatesTab 
                courseId={editingId} 
                readOnly={!canEdit} 
              />
            ) : (
              <CourseStaffEditor 
                courseId={editingId}
                currentUser={currentUser}
                onStaffChanged={(staffList) => {
                  if (onStaffChanged) onStaffChanged(staffList);
                  
                  // Recalculate local permission using shared utility
                  const access = getCourseAccess({ 
                    currentUser, 
                    staff: staffList
                  });
                  setCanEdit(access === 'full');
                }}
              />
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default CourseModal;
