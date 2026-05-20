import React from 'react';
import { PlayCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../../utils/api';
import { filterVisibleGoals, filterVisibleTimedItems, formatThaiFullDate } from '../../utils/dateUtils';
import CategorySearchModal from '../../components/common/CategorySearchModal';
import CourseCard from '../../components/common/CourseCard';
import AnnouncementCard from '../../components/common/AnnouncementCard';
import SectionHeader from '../../components/common/SectionHeader';
import CategoryPills from '../../components/common/CategoryPills';

// Sub-components
import HomeHero from '../../components/user/HomeHero';
import Skeleton from '../../components/common/Skeleton';
import MobileContinueCTA from '../../components/user/MobileContinueCTA';
import HomeActivities from '../../components/user/HomeActivities';
import HomeRewards from '../../components/user/HomeRewards';
import { ENROLLMENT_STATUS } from '../../utils/constants/statuses';

const Home = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = React.useState([]);
  const [announcements, setAnnouncements] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState(null);
  const [points, setPoints] = React.useState(0);
  const [activeGoals, setActiveGoals] = React.useState([]);
  const [pointsLoading, setPointsLoading] = React.useState(true);
  const [isCatModalOpen, setIsCatModalOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        setUser(userData);

        const [courseRes, catRes, pointsRes, goalsRes, announcementRes] = await Promise.all([
          userAPI.getCourses(),
          userAPI.getCategories(),
          userAPI.getPoints(),
          userAPI.getGoals(),
          userAPI.getAnnouncements(),
        ]);
        const referenceDate = new Date();
        const visibleCourses = filterVisibleTimedItems(courseRes?.data, referenceDate);
        const visibleCategories = filterVisibleTimedItems(catRes?.data, referenceDate);
        const visibleGoals = filterVisibleGoals(goalsRes?.data, referenceDate);
        const visibleAnnouncements = filterVisibleTimedItems(announcementRes?.data, referenceDate);

        setCourses(visibleCourses);
        setAnnouncements(visibleAnnouncements);
        setCategories(visibleCategories);
        setPoints(pointsRes?.data?.balance || 0);
        setActiveGoals(visibleGoals);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
        setPointsLoading(false);
      }
    };
    fetchData();
  }, []);

  const continueCourse = React.useMemo(() => {
    if (!Array.isArray(courses)) return null;
    return courses.find(c => c.isEnrolled && c.enrollmentStatus === ENROLLMENT_STATUS.IN_PROGRESS);
  }, [courses]);

  const categorizedCourses = React.useMemo(() => {
    if (!Array.isArray(categories) || !Array.isArray(courses)) return [];
    return categories.map(cat => ({
      ...cat,
      courses: courses.filter(c => c.categoryId === cat.id)
    })).filter(cat => cat.courses.length > 0);
  }, [categories, courses]);

  const uncategorized = React.useMemo(() => {
    if (!Array.isArray(courses)) return [];
    return courses.filter(c => !c.categoryId);
  }, [courses]);

  const goalsProgress = React.useMemo(() => {
    if (!Array.isArray(activeGoals) || !Array.isArray(courses)) return [];

    return activeGoals.map(goal => {
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
        id: goal.id,
        current: completed.length,
        target: goal.targetCount,
        title: goal.title,
        scope: goal.scope,
        deptName: goal.department?.name
      };
    });
  }, [activeGoals, courses]);

  if (loading) {
    return <Skeleton.Home />;
  }

  return (
    <div className="flex flex-col gap-8 md:gap-12 animate-fade-in pt-0 md:pt-4 pb-16">
      <HomeHero
        user={user}
        courses={courses}
        points={points}
        pointsLoading={pointsLoading}
        continueCourse={continueCourse}
        onNavigate={navigate}
      />

      <MobileContinueCTA
        continueCourse={continueCourse}
        onNavigate={navigate}
      />

      {announcements.length > 0 && (
        <section className="animate-slide-up space-y-5" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between px-1 md:px-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Department Announcements</p>
              <h3 className="mt-1 text-xl md:text-2xl font-bold tracking-tight text-slate-900">ประกาศล่าสุดของแผนกคุณ</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onClick={() => navigate(`/user/announcements/${announcement.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-5 px-1 md:px-2">
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">คุณสนใจเรื่องไหน?</h3>
            <button
              type="button"
              onClick={() => setIsCatModalOpen(true)}
              className="text-xs md:text-sm font-semibold text-primary hover:underline flex items-center gap-1"
            >
              ดูหมวดหมู่ทั้งหมด <ChevronRight size={14} />
            </button>
          </div>
          <div className="-mx-5 md:mx-0">
            <CategoryPills
              categories={categories.slice(0, 6)}
              activeCat={''}
              onSelect={(catName) => navigate(`/user/courses?category=${encodeURIComponent(catName)}`)}
            />
          </div>
        </div>
      )}

      <HomeActivities
        courses={courses}
        goalsProgress={goalsProgress}
        onNavigate={navigate}
      />

      <HomeRewards
        onNavigate={navigate}
      />

      <div className="space-y-16 md:space-y-24 mt-4">
        {categorizedCourses.map((category, idx) => (
          <section key={category.id} className="animate-slide-up" style={{ animationDelay: `${500 + idx * 100}ms` }}>
            <SectionHeader
              title={category.name}
              badgeText={category.isTemporary ? `เข้าดูได้ถึง · ${formatThaiFullDate(category.expiredAt)}` : ''}
              onViewAll={() => navigate(`/user/courses?category=${encodeURIComponent(category.name)}`)}
            />
            <div className="grid grid-flow-col auto-cols-[minmax(300px,1fr)] md:grid-flow-row md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8 overflow-x-auto md:overflow-visible pb-10 md:pb-4 no-scrollbar -mx-5 px-5 md:mx-0 md:px-0 snap-x md:snap-none items-stretch">
              {category.courses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onClick={() => navigate(`/user/courses/${course.id}`)}
                  className="snap-center md:snap-none"
                />
              ))}
            </div>
          </section>
        ))}

        {uncategorized.length > 0 && (
          <section className="animate-slide-up" style={{ animationDelay: '800ms' }}>
            <SectionHeader title="คอร์สแนะนำสำหรับคุณ" showViewAll={false} />
            <div className="grid grid-flow-col auto-cols-[minmax(300px,1fr)] md:grid-flow-row md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8 overflow-x-auto md:overflow-visible pb-10 md:pb-4 no-scrollbar -mx-5 px-5 md:mx-0 md:px-0 snap-x md:snap-none items-stretch">
              {uncategorized.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onClick={() => navigate(`/user/courses/${course.id}`)}
                  className="snap-center md:snap-none"
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {courses.length === 0 && (
        <div className="bg-white rounded-[2.5rem] p-20 text-center shadow-sm border border-slate-100 flex flex-col items-center">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
            <PlayCircle size={40} className="text-slate-300" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">ยังไม่มีคอร์สเรียนในระบบ</h3>
          <p className="text-slate-400 font-medium">รอการอัปเดตคอร์สดีๆ เร็วๆ นี้</p>
        </div>
      )}

      <CategorySearchModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories}
        courses={courses}
        onSelect={(catName) => navigate(`/user/courses?category=${encodeURIComponent(catName)}`)}
      />
    </div>
  );
};

export default Home;
