import React from 'react';
import { Plus, CalendarClock } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/common/Skeleton';
import { useToast } from '../../context/useToast';
import useConfirm from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ENTITY_VIEW_STATUS } from '../../utils/constants/statuses';
import GoalList from '../../components/admin/GoalList';
import CreateGoalModal from '../../components/admin/CreateGoalModal';
import GoalReportModal from '../../components/admin/GoalReportModal';
import ViewToggleTabs from '../../components/common/ViewToggleTabs';
import CustomSelect from '../../components/common/CustomSelect';
import { MONTH_OPTIONS } from '../../utils/constants/dashboard';
import { FILTER_VALUES } from '../../utils/constants/filters';
import { SlidersHorizontal } from 'lucide-react';
import { isSuperAdmin } from '../../utils/roles';
import { getThailandDateParts, toThaiDateInputValue } from '../../utils/dateUtils';

const getDefaultGoalForm = (currentUser = null) => ({
    title: '',
    type: 'ANY',
    targetCount: 1,
    expiryDate: '',
    scope: currentUser?.departmentId ? 'DEPARTMENT' : 'GLOBAL',
    departmentId: currentUser?.departmentId || '',
    courseIds: [],
    postAssignmentReminderDays: '',
    preDeadlineReminderDays: '',
    postAssignmentReminderTime: '',
    preDeadlineReminderTime: ''
});

const getCurrentThaiMonthYear = () => {
    const thaiNow = getThailandDateParts(new Date());
    return {
        month: String(thaiNow?.month || 1),
        year: String(thaiNow?.year || new Date().getFullYear())
    };
};

const GoalManagement = () => {
    const toast = useToast();
    const { confirm, ConfirmDialogProps } = useConfirm();

    const stableConfirmProps = React.useMemo(() => ConfirmDialogProps, [ConfirmDialogProps]);

    const [goals, setGoals] = React.useState([]);
    const [courses, setCourses] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [reportGoal, setReportGoal] = React.useState(null);
    const [reportData, setReportData] = React.useState(null);
    const [reportLoading, setReportLoading] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [editingId, setEditingId] = React.useState(null);
    const [departments, setDepartments] = React.useState([]);
    const [currentUser, setCurrentUser] = React.useState(null);
    const [viewMode, setViewMode] = React.useState(ENTITY_VIEW_STATUS.ACTIVE);
    const [formData, setFormData] = React.useState(getDefaultGoalForm());
    const [courseSearch, setCourseSearch] = React.useState('');
    const currentThaiMonthYear = React.useMemo(() => getCurrentThaiMonthYear(), []);
    const [filters, setFilters] = React.useState({
        month: currentThaiMonthYear.month,
        year: currentThaiMonthYear.year,
        departmentId: ''
    });

    const yearOptions = React.useMemo(() => {
        const currentYear = Number.parseInt(currentThaiMonthYear.year, 10);
        return Array.from({ length: 5 }, (_, index) => ({
            value: String(currentYear - 2 + index),
            label: String(currentYear - 2 + index)
        }));
    }, [currentThaiMonthYear.year]);
    const goalReportCacheRef = React.useRef(new Map());
    const goalReportRequestRef = React.useRef(null);

    const invalidateGoalReportCache = React.useCallback((goalId) => {
        if (goalId) {
            goalReportCacheRef.current.delete(goalId);
        }
    }, []);

    const cancelGoalReportRequest = React.useCallback(() => {
        if (goalReportRequestRef.current) {
            goalReportRequestRef.current.abort();
            goalReportRequestRef.current = null;
        }
    }, []);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            setCurrentUser(user);

            const [goalsRes, coursesRes, deptsRes] = await Promise.all([
                adminAPI.getGoals(),
                adminAPI.getCourses(),
                adminAPI.getDepartments()
            ]);

            setGoals(goalsRes.data || []);
            setCourses(coursesRes.data || []);
            setDepartments(deptsRes.data || []);

            if (user?.departmentId) {
                setFormData((prev) => {
                    if (prev.departmentId === user.departmentId && prev.scope === 'DEPARTMENT') {
                        return prev;
                    }

                    return {
                        ...prev,
                        scope: 'DEPARTMENT',
                        departmentId: user.departmentId
                    };
                });
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    React.useEffect(() => () => {
        cancelGoalReportRequest();
    }, [cancelGoalReportRequest]);

    const handleSaveGoal = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await adminAPI.updateGoal(editingId, formData);
                toast.success('แก้ไขเป้าหมายสำเร็จแล้ว');
            } else {
                await adminAPI.createGoal(formData);
                toast.success('สร้างเป้าหมายสำเร็จแล้ว');
            }
            
            setIsModalOpen(false);
            setIsEditing(false);
            setEditingId(null);
            setFormData(getDefaultGoalForm(currentUser));
            fetchData();
        } catch (err) {
            console.error('Failed to save goal', err);
            toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกเป้าหมาย');
        }
    };

    const handleEditGoal = React.useCallback((goal) => {
        setFormData({
            title: goal.title,
            type: goal.type,
            targetCount: goal.targetCount,
            expiryDate: toThaiDateInputValue(goal.expiryDate),
            scope: goal.scope,
            departmentId: goal.departmentId || '',
            courseIds: goal.courses.map(c => c.courseId),
            postAssignmentReminderDays: goal.postAssignmentReminderDays !== null && goal.postAssignmentReminderDays !== undefined ? String(goal.postAssignmentReminderDays) : '',
            preDeadlineReminderDays: goal.preDeadlineReminderDays !== null && goal.preDeadlineReminderDays !== undefined ? String(goal.preDeadlineReminderDays) : '',
            postAssignmentReminderTime: goal.postAssignmentReminderDays === 0 ? '' : (goal.postAssignmentReminderTime || ''),
            preDeadlineReminderTime: goal.preDeadlineReminderTime || ''
        });
        setEditingId(goal.id);
        setIsEditing(true);
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = React.useCallback(() => {
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingId(null);
        setFormData(getDefaultGoalForm(currentUser));
    }, [currentUser]);

    const handleDeleteGoal = React.useCallback(async (id) => {
        const ok = await confirm({
            title: 'ยืนยันการลบเป้าหมาย',
            message: 'คุณแน่ใจหรือไม่ว่าต้องการลบเป้าหมายนี้?',
            confirmLabel: 'ลบเป้าหมาย',
            variant: 'danger',
        });

        if (!ok) return;

        try {
            await adminAPI.deleteGoal(id);
            invalidateGoalReportCache(id);
            toast.success('ลบเป้าหมายสำเร็จ');
            fetchData();
        } catch (err) {
            console.error('Failed to delete goal', err);
            toast.error('ลบเป้าหมายไม่สำเร็จ');
        }
    }, [confirm, fetchData, invalidateGoalReportCache, toast]);

    const handleArchiveGoal = React.useCallback(async (id) => {
        try {
            await adminAPI.archiveGoal(id);
            invalidateGoalReportCache(id);
            toast.success('เก็บเป้าหมายเข้าคลังสำเร็จ');
            fetchData();
        } catch (err) {
            console.error('Failed to archive goal', err);
            toast.error('เก็บเป้าหมายไม่สำเร็จ');
        }
    }, [fetchData, invalidateGoalReportCache, toast]);

    const handleRepublishGoal = React.useCallback(async (id) => {
        try {
            await adminAPI.republishGoal(id);
            invalidateGoalReportCache(id);
            toast.success('นำเป้าหมายกลับมาใช้งานสำเร็จ');
            fetchData();
        } catch (err) {
            console.error('Failed to republish goal', err);
            toast.error('ไม่สามารถนำเป้าหมายกลับมาใช้งานได้');
        }
    }, [fetchData, invalidateGoalReportCache, toast]);

    const handleViewReport = React.useCallback(async (goal) => {
        setReportGoal(goal);

        const cachedReport = goalReportCacheRef.current.get(goal.id);
        if (cachedReport) {
            setReportData(cachedReport);
            setReportLoading(false);
            return;
        }

        cancelGoalReportRequest();
        const controller = new AbortController();
        goalReportRequestRef.current = controller;
        setReportData(null);
        setReportLoading(true);

        try {
            const res = await adminAPI.getGoalReport(goal.id, { signal: controller.signal });
            goalReportCacheRef.current.set(goal.id, res.data);

            if (goalReportRequestRef.current === controller) {
                setReportData(res.data);
            }
        } catch (err) {
            if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
                return;
            }

            console.error('Failed to fetch report', err);
            toast.error('ไม่สามารถโหลดข้อมูลรายงานได้');
        } finally {
            if (goalReportRequestRef.current === controller) {
                goalReportRequestRef.current = null;
                setReportLoading(false);
            }
        }
    }, [cancelGoalReportRequest, toast]);

    const handleCloseReport = React.useCallback(() => {
        cancelGoalReportRequest();
        setReportGoal(null);
        setReportData(null);
        setReportLoading(false);
    }, [cancelGoalReportRequest]);

    const filteredCourses = React.useMemo(() => {
        return courses.filter((course) =>
            course.title.toLowerCase().includes(courseSearch.toLowerCase()) &&
            !formData.courseIds.includes(course.id)
        );
    }, [courses, courseSearch, formData.courseIds]);

    const toggleCourse = (courseId) => {
        setFormData((prev) => ({
            ...prev,
            courseIds: prev.courseIds.includes(courseId)
                ? prev.courseIds.filter((id) => id !== courseId)
                : [...prev.courseIds, courseId]
        }));
    };

    const activeGoals = React.useMemo(() => {
        const now = new Date();
        return goals.filter((goal) => goal.status !== 'ARCHIVED' && (!goal.expiryDate || new Date(goal.expiryDate) > now));
    }, [goals]);

    const archivedGoals = React.useMemo(() => {
        const now = new Date();
        return goals.filter((goal) => goal.status === 'ARCHIVED' || (goal.expiryDate && new Date(goal.expiryDate) <= now));
    }, [goals]);

    const displayGoals = React.useMemo(() => {
        let baseGoals = viewMode === ENTITY_VIEW_STATUS.ACTIVE ? activeGoals : archivedGoals;
        
        return baseGoals.filter((goal) => {
            const goalDateParts = getThailandDateParts(goal.createdAt);
            const matchesYear = !filters.year || String(goalDateParts?.year || '') === filters.year;
            const matchesMonth = filters.month === FILTER_VALUES.ALL || String(goalDateParts?.month || '') === filters.month;
            
            let matchesScope = true;
            if (isSuperAdmin(currentUser) && filters.departmentId) {
                if (filters.departmentId === 'GLOBAL') {
                    matchesScope = goal.scope === 'GLOBAL';
                } else {
                    matchesScope = goal.scope === 'DEPARTMENT' && goal.departmentId === filters.departmentId;
                }
            }

            return matchesYear && matchesMonth && matchesScope;
        });
    }, [viewMode, activeGoals, archivedGoals, filters.month, filters.year, filters.departmentId, currentUser]);

    const columns = React.useMemo(() => [
        { label: 'ชื่อเป้าหมาย' },
        { label: 'ประเภท' },
        { label: 'รายละเอียด' },
        { label: 'วันหมดอายุ' },
        { label: 'ขอบเขต' },
        { label: 'จัดการ', className: 'text-center' }
    ], []);

    const tabs = React.useMemo(() => [
        { key: ENTITY_VIEW_STATUS.ACTIVE, label: `กำลังใช้งาน (${activeGoals.length})`, icon: CalendarClock },
        { key: ENTITY_VIEW_STATUS.ARCHIVED, label: `เก็บเข้าคลัง (${archivedGoals.length})`, icon: CalendarClock }
    ], [activeGoals.length, archivedGoals.length]);

    if (loading) {
        return <Skeleton.List count={8} />;
    }

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                title="จัดการเป้าหมายการเรียนรู้"
                subtitle="กำหนดเป้าหมายการเรียนรายสัปดาห์หรือรายเดือนสำหรับพนักงานทุกคนหรือเฉพาะแผนก"
                actions={(
                    <button type="button" onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                        <Plus size={18} />
                        สร้างเป้าหมายใหม่
                    </button>
                )}
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                <ViewToggleTabs
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    tabs={tabs}
                    className="!mb-0"
                />

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-400">
                        <SlidersHorizontal size={16} />
                        <span>Filter</span>
                    </div>

                    <CustomSelect
                        value={filters.month}
                        onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                        options={MONTH_OPTIONS}
                        size="sm"
                        fullWidth={false}
                        className="w-32"
                    />

                    <CustomSelect
                        value={filters.year}
                        onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                        options={yearOptions}
                        size="sm"
                        fullWidth={false}
                        className="w-24"
                    />

                    {isSuperAdmin(currentUser) && (
                        <CustomSelect
                            value={filters.departmentId}
                            onChange={(e) => setFilters(prev => ({ ...prev, departmentId: e.target.value }))}
                            options={[
                                { value: '', label: 'ทุกขอบเขต' },
                                { value: 'GLOBAL', label: 'ทั้งองค์กร' },
                                ...departments.map(d => ({ value: d.id, label: d.name }))
                            ]}
                            size="sm"
                            fullWidth={false}
                            className="w-40 lg:w-44"
                            placeholder="เลือกขอบเขต"
                        />
                    )}
                </div>
            </div>

            <GoalList
                goals={displayGoals}
                columns={columns}
                viewMode={viewMode}
                onViewReport={handleViewReport}
                onEditGoal={handleEditGoal}
                onDeleteGoal={handleDeleteGoal}
                onArchiveGoal={handleArchiveGoal}
                onRepublishGoal={handleRepublishGoal}
            />

            <CreateGoalModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                formData={formData}
                setFormData={setFormData}
                currentUser={currentUser}
                departments={departments}
                courses={courses}
                onSave={handleSaveGoal}
                isEditing={isEditing}
                courseSearch={courseSearch}
                setCourseSearch={setCourseSearch}
                filteredCourses={filteredCourses}
                toggleCourse={toggleCourse}
            />

            <GoalReportModal
                reportGoal={reportGoal}
                reportData={reportData}
                reportLoading={reportLoading}
                onClose={handleCloseReport}
            />
            <ConfirmDialog {...stableConfirmProps} />
        </div>
    );
};

export default GoalManagement;
