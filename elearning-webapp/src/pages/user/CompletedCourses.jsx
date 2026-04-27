import React from 'react';
import { Search, CheckCircle2, ArrowRight, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../../utils/api';
import CourseCard from '../../components/common/CourseCard';
import Skeleton from '../../components/common/Skeleton';
import { ENROLLMENT_STATUS } from '../../utils/constants/statuses';

const CompletedCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await userAPI.getCourses();
        const coursesData = Array.isArray(response?.data) ? response.data : [];
        setCourses(coursesData.filter((course) => course.enrollmentStatus === ENROLLMENT_STATUS.COMPLETED));
      } catch (error) {
        console.error('Fetch completed courses error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCourses = React.useMemo(() => {
    if (!Array.isArray(courses)) return [];
    return courses.filter((course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courses, searchQuery]);

  return (
    <div className="flex h-full flex-col gap-8 pb-24 pt-2 animate-fade-in md:pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 mesh-bg-premium p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)] md:rounded-[2.75rem] md:p-8">
        <div className="absolute right-0 top-0 h-full w-1/3 overflow-hidden opacity-40">
          <div className="absolute right-[-10%] top-[-10%] h-[150%] w-[150%] rounded-full bg-gradient-to-br from-success/20 via-primary/10 to-transparent blur-[100px]"></div>
        </div>

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-success-border bg-success-bg px-4 py-1.5 text-[12px] font-black tracking-[0.04em] text-success-text">
              <Trophy size={14} />
              สำเร็จแล้ว
            </div>
            <h1 className="mb-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              คอร์สที่คุณเรียนจบ
            </h1>
            <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-600 md:text-base">
              รวมผลงานการเรียนรู้ทั้งหมดไว้ในที่เดียว เพื่อย้อนกลับไปทบทวนบทเรียนที่สำเร็จแล้วและติดตามพัฒนาการของคุณ
            </p>
          </div>

          <div className="glass-card flex min-w-[180px] flex-col rounded-[1.75rem] p-5 text-left ring-1 ring-slate-900/5">
            <span className="text-[11px] font-bold tracking-[0.04em] text-slate-600">คอร์สที่สำเร็จ</span>
            <span className="mt-2 text-4xl font-black tracking-tighter text-slate-900">{courses.length}</span>
            <span className="mt-1 text-sm font-medium text-slate-600">พร้อมกลับไปทบทวนได้ทุกเมื่อ</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 md:text-xl">ค้นหาคอร์สที่เคยเรียนจบ</h2>
            <p className="text-sm font-medium text-slate-500">พิมพ์ชื่อคอร์สเพื่อค้นหาและกลับเข้าไปดูรายละเอียดได้ทันที</p>
          </div>

          <div className="relative w-full md:max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="ค้นหาจากชื่อคอร์สที่เรียนจบแล้ว"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3.5 pl-11 pr-4 text-[15px] font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <Skeleton.List count={4} />
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <CheckCircle2 size={30} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black tracking-tight text-slate-900">ยังไม่มีคอร์สที่เรียนจบ</h3>
            <p className="mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-500">
              เริ่มเรียนคอร์สแรกของคุณ แล้วกลับมาสะสมผลงานที่หน้านี้ได้ทันทีเมื่อเรียนจบ
            </p>
            <button
              type="button"
              onClick={() => navigate('/user/courses')}
              className="btn btn-primary mt-6 rounded-full px-6"
            >
              ไปดูคอร์สทั้งหมด <ArrowRight size={16} />
            </button>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <Search size={28} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-black tracking-tight text-slate-900">ไม่พบคอร์สที่ตรงกับคำค้นหา</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">ลองค้นหาด้วยชื่อคอร์สหรือคำที่สั้นลงอีกนิด</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 pb-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => navigate(`/user/courses/${course.id}`)}
                variant="completed"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CompletedCourses;
