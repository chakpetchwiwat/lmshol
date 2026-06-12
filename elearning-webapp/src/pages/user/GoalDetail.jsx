import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Target, ArrowLeft, Calendar, BookOpen, CheckCircle2, Clock } from 'lucide-react';
import { userAPI } from '../../utils/api';
import Skeleton from '../../components/common/Skeleton';
import { formatThaiDateTime } from '../../utils/dateUtils';
import CourseCard from '../../components/common/CourseCard';
import { ENROLLMENT_STATUS } from '../../utils/constants/statuses';

const GoalDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [goal, setGoal] = React.useState(null);
    const [courses, setCourses] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const fetchDetails = async () => {
            try {
                const [goalRes, coursesRes] = await Promise.all([
                    userAPI.getGoalDetails(id),
                    userAPI.getCourses()
                ]);
                setGoal(goalRes.data);
                setCourses(Array.isArray(coursesRes?.data) ? coursesRes.data : []);
            } catch (err) {
                console.error("Failed to fetch goal details", err);
                setError('ไม่พบเป้าหมายที่คุณต้องการ หรือคุณไม่มีสิทธิ์เข้าถึง');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const progress = React.useMemo(() => {
        if (!goal || !courses.length) return { current: 0, target: 1, completedCourses: [] };

        const windowStart = new Date(goal.createdAt);
        const windowEnd = goal.expiryDate ? new Date(goal.expiryDate) : new Date(2100, 0, 1);

        let completed;
        if (goal.type === 'ANY') {
            completed = courses.filter(c => 
                c.enrollmentStatus === ENROLLMENT_STATUS.COMPLETED && 
                c.completedAt && 
                new Date(c.completedAt) >= windowStart && 
                new Date(c.completedAt) <= windowEnd
            );
        } else {
            const specificIds = goal.courses.map(gc => gc.courseId);
            completed = courses.filter(c => 
                specificIds.includes(c.id) &&
                c.enrollmentStatus === ENROLLMENT_STATUS.COMPLETED && 
                c.completedAt && 
                new Date(c.completedAt) >= windowStart && 
                new Date(c.completedAt) <= windowEnd
            );
        }

        return {
            current: completed.length,
            target: goal.targetCount,
            completedCourses: completed
        };
    }, [goal, courses]);

    if (loading) {
        return <Skeleton.List count={4} />;
    }

    if (error || !goal) {
        return (
            <div className="p-8 text-center bg-white rounded-3xl mt-8">
                <p className="text-slate-500 font-bold mb-4">{error}</p>
                <button onClick={() => navigate('/user/home')} className="btn btn-primary">กลับไปหน้าหลัก</button>
            </div>
        );
    }

    const uncompletedSpecificCourses = goal.type === 'SPECIFIC' 
        ? goal.courses.filter(gc => !progress.completedCourses.find(c => c.id === gc.courseId))
            .map(gc => courses.find(c => c.id === gc.courseId) || gc.course)
        : [];

    const isSuccess = progress.current >= progress.target;

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-16">
            {/* Header / Hero */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden text-white -mx-5 md:mx-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.15),transparent_40%)] pointer-events-none"></div>
                
                <button 
                    onClick={() => navigate('/user/home')}
                    className="relative z-10 flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm font-bold uppercase tracking-widest"
                >
                    <ArrowLeft size={16} /> กลับ
                </button>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start justify-between">
                    <div className="flex-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border mb-4 ${goal.scope === 'DEPARTMENT' ? 'border-amber-400/30 text-amber-300 bg-amber-400/10' : 'border-blue-400/30 text-blue-300 bg-blue-400/10'}`}>
                            เป้าหมาย: {goal.scope === 'DEPARTMENT' ? 'กอง ' + (goal.department?.name || '') : 'องค์กร'}
                        </span>
                        <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">{goal.title}</h1>
                        <p className="text-slate-400 text-lg md:max-w-2xl">
                            {goal.type === 'ANY' 
                                ? `เรียนจบยคอร์สใดก็ได้จำนวน ${goal.targetCount} คอร์ส` 
                                : `เรียนจบคอร์สที่กำหนดจำนวน ${goal.targetCount} คอร์ส`}
                        </p>
                    </div>

                    <div className="shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 w-full md:w-64">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">ความสำเร็จ</span>
                            {isSuccess ? (
                                <CheckCircle2 size={20} className="text-emerald-400" />
                            ) : (
                                <Clock size={20} className="text-blue-400" />
                            )}
                        </div>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-4xl font-black text-white">{progress.current}</span>
                            <span className="text-xl font-bold text-slate-400">/ {progress.target}</span>
                        </div>
                        <div className="relative w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
                             <div 
                                className={`h-full transition-all duration-1000 ${isSuccess ? 'bg-emerald-400' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(100, (progress.current / progress.target) * 100)}%` }}
                             />
                        </div>
                        {isSuccess && (
                            <p className="text-[10px] font-bold text-emerald-400 text-center uppercase tracking-widest mt-2 animate-pulse">ทำสำเร็จแล้ว ยินดีด้วย!</p>
                        )}
                    </div>
                </div>

                {goal.expiryDate && (
                    <div className="relative z-10 mt-8 flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 w-fit px-4 py-2 rounded-xl backdrop-blur-sm border border-white/5">
                        <Calendar size={16} className="text-amber-400" />
                        หมดเขต: {formatThaiDateTime(goal.expiryDate)}
                    </div>
                )}
            </div>

            {/* Course Lists */}
            <div className="space-y-8 mt-4">
                {goal.type === 'SPECIFIC' ? (
                    <>
                        {/* Courses to do */}
                        {!isSuccess && uncompletedSpecificCourses.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                                    <BookOpen size={24} className="text-primary" /> คอร์สที่ยังต้องเรียน
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                    {uncompletedSpecificCourses.map(course => (
                                        <CourseCard 
                                            key={course.id} 
                                            course={course} 
                                            onClick={() => navigate(`/user/courses/${course.id}`)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completed Specific Courses */}
                        {progress.completedCourses.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-emerald-600">
                                    <CheckCircle2 size={24} /> เรียนจบแล้ว ({progress.completedCourses.length})
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 opacity-75">
                                    {progress.completedCourses.map(course => (
                                        <CourseCard 
                                            key={course.id} 
                                            course={course} 
                                            onClick={() => navigate(`/user/courses/${course.id}`)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-8 text-center text-blue-800">
                            <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                            <h3 className="text-xl font-black mb-2">เลือกเรียนคอร์สใดก็ได้ตามใจคุณ</h3>
                            <p className="text-sm font-medium opacity-80 mb-6">คุณสามารถคลิปไปที่หน้าหลักเพื่อเลือกคอร์สที่สนใจ และเมื่อเรียนจบระบบจะนับเข้าร่วมเป้าหมายนี้ให้อัตโนมัติ</p>
                            <button onClick={() => navigate('/user/courses')} className="btn btn-primary px-8">ไปหน้าเลือกคอร์สเรียน</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GoalDetail;
