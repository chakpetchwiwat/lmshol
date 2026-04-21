import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, CalendarClock } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { useToast } from '../../context/useToast';
import useConfirm from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { ENTITY_VIEW_STATUS } from '../../utils/constants/statuses';
import GoalList from '../../components/admin/GoalList';
import CreateGoalModal from '../../components/admin/CreateGoalModal';
import GoalReportModal from '../../components/admin/GoalReportModal';
import ViewToggleTabs from '../../components/common/ViewToggleTabs';

const GoalManagement = () => {
    const toast = useToast();
    const { confirm, ConfirmDialogProps } = useConfirm();

    const stableConfirmProps = useMemo(() => ConfirmDialogProps, [
        ConfirmDialogProps.isOpen,
        ConfirmDialogProps.title,
        ConfirmDialogProps.message
    ]);

    const [goals, setGoals] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reportGoal, setReportGoal] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [viewMode, setViewMode] = useState(ENTITY_VIEW_STATUS.ACTIVE);
    const [formData, setFormData] = useState({
        title: '',
        type: 'ANY',
        targetCount: 1,
        expiryDate: '',
        scope: 'DEPARTMENT',
        departmentId: '',
        courseIds: []
    });
    const [courseSearch, setCourseSearch] = useState('');
    const goalReportCacheRef = useRef(new Map());
    const goalReportRequestRef = useRef(null);

    const invalidateGoalReportCache = useCallback((goalId) => {
        if (goalId) {
            goalReportCacheRef.current.delete(goalId);
        }
    }, []);

    const cancelGoalReportRequest = useCallback(() => {
        if (goalReportRequestRef.current) {
            goalReportRequestRef.current.abort();
            goalReportRequestRef.current = null;
        }
    }, []);

    const fetchData = useCallback(async () => {
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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => () => {
        cancelGoalReportRequest();
    }, [cancelGoalReportRequest]);

    const handleCreateGoal = async (e) => {
        e.preventDefault();
        try {
            await adminAPI.createGoal(formData);
            toast.success('สร้างเป้าหมายสำเร็จแล้ว');
            setIsModalOpen(false);
            setFormData({
                title: '',
                type: 'ANY',
                targetCount: 1,
                expiryDate: '',
                scope: currentUser?.departmentId ? 'DEPARTMENT' : 'GLOBAL',
                departmentId: currentUser?.departmentId || '',
                courseIds: []
            });
            fetchData();
        } catch (err) {
            console.error('Failed to create goal', err);
            toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างเป้าหมาย');
        }
    };

    const handleDeleteGoal = useCallback(async (id) => {
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

    const handleArchiveGoal = useCallback(async (id) => {
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

    const handleRepublishGoal = useCallback(async (id) => {
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

    const handleViewReport = useCallback(async (goal) => {
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

    const handleCloseReport = useCallback(() => {
        cancelGoalReportRequest();
        setReportGoal(null);
        setReportData(null);
        setReportLoading(false);
    }, [cancelGoalReportRequest]);

    const filteredCourses = useMemo(() => {
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

    const activeGoals = useMemo(() => {
        const now = new Date();
        return goals.filter((goal) => goal.status !== 'ARCHIVED' && (!goal.expiryDate || new Date(goal.expiryDate) > now));
    }, [goals]);

    const archivedGoals = useMemo(() => {
        const now = new Date();
        return goals.filter((goal) => goal.status === 'ARCHIVED' || (goal.expiryDate && new Date(goal.expiryDate) <= now));
    }, [goals]);

    const displayGoals = viewMode === ENTITY_VIEW_STATUS.ACTIVE ? activeGoals : archivedGoals;

    const columns = useMemo(() => [
        { label: 'ชื่อเป้าหมาย' },
        { label: 'ประเภท' },
        { label: 'รายละเอียด' },
        { label: 'วันหมดอายุ' },
        { label: 'ขอบเขต' },
        { label: 'จัดการ', className: 'text-center' }
    ], []);

    const tabs = useMemo(() => [
        { key: ENTITY_VIEW_STATUS.ACTIVE, label: `กำลังใช้งาน (${activeGoals.length})`, icon: CalendarClock },
        { key: ENTITY_VIEW_STATUS.ARCHIVED, label: `เก็บเข้าคลัง (${archivedGoals.length})`, icon: CalendarClock }
    ], [activeGoals.length, archivedGoals.length]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
        );
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

            <ViewToggleTabs
                viewMode={viewMode}
                setViewMode={setViewMode}
                tabs={tabs}
            />

            <GoalList
                goals={displayGoals}
                columns={columns}
                viewMode={viewMode}
                onViewReport={handleViewReport}
                onDeleteGoal={handleDeleteGoal}
                onArchiveGoal={handleArchiveGoal}
                onRepublishGoal={handleRepublishGoal}
            />

            <CreateGoalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                formData={formData}
                setFormData={setFormData}
                currentUser={currentUser}
                departments={departments}
                courses={courses}
                onSave={handleCreateGoal}
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
