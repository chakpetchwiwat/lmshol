import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MonitorPlay,
  FileText,
  Infinity as InfinityIcon,
  Award,
  BookOpen,
  Bookmark,
} from 'lucide-react';
import { userAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';

// Sub-components
import CourseHero from '../../components/user/CourseHero';
import CourseBenefits from '../../components/user/CourseBenefits';
import CourseDocumentList from '../../components/user/CourseDocumentList';
import CourseOutline from '../../components/user/CourseOutline';
import CourseInstructor from '../../components/user/CourseInstructor';
import CourseEnrollAside from '../../components/user/CourseEnrollAside';
import Skeleton from '../../components/common/Skeleton';

const tryParse = (value, fallback) => {
  try {
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [course, setCourse] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [enrolling, setEnrolling] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [showVideo, setShowVideo] = React.useState(false);
  const [bookmarking, setBookmarking] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await userAPI.getCourseDetails(id);
        setCourse(response.data);
      } catch (error) {
        console.error('Fetch course detail error:', error);
        setError(error.response?.data?.message || 'ไม่พบหลักสูตรที่คุณต้องการ หรือคุณไม่มีสิทธิ์เข้าถึงหลักสูตรนี้');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();

    let animationFrameId = null;
    const handleScroll = () => {
      if (animationFrameId !== null) return;

      animationFrameId = window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 150);
        animationFrameId = null;
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [id]);

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      await userAPI.enrollCourse(id);
      const response = await userAPI.getCourseDetails(id);
      setCourse(response.data);
      toast.success('ลงทะเบียนสำเร็จแล้ว!');
    } catch (error) {
      console.error('Enroll error:', error);
      toast.error(error.response?.data?.message || 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setEnrolling(false);
    }
  };

  const durationMinutes = React.useMemo(
    () => course?.lessons?.reduce((acc, lesson) => acc + (parseInt(lesson.duration, 10) || 0), 0) || 0,
    [course],
  );
  const durationHours = durationMinutes > 0 ? Math.max(1, Math.round((durationMinutes / 60) * 10) / 10) : 2;

  const learningPoints = React.useMemo(
    () => tryParse(course?.whatYouWillLearn, []),
    [course],
  );

  const whatYouGet = React.useMemo(
    () => tryParse(course?.whatYouWillGet, []),
    [course],
  );

  const benefitsIconMap = {
    video: MonitorPlay,
    file: FileText,
    infinite: InfinityIcon,
    award: Award,
    lesson: BookOpen,
  };

  const documentLessons = React.useMemo(
    () =>
      course?.lessons?.filter(
        (lesson) => lesson.type === 'pdf' || lesson.type === 'document',
      ) || [],
    [course],
  );

  const completionPoints = course?.completionPoints ?? course?.points ?? 0;
  const quizPoints = course?.quizPoints ?? (
    course?.lessons?.reduce((sum, lesson) => (
      lesson.type === 'quiz' ? sum + (lesson.points || 0) : sum
    ), 0) || 0
  );
  const totalRewardPoints = course?.totalPoints ?? (completionPoints + quizPoints);

  const handleReturnToCourseList = () => {
    navigate('/user/courses');
  };

  const handleBookmarkToggle = async () => {
    if (!course || bookmarking) return;

    const nextValue = !course.isBookmarked;
    setCourse((currentCourse) => ({ ...currentCourse, isBookmarked: nextValue }));
    setBookmarking(true);

    try {
      if (nextValue) {
        await userAPI.bookmarkCourse(course.id);
        toast.success('บันทึกคอร์สแล้ว');
      } else {
        await userAPI.unbookmarkCourse(course.id);
        toast.success('นำออกจากคอร์สที่บันทึกแล้ว');
      }
    } catch (error) {
      console.error('Bookmark course error:', error);
      setCourse((currentCourse) => ({ ...currentCourse, isBookmarked: !nextValue }));
      toast.error('อัปเดตคอร์สที่บันทึกไม่สำเร็จ');
    } finally {
      setBookmarking(false);
    }
  };

  if (loading) {
    return <Skeleton.CourseDetail />;
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 max-w-lg mx-auto mt-12">
        <div className="w-20 h-20 bg-red-50 rounded-[2.5rem] flex items-center justify-center text-red-500 mb-6 border border-red-100">
          <BookOpen size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">ไม่พบหลักสูตร</h2>
        <p className="text-slate-500 font-bold max-w-sm mb-8">
          {error || 'หลักสูตรนี้อาจไม่มีอยู่ หรือถูกยกเลิกการเผยแพร่ หรือคุณไม่มีสิทธิ์เข้าถึงหลักสูตรนี้'}
        </p>
        <button
          onClick={handleReturnToCourseList}
          className="px-8 py-3 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95"
        >
          กลับไปยังหน้ารายการคอร์ส
        </button>
      </div>
    );
  }

  return (
    <div className="relative -mx-6 -mt-6 flex min-h-full flex-col bg-slate-50 pb-20 md:mx-0 md:mt-0 md:pb-32">
      <button
        type="button"
        onClick={handleBookmarkToggle}
        disabled={bookmarking}
        aria-label={course.isBookmarked ? 'นำออกจากคอร์สที่บันทึก' : 'บันทึกคอร์สนี้'}
        aria-pressed={!!course.isBookmarked}
        className={`absolute right-4 top-6 z-30 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg transition-all active:scale-95 disabled:opacity-60 md:hidden ${
          course.isBookmarked
            ? 'border-amber-200 bg-amber-400 text-slate-950'
            : 'border-white/25 bg-slate-950/35 text-white backdrop-blur-md'
        }`}
      >
        <Bookmark size={19} fill={course.isBookmarked ? 'currentColor' : 'none'} strokeWidth={2.4} />
      </button>

      <CourseHero 
        course={course}
        totalRewardPoints={totalRewardPoints}
        completionPoints={completionPoints}
        quizPoints={quizPoints}
        durationHours={durationHours}
        onBack={handleReturnToCourseList}
      />

      <div className="relative z-20 mx-auto -mt-8 flex w-full max-w-[1450px] flex-col-reverse gap-6 px-4 sm:px-5 md:-mt-16 md:px-8 lg:flex-row lg:gap-10 xl:px-10 2xl:px-12">
        <div className="flex w-full flex-col gap-6 md:gap-8 lg:min-w-0 lg:flex-1">
          {learningPoints && learningPoints.length > 0 && (
            <CourseBenefits learningPoints={learningPoints} />
          )}

          <CourseDocumentList 
            course={course}
            documentLessons={documentLessons}
            onNavigate={navigate}
          />

          <CourseOutline 
            course={course}
            onNavigate={navigate}
          />

          <CourseInstructor course={course} />
        </div>

        <CourseEnrollAside 
          course={course}
          enrolling={enrolling}
          showVideo={showVideo}
          setShowVideo={setShowVideo}
          isScrolled={isScrolled}
          onEnroll={handleEnroll}
          onNavigate={navigate}
          totalRewardPoints={totalRewardPoints}
          completionPoints={completionPoints}
          quizPoints={quizPoints}
          whatYouGet={whatYouGet}
          benefitsIconMap={benefitsIconMap}
        />
      </div>
    </div>
  );
};

export default CourseDetail;
