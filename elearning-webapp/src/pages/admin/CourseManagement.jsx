import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { toUTCISOString, toLocalInputValue } from '../../utils/dateUtils';
import { compressImage } from '../../utils/imageUtils';
import { useToast } from '../../context/useToast';
import useConfirm from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Components
import CourseModal from '../../components/admin/CourseModal';
import LessonModal from '../../components/admin/LessonModal';
import CategoryManagementModal from '../../components/admin/CategoryManagementModal';
import InstructorPresetModal from '../../components/admin/InstructorPresetModal';
import CourseFilters from '../../components/admin/CourseFilters';
import CourseTable from '../../components/admin/CourseTable';
import CourseAttendanceModal from '../../components/admin/CourseAttendanceModal';
import { FILTER_VALUES } from '../../utils/constants/filters';
import { ENTITY_VIEW_STATUS } from '../../utils/constants/statuses';

const getDefaultCourseForm = () => ({
  title: '',
  description: '',
  categoryId: '',
  points: 100,
  image: '',
  instructorPresetId: '',
  instructorName: 'ทีมวิทยากรผู้เชี่ยวชาญ',
  instructorRole: 'Enterprise Instructor',
  instructorAvatar: '',
  instructorBio: '',
  previewVideoUrl: '',
  totalDuration: '',
  whatYouWillLearn: '[]',
  whatYouWillGet: '[]',
  visibleToAll: true,
  visibleDepartmentIds: [],
  visibleTierIds: [],
  isTemporary: false,
  expiredAt: '',
});

const getDefaultLessonForm = (order = 0) => ({
  title: '',
  type: 'video',
  contentUrl: '',
  content: '',
  order,
  points: 0,
  passScore: 60,
  duration: 0,
  questions: [],
});

const MODULE_GROUP_LABELS = {
  STRAT_BUSINESS: 'Business / Corporate',
  STRAT_CORE: 'Core / Soft Skills',
  STRAT_FUNCTIONAL: 'Functional Skills',
  STRAT_LEADERSHIP: 'Leadership Skills',
  STRAT_COMPLIANCE: 'Compliance',
  STRAT_DIGITAL: 'Digital / Future Skills',
};

const CourseManagement = () => {
  const toast = useToast();
  const { confirm, ConfirmDialogProps } = useConfirm();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [instructorPresets, setInstructorPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(FILTER_VALUES.ALL);
  const [selectedModuleGroup, setSelectedModuleGroup] = useState(FILTER_VALUES.ALL);
  const [courseView, setCourseView] = useState(ENTITY_VIEW_STATUS.ACTIVE);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [courseForm, setCourseForm] = useState(getDefaultCourseForm());
  const [lessons, setLessons] = useState([]);
  const [quizReports, setQuizReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryCourse, setSelectedHistoryCourse] = useState(null);

  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState(getDefaultLessonForm());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editorImageUploading, setEditorImageUploading] = useState(false);
  const [showInstructorPresetModal, setShowInstructorPresetModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [courseResponse, categoryResponse, departmentResponse, tierResponse, instructorPresetResponse] = await Promise.all([
        adminAPI.getCourses(),
        adminAPI.getCategories(),
        adminAPI.getDepartments(),
        adminAPI.getTiers(),
        adminAPI.getInstructorPresets(),
      ]);

      setCourses(courseResponse.data);
      setCategories(categoryResponse.data);
      setDepartments(departmentResponse.data);
      setTiers(tierResponse.data);
      setInstructorPresets(instructorPresetResponse.data);
    } catch (error) {
      console.error('Fetch course management data error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetCourseForm = () => {
    setCourseForm(getDefaultCourseForm());
    setLessons([]);
    setQuizReports([]);
    setIsEditing(false);
    setEditingId(null);
    setActiveTab('basic');
  };

  const openAddCourse = () => {
    resetCourseForm();
    setShowModal(true);
  };

  const openEditCourse = async (course) => {
    setIsEditing(true);
    setEditingId(course.id);
    setCourseForm({
      title: course.title,
      description: course.description || '',
      categoryId: course.categoryId || '',
      points: course.points || 0,
      image: course.image || '',
      instructorPresetId: course.instructorPresetId || '',
      instructorName: course.instructorName || 'ทีมวิทยากรผู้เชี่ยวชาญ',
      instructorRole: course.instructorRole || 'Enterprise Instructor',
      instructorAvatar: course.instructorAvatar || '',
      instructorBio: course.instructorBio || '',
      previewVideoUrl: course.previewVideoUrl || '',
      totalDuration: course.totalDuration || '',
      whatYouWillLearn: course.whatYouWillLearn || '[]',
      whatYouWillGet: course.whatYouWillGet || '[]',
      visibleToAll: course.visibleToAll ?? true,
      visibleDepartmentIds: course.visibleDepartmentIds || [],
      visibleTierIds: course.visibleTierIds || [],
      isTemporary: Boolean(course.isTemporary),
      expiredAt: toLocalInputValue(course.expiredAt),
    });
    setActiveTab('basic');
    setShowModal(true);
    await fetchLessons(course.id);
  };

  const fetchLessons = async (courseId) => {
    try {
      const response = await adminAPI.getLessons(courseId);
      setLessons(response.data);
    } catch (error) {
      console.error('Fetch lessons error:', error);
    }
  };

  const fetchQuizReports = async (courseId) => {
    try {
      setLoadingReports(true);
      const response = await adminAPI.getCourseQuizReports(courseId);
      setQuizReports(response.data);
    } catch (error) {
      console.error('Fetch quiz reports error:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleSaveCourse = async (event) => {
    event.preventDefault();

    try {
      const payload = {
        ...courseForm,
        expiredAt: courseForm.isTemporary ? toUTCISOString(courseForm.expiredAt) : null,
      };

      if (isEditing) {
        await adminAPI.updateCourse(editingId, payload);
        toast.success('อัปเดตคอร์สเรียบร้อย');
      } else {
        await adminAPI.createCourse({ ...payload, status: 'PUBLISHED' });
        toast.success('สร้างคอร์สเรียบร้อย');
      }

      setShowModal(false);
      resetCourseForm();
      fetchData();
    } catch (error) {
      console.error('Save course error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถบันทึกคอร์สได้');
    }
  };

  const handleRepublishCourse = async (id) => {
    try {
      await adminAPI.republishCourse(id);
      toast.success('นำคอร์สกลับมาเผยแพร่แล้ว');
      await fetchData();
    } catch (error) {
      console.error('Republish course error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถนำคอร์สกลับมาเผยแพร่ได้');
    }
  };

  const handleArchiveCourse = async (id) => {
    try {
      await adminAPI.archiveCourse(id);
      toast.success('เก็บเข้าคลังเรียบร้อย');
      await fetchData();
    } catch (error) {
      console.error('Archive course error:', error);
      toast.error('ไม่สามารถเก็บคอร์สเข้าคลังได้');
    }
  };

  const handleViewHistory = (course) => {
    setSelectedHistoryCourse(course);
    setShowHistoryModal(true);
  };

  const handleDeleteCourse = async (id) => {
    const ok = await confirm({
      title: 'ยืนยันการลบคอร์ส',
      message: 'ยืนยันการลบคอร์สนี้ใช่หรือไม่? การลบนี้จะไม่สามารถย้อนคืนได้',
      confirmLabel: 'ลบคอร์ส',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.deleteCourse(id);
      toast.success('ลบคอร์สเรียบร้อย');
      setCourses((currentCourses) => currentCourses.filter((course) => course.id !== id));
    } catch (error) {
      console.error('Delete course error:', error);
      toast.error(error.response?.data?.message || 'ลบคอร์สไม่สำเร็จ');
    }
  };

  const handleInstructorPresetDelete = async (id, name) => {
    const ok = await confirm({
      title: 'ยืนยันการลบข้อมูลวิทยากร',
      message: `ต้องการลบข้อมูลวิทยากร "${name}" ใช่หรือไม่?`,
      confirmLabel: 'ลบ',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.deleteInstructorPreset(id);
      toast.success('ลบข้อมูลวิทยากรเรียบร้อย');
      await fetchData();
    } catch (error) {
      console.error('Delete instructor preset error:', error);
      toast.error(error.response?.data?.message || 'ลบข้อมูลวิทยากรไม่สำเร็จ');
    }
  };

  const handleSaveLesson = async (event) => {
    event.preventDefault();

    try {
      if (editingLesson) {
        await adminAPI.updateLesson(editingLesson.id, lessonForm);
      } else {
        await adminAPI.createLesson({ ...lessonForm, courseId: editingId });
      }

      setShowLessonModal(false);
      setEditingLesson(null);
      setLessonForm(getDefaultLessonForm());
      toast.success('บันทึกบทเรียนเรียบร้อย');
      fetchLessons(editingId);
    } catch (error) {
      console.error('Save lesson error:', error);
      toast.error(error.response?.data?.message || 'ไม่สามารถบันทึกบทเรียนได้');
    }
  };

  const handleReorderLessons = async (reorderedLessons) => {
    const originalLessons = [...lessons];
    setLessons(reorderedLessons);

    try {
      await adminAPI.reorderLessons(reorderedLessons.map((l) => l.id));
      toast.success('จัดลำดับบทเรียนเรียบร้อย');
    } catch (error) {
      console.error('Reorder lessons error:', error);
      setLessons(originalLessons);
      toast.error('ไม่สามารถจัดลำดับบทเรียนได้');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    const ok = await confirm({
      title: 'ยืนยันการลบบทเรียน',
      message: 'ยืนยันการลบบทเรียนนี้ใช่หรือไม่?',
      confirmLabel: 'ลบบทเรียน',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.deleteLesson(lessonId);
      toast.success('ลบบทเรียนเรียบร้อย');
      fetchLessons(editingId);
    } catch (error) {
      console.error('Delete lesson error:', error);
      toast.error(error.response?.data?.message || 'ลบบทเรียนไม่สำเร็จ');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const compressedFile = await compressImage(file);
      const response = await adminAPI.uploadFile(compressedFile);
      setCourseForm((currentForm) => ({ ...currentForm, image: response.data.fileUrl }));
      toast.success('อัปโหลดรูปภาพเรียบร้อย');
    } catch (error) {
      console.error('Upload image error:', error);
      toast.error('อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleDocUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const compressedFile = file.type.startsWith('image/') ? await compressImage(file) : file;
      const response = await adminAPI.uploadFile(compressedFile);
      setLessonForm((current) => ({ ...current, contentUrl: response.data.fileUrl }));
      toast.success('อัปโหลดสื่อการสอนเรียบร้อย');
    } catch (error) {
       console.error(error);
       toast.error('อัปโหลดไฟล์ไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  const handleEditorImageUpload = async (file) => {
    if (!file?.type?.startsWith('image/')) {
      toast.error('ไฟล์รูปภาพไม่ถูกต้อง');
      return '';
    }

    try {
      setEditorImageUploading(true);
      const compressedFile = await compressImage(file);
      const response = await adminAPI.uploadFile(compressedFile);
      toast.success('อัปโหลดรูปภาพในบทเรียนเรียบร้อย');
      return response.data.fileUrl;
    } catch (error) {
      console.error('Upload lesson editor image error:', error);
      toast.error('อัปโหลดรูปภาพไม่สำเร็จ');
      return '';
    } finally {
      setEditorImageUploading(false);
    }
  };

  const filteredCourses = useMemo(() => (
    courses.filter((course) => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === FILTER_VALUES.ALL || course.categoryId === selectedCategory;
      const matchesModuleGroup = selectedModuleGroup === FILTER_VALUES.ALL || course.category?.type === selectedModuleGroup;
      const matchesView = courseView === ENTITY_VIEW_STATUS.ARCHIVED ? Boolean(course.isArchived) : !course.isArchived;
      return matchesSearch && matchesCategory && matchesModuleGroup && matchesView;
    })
  ), [courseView, courses, searchTerm, selectedCategory, selectedModuleGroup]);

  const moduleGroupOptions = useMemo(() => {
    const visibleTypes = Array.from(
      new Set(
        categories
          .filter((category) => !category.isArchived && category.type)
          .map((category) => category.type)
      )
    );

    return [
      { value: FILTER_VALUES.ALL, label: 'ทุกกลุ่มโมดูล' },
      ...visibleTypes.map((type) => ({
        value: type,
        label: MODULE_GROUP_LABELS[type] || type,
      })),
    ];
  }, [categories]);

  const selectableCategories = useMemo(() => (
    categories.filter((category) => !category.isArchived || category.id === courseForm.categoryId)
  ), [categories, courseForm.categoryId]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header Area */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="text-left">
          <h2 className="mb-1 text-2xl font-bold">จัดการคอร์สเรียน</h2>
          <p className="text-sm text-muted">
            สร้างคอร์ส จัดการบทเรียน และกำหนดว่าแผนกหรือระดับผู้ใช้งานไหนจะมองเห็นคอร์สนี้ได้
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setShowCategoryModal(true); }} className="btn btn-outline">
            จัดการหมวดหมู่
          </button>
          <button type="button" onClick={() => setShowInstructorPresetModal(true)} className="btn btn-outline">
            <Sparkles size={18} />
            จัดการวิทยากร
          </button>
          <button type="button" onClick={openAddCourse} className="btn btn-primary shadow-lg shadow-primary/20">
            <Plus size={18} />
            สร้างคอร์สใหม่
          </button>
        </div>
      </div>

      <CourseFilters 
        courseView={courseView}
        setCourseView={setCourseView}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedModuleGroup={selectedModuleGroup}
        setSelectedModuleGroup={setSelectedModuleGroup}
        categories={categories}
        moduleGroupOptions={moduleGroupOptions}
        activeCount={courses.filter(c => !c.isArchived).length}
        archivedCount={courses.filter(c => c.isArchived).length}
      />

      <CourseTable 
        courses={filteredCourses}
        loading={loading}
        onEdit={openEditCourse}
        onDelete={handleDeleteCourse}
        onRepublish={handleRepublishCourse}
        onArchive={handleArchiveCourse}
        onViewHistory={handleViewHistory}
      />

      <CourseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isEditing={isEditing}
        editingId={editingId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        courseForm={courseForm}
        setCourseForm={setCourseForm}
        categories={selectableCategories}
        instructorPresets={instructorPresets}
        departments={departments}
        tiers={tiers}
        lessons={lessons}
        loadingReports={loadingReports}
        quizReports={quizReports}
        onSaveCourse={handleSaveCourse}
        onImageUpload={handleImageUpload}
        onEditLesson={(lesson) => {
          setEditingLesson(lesson);
          setLessonForm(lesson);
          setShowLessonModal(true);
        }}
        onDeleteLesson={handleDeleteLesson}
        onAddLesson={() => {
          setEditingLesson(null);
          setLessonForm(getDefaultLessonForm(lessons.length + 1));
          setShowLessonModal(true);
        }}
        onReorderLessons={handleReorderLessons}
        fetchQuizReports={fetchQuizReports}
        uploading={uploading}
      />

      <CategoryManagementModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        departments={departments}
        tiers={tiers}
        onRefresh={fetchData}
      />

      <CourseAttendanceModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        course={selectedHistoryCourse}
        departments={departments}
        tiers={tiers}
      />

      <LessonModal
        isOpen={showLessonModal}
        onClose={() => setShowLessonModal(false)}
        onSave={handleSaveLesson}
        lessonForm={lessonForm}
        setLessonForm={setLessonForm}
        uploading={uploading}
        editorImageUploading={editorImageUploading}
        onDocUpload={handleDocUpload}
        onEditorImageUpload={handleEditorImageUpload}
        isEditing={!!editingLesson}
      />

      <InstructorPresetModal
        isOpen={showInstructorPresetModal}
        presets={instructorPresets}
        loading={loading}
        onClose={() => setShowInstructorPresetModal(false)}
        onCreate={async (payload) => {
          await adminAPI.createInstructorPreset(payload);
          toast.success('สร้างข้อมูลวิทยากรเรียบร้อย');
          await fetchData();
        }}
        onUpdate={async (id, payload) => {
          await adminAPI.updateInstructorPreset(id, payload);
          toast.success('อัปเดตข้อมูลวิทยากรเรียบร้อย');
          await fetchData();
        }}
        onDelete={handleInstructorPresetDelete}
      />
      <ConfirmDialog {...ConfirmDialogProps} />
    </div>
  );
};

export default CourseManagement;
