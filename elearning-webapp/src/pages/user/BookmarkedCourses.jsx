import React from 'react';
import { Bookmark, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CourseCard from '../../components/common/CourseCard';
import SearchInput from '../../components/common/SearchInput';
import Skeleton from '../../components/common/Skeleton';
import { userAPI } from '../../utils/api';

const BookmarkedCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = React.useState([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await userAPI.getBookmarkedCourses();
        setCourses(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        console.error('Fetch bookmarked courses error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const filteredCourses = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return courses;

    return courses.filter((course) => (
      course.title?.toLowerCase().includes(query) ||
      course.category?.name?.toLowerCase().includes(query)
    ));
  }, [courses, searchQuery]);

  const handleBookmarkChange = (courseId, isBookmarked) => {
    if (isBookmarked) return;
    setCourses((currentCourses) => currentCourses.filter((course) => course.id !== courseId));
  };

  return (
    <div className="relative flex flex-col gap-6 pb-10 pt-2 animate-fade-in">
      <div className="sticky top-0 z-40 -mx-5 mb-2 space-y-3 border-b border-gray-100 bg-[#f8fafc]/95 px-5 pb-2 pt-5 shadow-sm backdrop-blur-md sm:space-y-4 sm:shadow-none md:top-[-1px] md:-mx-0 md:border-none md:px-0 md:pb-4 md:pt-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">คอร์สที่บันทึก</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">รวมคอร์สที่คุณอยากกลับมาเรียนต่อภายหลัง</p>
          </div>
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 md:flex">
            <Bookmark size={22} fill="currentColor" />
          </div>
        </div>

        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="ค้นหาคอร์สที่บันทึก..."
        />
      </div>

      {loading ? (
        <div className="relative z-10 mb-10 mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton.CourseCard key={i} />
          ))}
        </div>
      ) : null}

      <div className="relative z-10 mb-10 mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {!loading && filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => navigate(`/user/courses/${course.id}`)}
              onBookmarkChange={handleBookmarkChange}
              className="h-full w-full"
            />
          ))
        ) : null}

        {!loading && filteredCourses.length === 0 ? (
          <div className="col-span-full flex w-full flex-col items-center justify-center rounded-[2rem] border border-dashed border-gray-300 bg-white py-16 text-center text-gray-400 shadow-sm">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-500">
              {courses.length === 0 ? <Bookmark size={32} strokeWidth={2.2} /> : <Search size={32} strokeWidth={2} />}
            </div>
            <h3 className="mb-1 text-lg font-bold text-gray-600">
              {courses.length === 0 ? 'ยังไม่มีคอร์สที่บันทึก' : 'ไม่พบคอร์สที่ค้นหา'}
            </h3>
            <p className="max-w-sm text-sm text-gray-400">
              {courses.length === 0
                ? 'กดไอคอนบันทึกบนคอร์สที่สนใจ แล้วคอร์สนั้นจะมาอยู่ที่นี่'
                : 'ลองเปลี่ยนคำค้นหาเพื่อดูคอร์สที่คุณบันทึกไว้'}
            </p>
            {courses.length === 0 ? (
              <button
                type="button"
                onClick={() => navigate('/user/courses')}
                className="mt-6 rounded-full bg-primary/10 px-6 py-2 font-bold text-primary transition-colors hover:bg-primary hover:text-white"
              >
                ไปดูคอร์สทั้งหมด
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BookmarkedCourses;
