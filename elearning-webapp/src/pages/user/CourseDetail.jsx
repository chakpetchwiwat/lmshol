import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MonitorPlay,
  FileText,
  Infinity as InfinityIcon,
  Award,
  BookOpen,
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
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const response = await userAPI.getCourseDetails(id);
        setCourse(response.data);
      } catch (error) {
        console.error('Fetch course detail error:', error);
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

  const durationMinutes = useMemo(
    () => course?.lessons?.reduce((acc, lesson) => acc + (parseInt(lesson.duration, 10) || 0), 0) || 0,
    [course],
  );
  const durationHours = durationMinutes > 0 ? Math.max(1, Math.round((durationMinutes / 60) * 10) / 10) : 2;

  const learningPoints = useMemo(
    () =>
      tryParse(course?.whatYouWillLearn, [
        'เข้าใจภาพรวมของเนื้อหาและนำไปใช้ต่อยอดในการทำงานได้จริง',
        'มีแนวคิดและขั้นตอนที่ชัดเจนสำหรับลงมือทำด้วยตัวเอง',
        'ได้ตัวอย่างและเทคนิคที่ช่วยให้ทำงานได้เร็วและแม่นยำขึ้น',
        'พร้อมประยุกต์ใช้ความรู้กับสถานการณ์จริงในองค์กร',
      ]),
    [course],
  );

  const whatYouGet = useMemo(
    () =>
      tryParse(course?.whatYouWillGet, [
        { icon: 'video', text: `วิดีโอคุณภาพสูง ความยาวรวมประมาณ ${durationHours} ชั่วโมง` },
        { icon: 'file', text: 'เอกสารประกอบการเรียนสำหรับทบทวนหลังเรียน' },
        { icon: 'infinite', text: 'เข้าถึงเนื้อหาได้ตลอดตามสิทธิ์ของหลักสูตร' },
        { icon: 'award', text: 'ใบรับรองเมื่อเรียนครบตามเงื่อนไขของหลักสูตร' },
      ]),
    [course, durationHours],
  );

  const benefitsIconMap = {
    video: MonitorPlay,
    file: FileText,
    infinite: InfinityIcon,
    award: Award,
    lesson: BookOpen,
  };

  const documentLessons = useMemo(
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

  if (loading || !course) {
    return <Skeleton.CourseDetail />;
  }

  return (
    <div className="relative -mx-6 -mt-6 flex min-h-full flex-col bg-slate-50 pb-20 md:mx-0 md:mt-0 md:pb-32">
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
          <CourseBenefits learningPoints={learningPoints} />

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
