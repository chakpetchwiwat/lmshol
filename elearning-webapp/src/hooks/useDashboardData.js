import { useEffect, useState } from 'react';
import { adminAPI } from '../utils/api';
import { FILTER_VALUES } from '../utils/constants/filters';

// --- Goal helpers used only inside this hook ---
const isGoalCurrentlyActive = (goal) => {
    if (!goal || goal.status !== 'ACTIVE') return false;
    if (!goal.expiryDate) return true;
    return new Date(goal.expiryDate).getTime() >= Date.now();
};

const getGoalScopeLabel = (goal) => {
    if (goal?.scope === 'DEPARTMENT') {
        return goal?.department?.name || 'Department';
    }
    return 'ทั้งองค์กร';
};

const buildGoalTargetLabel = (goal) => {
    if (!goal) return '-';
    if (goal.type === 'ANY') {
        return `${goal.targetCount || 0} คอร์ส`;
    }
    const totalCourses = goal.courses?.length || goal.targetCount || 0;
    return `${totalCourses} คอร์สที่กำหนด`;
};

const countGoalStatuses = (rows = []) => rows.reduce((accumulator, row) => {
    const status = row.userStatus || 'NOT_STARTED';
    accumulator.ALL += 1;
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
}, {
    ALL: 0,
    COMPLETED: 0,
    IN_PROGRESS: 0,
    NOT_STARTED: 0,
});

/**
 * useDashboardData
 *
 * Drives all data-fetching side-effects for the Dashboard page.
 * State is owned by the caller (Dashboard.jsx) and passed in as setters,
 * so this hook is purely about orchestrating fetches, not managing state.
 *
 * Returns: { loading, errorMessage, goalTrackingItems, goalTrackingLoading }
 */
const useDashboardData = ({
    filters,
    isFullAdmin,
    currentUserDepartment,
    selectedDepartmentName,
    setStats,
    setAdvancedStats,
    setDepartments,
}) => {
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [goalTrackingItems, setGoalTrackingItems] = useState([]);
    const [goalTrackingLoading, setGoalTrackingLoading] = useState(false);

    // --- Fetch departments (admin only, once) ---
    useEffect(() => {
        if (!isFullAdmin) return undefined;

        let isMounted = true;

        const fetchDepartments = async () => {
            try {
                const response = await adminAPI.getDepartments();
                if (isMounted) {
                    setDepartments(response.data || []);
                }
            } catch (error) {
                console.error('Fetch departments error:', error);
            }
        };

        fetchDepartments();

        return () => {
            isMounted = false;
        };
    }, [isFullAdmin, setDepartments]);

    // --- Fetch dashboard stats + advanced analytics ---
    useEffect(() => {
        let isMounted = true;

        const fetchAllStats = async () => {
            setLoading(true);
            setErrorMessage('');

            const params = {
                year: filters.year,
                ...(filters.month && filters.month !== FILTER_VALUES.ALL ? { month: filters.month } : {}),
                ...(isFullAdmin && filters.departmentId ? { departmentId: filters.departmentId } : {}),
            };

            try {
                const dashboardResponse = await adminAPI.getDashboardStats(params);

                if (!isMounted) return;

                setStats(dashboardResponse.data);

                try {
                    const analyticsResponse = await adminAPI.getAdvancedAnalytics(params);

                    if (!isMounted) return;
                    setAdvancedStats(analyticsResponse.data);
                } catch (analyticsError) {
                    console.error('Fetch advanced analytics error:', analyticsError);
                    if (isMounted) {
                        setAdvancedStats({
                            skillGap: [],
                            benchmarking: [],
                            roiTrend: [],
                            atRisk: [],
                        });
                    }
                }
            } catch (error) {
                console.error('Fetch dashboard stats error:', error);
                if (isMounted) {
                    setErrorMessage('ไม่สามารถโหลดข้อมูล dashboard ได้ในขณะนี้');
                    setAdvancedStats({
                        skillGap: [],
                        benchmarking: [],
                        roiTrend: [],
                        atRisk: [],
                    });
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchAllStats();

        return () => {
            isMounted = false;
        };
    }, [filters, isFullAdmin, setStats, setAdvancedStats]);

    // --- Fetch goal tracking ---
    useEffect(() => {
        let isMounted = true;

        const fetchGoalTracking = async () => {
            setGoalTrackingLoading(true);

            try {
                const goalsResponse = await adminAPI.getGoals();
                const activeGoals = (goalsResponse.data || []).filter(isGoalCurrentlyActive);

                const reportResults = await Promise.allSettled(activeGoals.map(async (goal) => {
                    const response = await adminAPI.getGoalReport(goal.id);
                    const allRows = response.data?.report || [];
                    const visibleRows = (isFullAdmin && filters.departmentId && selectedDepartmentName)
                        ? allRows.filter((row) => row.department === selectedDepartmentName)
                        : (!isFullAdmin && currentUserDepartment)
                            ? allRows.filter((row) => row.department === currentUserDepartment)
                            : allRows;

                    return {
                        ...goal,
                        scopeLabel: getGoalScopeLabel(goal),
                        targetLabel: buildGoalTargetLabel(goal),
                        counts: countGoalStatuses(visibleRows),
                        reportData: {
                            ...response.data,
                            report: visibleRows,
                        },
                    };
                }));

                const reports = reportResults
                    .filter((result) => result.status === 'fulfilled')
                    .map((result) => result.value);

                reportResults
                    .filter((result) => result.status === 'rejected')
                    .forEach((result) => {
                        console.error('Fetch goal tracking item error:', result.reason);
                    });

                reports.sort((left, right) => {
                    const leftDate = new Date(left.expiryDate || '9999-12-31').getTime();
                    const rightDate = new Date(right.expiryDate || '9999-12-31').getTime();
                    return leftDate - rightDate;
                });

                if (isMounted) {
                    setGoalTrackingItems(reports);
                }
            } catch (error) {
                console.error('Fetch goal tracking error:', error);
                if (isMounted) {
                    setGoalTrackingItems([]);
                }
            } finally {
                if (isMounted) {
                    setGoalTrackingLoading(false);
                }
            }
        };

        fetchGoalTracking();

        return () => {
            isMounted = false;
        };
    }, [currentUserDepartment, filters.departmentId, isFullAdmin, selectedDepartmentName]);

    return {
        loading,
        errorMessage,
        setErrorMessage,
        goalTrackingItems,
        goalTrackingLoading,
    };
};

export default useDashboardData;
