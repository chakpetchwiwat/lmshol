import React, { useEffect, useRef, useState } from 'react';
import { BellRing, CalendarClock, CheckCircle, Clock, FileText, Play, BookOpen } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFullUrl, userAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';
import DocViewer from '../../components/common/DocViewer';
import LessonMedia from '../../components/user/LessonMedia';
import QuizSection from '../../components/user/QuizSection';
import { hasRenderableLessonContent, sanitizeLessonContent } from '../../utils/richText';
import { formatThaiDateTime } from '../../utils/dateUtils';

const getTypeLabel = (type) => {
  if (type === 'quiz') return 'แบบทดสอบ';
  if (type === 'video') return 'วิดีโอ';
  if (type === 'article') return 'บทความ';
  if (type === 'pdf' || type === 'document') return 'เอกสาร';
  return 'เนื้อหา';
};

const AnnouncementPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [documentAccess, setDocumentAccess] = useState(null);
  const [openingDocument, setOpeningDocument] = useState(false);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);
  const [shouldScrollToQuizResult, setShouldScrollToQuizResult] = useState(false);

  const quizResultRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        setLoading(true);
        setAnswers({});
        setQuizResult(null);
        setShowDocViewer(false);
        setDocumentAccess(null);
        setIsNavigatingAway(false);

        const response = await userAPI.getAnnouncementDetails(id);
        const detail = response.data;

        if (detail?.type === 'quiz') {
          const questionRes = await userAPI.getAnnouncementQuestions(id);
          detail.questions = questionRes.data;
        }

        setAnnouncement(detail);
      } catch (error) {
        console.error('Fetch announcement detail error:', error);
        toast.error('ไม่สามารถโหลดประกาศนี้ได้');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, [id, toast]);

  useEffect(() => {
    if (!shouldScrollToQuizResult || !quizResult) return;

    window.requestAnimationFrame(() => {
      quizResultRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      setShouldScrollToQuizResult(false);
    });
  }, [quizResult, shouldScrollToQuizResult]);

  const handleReturn = () => {
    setShowDocViewer(false);
    setIsNavigatingAway(true);
    window.requestAnimationFrame(() => navigate('/user/courses'));
  };

  const handleScrollToContent = () => {
    contentRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const requestDocumentAccess = async () => {
    if (openingDocument) return '';

    try {
      setOpeningDocument(true);
      const response = await userAPI.getAnnouncementDocumentAccess(id);
      const accessUrl = response?.data?.accessUrl || response?.accessUrl || '';

      if (!accessUrl) {
        throw new Error('Document access URL was not returned');
      }

      setDocumentAccess({
        accessUrl,
        fileName: response?.data?.fileName || response?.fileName || '',
        viewerType: response?.data?.viewerType || response?.viewerType || '',
        extension: response?.data?.extension || response?.extension || '',
      });

      return accessUrl;
    } catch (error) {
      console.error('Fetch announcement document access error:', error);
      toast.error('ไม่สามารถเปิดเอกสารประกาศได้');
      return '';
    } finally {
      setOpeningDocument(false);
    }
  };

  const handleOpenDocument = async () => {
    const accessUrl = await requestDocumentAccess();
    if (accessUrl) {
      setShowDocViewer(true);
    }
  };

  const handleQuizSubmit = async () => {
    if (Object.keys(answers).length < (announcement?.questions?.length || 0)) {
      toast.warning('กรุณาตอบคำถามให้ครบทุกข้อ');
      return;
    }

    try {
      setUpdating(true);
      const response = await userAPI.submitAnnouncementQuiz(id, { answers });
      setQuizResult(response.data);
      setShouldScrollToQuizResult(true);
    } catch (error) {
      console.error('Submit announcement quiz error:', error);
      toast.error('ส่งคำตอบไม่สำเร็จ');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !announcement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-r-2 border-primary border-r-transparent" />
      </div>
    );
  }

  const announcementMediaUrl = getFullUrl(announcement.contentUrl?.trim());
  const contentHtml = sanitizeLessonContent(announcement.content);
  const hasContent = hasRenderableLessonContent(announcement.content);

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-white pb-12 md:bg-transparent md:px-4 md:py-6">
      <LessonMedia
        lesson={announcement}
        isNavigatingAway={isNavigatingAway}
        lessonMediaUrl={announcementMediaUrl}
        handleComplete={() => Promise.resolve(true)}
        handleReturnToCourse={handleReturn}
        handleOpenDocument={handleOpenDocument}
        openingDocument={openingDocument}
        hasProtectedDocument={announcement.hasDocument}
        onScrollToContent={handleScrollToContent}
      />

      {showDocViewer && documentAccess?.accessUrl && (
        <DocViewer
          url={documentAccess.accessUrl}
          fileName={documentAccess.fileName}
          viewerType={documentAccess.viewerType}
          extension={documentAccess.extension}
          title={announcement.title}
          onClose={() => setShowDocViewer(false)}
          onComplete={() => Promise.resolve(true)}
          isCompleted={false}
          onRefreshUrl={requestDocumentAccess}
          onReturnToCourse={handleReturn}
        />
      )}

      <div className="bg-white md:mt-8 md:overflow-hidden md:rounded-[3.5rem] md:border md:border-slate-100 md:shadow-[0_40px_100px_-20px_rgba(15,23,42,0.1)]">
        <div className="px-6 py-10 md:p-14">
          <div className="mb-6 flex flex-col gap-6 md:mb-10" ref={contentRef}>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black tracking-[0.04em] text-amber-700">
                <BellRing size={14} />
                ประกาศแผนก
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-primary/10 bg-primary/5 px-3 py-2 text-xs font-black tracking-[0.04em] text-primary">
                {announcement.type === 'video' ? <Play size={14} fill="currentColor" /> :
                  announcement.type === 'quiz' ? <CheckCircle size={14} /> :
                  announcement.type === 'article' ? <BookOpen size={14} /> :
                  <FileText size={14} />}
                {getTypeLabel(announcement.type)}
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-black tracking-[0.04em] text-slate-600">
                <Clock size={14} />
                {announcement.duration || '10'}m
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-black tracking-[0.04em] text-slate-600">
                <CalendarClock size={14} />
                หมดอายุ {announcement.expiredAt ? formatThaiDateTime(announcement.expiredAt, true) : 'ไม่กำหนด'}
              </span>
            </div>

            <div>
              <h1 className="text-[22px] font-black leading-[1.2] tracking-tight text-slate-900 md:text-3xl lg:text-4xl">
                {announcement.title}
              </h1>
              <p className="mt-4 text-sm font-bold text-amber-700">
                สำหรับแผนก {announcement.department?.name || 'ของคุณ'}
              </p>
              {announcement.description && (
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-500">
                  {announcement.description}
                </p>
              )}
            </div>
          </div>

          <div className="mb-6 h-px w-full bg-slate-100 md:mb-12" />

          {announcement.type === 'quiz' ? (
            <QuizSection
              lesson={announcement}
              answers={answers}
              setAnswers={setAnswers}
              quizResult={quizResult}
              setQuizResult={setQuizResult}
              quizResultRef={quizResultRef}
              handleQuizSubmit={handleQuizSubmit}
              updating={updating}
              canEarnQuizPoints={false}
              quizRewardPoints={0}
            />
          ) : (
            <div className="rich-text-content rounded-[2rem] border border-slate-100 bg-slate-50/70 px-6 py-7 text-[1.05rem] text-slate-700 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.2)] md:px-8 md:py-9 md:text-[1.1rem]">
              {hasContent ? (
                <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
              ) : (
                <p className="font-medium text-slate-500">ประกาศนี้ไม่มีเนื้อหาเพิ่มเติม</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPlayer;
