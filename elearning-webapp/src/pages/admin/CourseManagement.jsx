import React from 'react';
import { Plus, Sparkles, Building2 } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { toLocalInputValue } from '../../utils/dateUtils';
import { compressImage } from '../../utils/imageUtils';
import { useToast } from '../../context/useToast';
import useConfirm from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Components
import CourseModal from '../../components/admin/CourseModal';
import LessonModal from '../../components/admin/LessonModal';
import CategoryManagementModal from '../../components/admin/CategoryManagementModal';
import InstructorPresetModal from '../../components/admin/InstructorPresetModal';
import OrganizationPresetModal from '../../components/admin/OrganizationPresetModal';
import CourseFilters from '../../components/admin/CourseFilters';
import CourseTable from '../../components/admin/CourseTable';
import CourseAttendanceModal from '../../components/admin/CourseAttendanceModal';
import { FILTER_VALUES } from '../../utils/constants/filters';
import { ENTITY_STATUS, ENTITY_VIEW_STATUS } from '../../utils/constants/statuses';
import useCoursePublishing from './course-management/useCoursePublishing';

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
  visibleCohortRoleIds: [],
  competencies: [],
  isTemporary: false,
  expiredAt: '',
  status: ENTITY_STATUS.DRAFT,
  certificateEnabled: false,
  certificatePassingScore: 80,
  certificateTemplateId: 'CLASSIC_001',
  certificateSignatureSlots: [
    {
      id: 'organization',
      label: 'Signature 1',
      type: 'ORGANIZATION',
      enabled: true,
      organizationPresetId: '',
      name: '',
      title: 'Organization Signature',
      signatureImageUrl: '',
    },
    {
      id: 'instructor',
      label: 'Signature 2',
      type: 'INSTRUCTOR',
      enabled: true,
      name: '',
      title: '',
      signatureImageUrl: '',
    },
  ],
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
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const { confirm, ConfirmDialogProps } = useConfirm();
  const [courses, setCourses] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [departments, setDepartments] = React.useState([]);
  const [tiers, setTiers] = React.useState([]);
  const [cohortRoles, setCohortRoles] = React.useState([]);
  const [competencies, setCompetencies] = React.useState([]);
  const [instructorPresets, setInstructorPresets] = React.useState([]);
  const [organizationPresets, setOrganizationPresets] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState(FILTER_VALUES.ALL);
  const [courseView, setCourseView] = React.useState(ENTITY_VIEW_STATUS.ACTIVE);
  const [loadingCourses, setLoadingCourses] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCourses, setTotalCourses] = React.useState(0);
  const [activeCount, setActiveCount] = React.useState(0);
  const [archivedCount, setArchivedCount] = React.useState(0);

  const [showModal, setShowModal] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('basic');
  const [courseForm, setCourseForm] = React.useState(getDefaultCourseForm());
  const [lessons, setLessons] = React.useState([]);
  const [quizReports, setQuizReports] = React.useState([]);
  const [loadingReports, setLoadingReports] = React.useState(false);

  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const [selectedHistoryCourse, setSelectedHistoryCourse] = React.useState(null);

  const [showLessonModal, setShowLessonModal] = React.useState(false);
  const [editingLesson, setEditingLesson] = React.useState(null);
  const [lessonForm, setLessonForm] = React.useState(getDefaultLessonForm());
  const [showCategoryModal, setShowCategoryModal] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [editorImageUploading, setEditorImageUploading] = React.useState(false);
  const [showInstructorPresetModal, setShowInstructorPresetModal] = React.useState(false);
  const [showOrganizationPresetModal, setShowOrganizationPresetModal] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      const [categoryResponse, departmentResponse, tierResponse, cohortRoleResponse, competencyResponse, instructorPresetResponse, organizationPresetResponse] = await Promise.all([
        adminAPI.getCategories(),
        adminAPI.getDepartments(),
        adminAPI.getTiers(),
        adminAPI.getCohortRoles(),
        adminAPI.getCompetencies(),
        adminAPI.getInstructorPresets(),
        adminAPI.getOrganizationPresets(),
      ]);

      setCategories(categoryResponse.data || []);
      setDepartments(departmentResponse.data || []);
      setTiers(tierResponse.data || []);
      setCohortRoles(cohortRoleResponse.data || []);
      setCompetencies(competencyResponse.data || []);
      setInstructorPresets(instructorPresetResponse.data || []);
      setOrganizationPresets(organizationPresetResponse.data || []);
    } catch (error) {
      console.error('Fetch course management data error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCourses = React.useCallback(async () => {
    try {
      setLoadingCourses(true);
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        categoryId: selectedCategory === FILTER_VALUES.ALL ? undefined : selectedCategory,
        courseView: courseView === ENTITY_VIEW_STATUS.ARCHIVED ? 'archived' : 'active'
      };
      const response = await adminAPI.getCourses(params);
      if (response.data && response.data.items) {
        setCourses(response.data.items);
        setTotalPages(response.data.pages || 1);
        setTotalCourses(response.data.total || 0);
        setActiveCount(response.data.activeCount || 0);
        setArchivedCount(response.data.archivedCount || 0);
      } else {
        // Plain array fallback
        const items = response.data || [];
        setCourses(items);
        setTotalPages(1);
        setTotalCourses(items.length);
        setActiveCount(items.filter(c => !c.isArchived).length);
        setArchivedCount(items.filter(c => c.isArchived).length);
      }
    } catch (error) {
      console.error('Fetch courses error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลคอร์สได้');
    } finally {
      setLoadingCourses(false);
    }
  }, [currentPage, pageSize, searchTerm, selectedCategory, courseView, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, courseView]);

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
      visibleCohortRoleIds: course.visibleCohortRoleIds || [],
      competencies: (course.competencies || []).map((mapping) => ({
        competencyId: mapping.competencyId,
        requiredLevel: mapping.requiredLevel || '',
        note: mapping.note || '',
      })),
      isTemporary: Boolean(course.isTemporary),
      expiredAt: toLocalInputValue(course.expiredAt),
      status: course.status || ENTITY_STATUS.DRAFT,
      certificateEnabled: course.certificateEnabled ?? false,
      certificatePassingScore: course.certificatePassingScore ?? 80,
      certificateTemplateId: course.certificateTemplateId || 'CLASSIC_001',
      certificateSignatureSlots: course.certificateSignatureSlots || getDefaultCourseForm().certificateSignatureSlots,
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

  const {
    publishFromBuilder: handlePublishCourseFromBuilder,
    saveDraftFromBuilder: handleSaveDraftFromBuilder,
    saveFromFormSubmit: handleSaveCourse,
  } = useCoursePublishing({
    courseForm,
    isEditing,
    editingId,
    lessons,
    fetchData,
    fetchLessons,
    resetCourseForm,
    setActiveTab,
    setCourseForm,
    setEditingId,
    setIsEditing,
    setShowModal,
    toast,
  });

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

  const handleOrganizationPresetDelete = async (id, name) => {
    const ok = await confirm({
      title: 'ยืนยันการลบข้อมูลหน่วยงาน',
      message: `ต้องการลบข้อมูลหน่วยงาน "${name}" ใช่หรือไม่? พรีเซ็ตนี้จะไม่สามารถนำมาใช้ในเกียรติบัตรได้อีก`,
      confirmLabel: 'ลบ',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await adminAPI.deleteOrganizationPreset(id);
      toast.success('ลบข้อมูลหน่วยงานเรียบร้อย');
      await fetchData();
    } catch (error) {
      console.error('Delete organization preset error:', error);
      toast.error(error.response?.data?.message || 'ลบข้อมูลหน่วยงานไม่สำเร็จ');
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

  const filteredCourses = React.useMemo(() => (
    (courses || []).filter((course) => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === FILTER_VALUES.ALL || course.categoryId === selectedCategory;
      const matchesView = courseView === ENTITY_VIEW_STATUS.ARCHIVED ? Boolean(course.isArchived) : !course.isArchived;
      return matchesSearch && matchesCategory && matchesView;
    })
  ), [courseView, courses, searchTerm, selectedCategory]);

  const selectableCategories = React.useMemo(() => (
    (categories || []).filter((category) => !category.isArchived || category.id === courseForm.categoryId)
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
          <button type="button" onClick={() => setShowOrganizationPresetModal(true)} className="btn btn-outline">
            <Building2 size={18} />
            จัดการหน่วยงาน
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
        categories={categories}
        activeCount={activeCount}
        archivedCount={archivedCount}
      />

      <CourseTable 
        courses={courses}
        loading={loadingCourses}
        onEdit={openEditCourse}
        onDelete={handleDeleteCourse}
        onRepublish={handleRepublishCourse}
        onArchive={handleArchiveCourse}
        onViewHistory={handleViewHistory}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-2xl shadow-sm mt-4">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              ย้อนกลับ
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">
                แสดงผล <span className="font-medium text-slate-800">{Math.min((currentPage - 1) * pageSize + 1, totalCourses)}</span> ถึง{' '}
                <span className="font-medium text-slate-800">{Math.min(currentPage * pageSize, totalCourses)}</span> จากทั้งหมด{' '}
                <span className="font-medium text-slate-800">{totalCourses}</span> คอร์ส
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  ย้อนกลับ
                </button>
                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNum = index + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 ${
                        pageNum === currentPage
                          ? 'z-10 bg-primary text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                          : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:outline-offset-0'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  ถัดไป
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

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
        organizationPresets={organizationPresets}
        departments={departments}
        tiers={tiers}
        cohortRoles={cohortRoles}
        competencies={competencies}
        lessons={lessons}
        loadingReports={loadingReports}
        quizReports={quizReports}
        onSaveCourse={handleSaveCourse}
        onImageUpload={handleImageUpload}
        onEditLesson={(lesson) => {
          if (!lesson) return;
          setEditingLesson(lesson);
          setLessonForm({ ...lesson });
          setShowLessonModal(true);
        }}
        onDeleteLesson={handleDeleteLesson}
        onAddLesson={() => {
          setEditingLesson(null);
          setLessonForm(getDefaultLessonForm(lessons.length + 1));
          setShowLessonModal(true);
        }}
        onReorderLessons={handleReorderLessons}
        onSaveDraft={handleSaveDraftFromBuilder}
        onPublishCourse={handlePublishCourseFromBuilder}
        fetchQuizReports={fetchQuizReports}
        uploading={uploading}
        currentUser={currentUser}
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

      <OrganizationPresetModal
        isOpen={showOrganizationPresetModal}
        presets={organizationPresets}
        loading={loading}
        onClose={() => setShowOrganizationPresetModal(false)}
        onCreate={async (payload) => {
          await adminAPI.createOrganizationPreset(payload);
          toast.success('สร้างพรีเซ็ตหน่วยงานเรียบร้อย');
          await fetchData();
        }}
        onUpdate={async (id, payload) => {
          await adminAPI.updateOrganizationPreset(id, payload);
          toast.success('อัปเดตพรีเซ็ตหน่วยงานเรียบร้อย');
          await fetchData();
        }}
        onDelete={handleOrganizationPresetDelete}
      />

      <ConfirmDialog {...ConfirmDialogProps} />
    </div>
  );
};

export default CourseManagement;
