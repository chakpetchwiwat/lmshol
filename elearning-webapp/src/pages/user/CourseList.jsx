import React from 'react';
import { Filter, Grid, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CategorySearchModal from '../../components/common/CategorySearchModal';
import CategoryPills from '../../components/common/CategoryPills';
import CourseCard from '../../components/common/CourseCard';
import FilterSidebar from '../../components/common/FilterSidebar';
import SearchInput from '../../components/common/SearchInput';
import Skeleton from '../../components/common/Skeleton';
import { userAPI } from '../../utils/api';
import { FILTER_VALUES } from '../../utils/constants/filters';
import { filterCourses, sortCourses } from '../../utils/courseFilters';

const DEFAULT_SORT = 'newest';
const DEFAULT_STATUS = 'all';

const CourseList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlCategory = searchParams.get('category');

  const [courses, setCourses] = React.useState([]);
  const [categories, setCategories] = React.useState([]);

  const [activeCat, setActiveCat] = React.useState(urlCategory || FILTER_VALUES.ALL_LABEL);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [status, setStatus] = React.useState(searchParams.get('status') || DEFAULT_STATUS);
  const [sortBy, setSortBy] = React.useState(DEFAULT_SORT);

  const [loading, setLoading] = React.useState(true);
  const [showFilterModal, setShowFilterModal] = React.useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = React.useState(false);
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (urlCategory) {
      setActiveCat(urlCategory);
    }
  }, [urlCategory]);

  React.useEffect(() => {
    // Scroll to top of the main container when category changes
    if (!loading) {
      const scrollContainer = document.querySelector('.user-main');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [activeCat, loading]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, catRes] = await Promise.all([
          userAPI.getCourses(),
          userAPI.getCategories(),
        ]);

        setCourses(Array.isArray(coursesRes?.data) ? coursesRes.data : []);
        setCategories([
          { id: FILTER_VALUES.ALL, name: FILTER_VALUES.ALL_LABEL },
          ...(Array.isArray(catRes?.data) ? catRes.data : []),
        ]);
      } catch (error) {
        console.error('Fetch data error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = React.useMemo(() => {
    if (!Array.isArray(courses)) return [];

    return sortCourses(
      filterCourses(courses, { activeCat, searchQuery, status }),
      sortBy,
    );
  }, [courses, activeCat, searchQuery, status, sortBy]);

  const hasActiveFilters = activeCat !== FILTER_VALUES.ALL_LABEL || status !== DEFAULT_STATUS || sortBy !== DEFAULT_SORT;

  const resetAllFilters = () => {
    setActiveCat(FILTER_VALUES.ALL_LABEL);
    setSearchQuery('');
    setStatus(DEFAULT_STATUS);
    setSortBy(DEFAULT_SORT);
  };

  const handleBookmarkChange = (courseId, isBookmarked) => {
    setCourses((currentCourses) => (
      currentCourses.map((course) => (
        course.id === courseId ? { ...course, isBookmarked } : course
      ))
    ));
  };

  return (
    <div ref={scrollRef} className="relative flex flex-col gap-6 animate-fade-in pb-10 pt-2">
      <div className="sticky top-0 z-40 -mx-5 mb-2 space-y-3 border-b border-gray-100 bg-[#f8fafc]/95 px-5 pb-2 pt-5 shadow-sm backdrop-blur-md sm:space-y-4 sm:shadow-none md:top-[-1px] md:-mx-0 md:border-none md:px-0 md:pb-4 md:pt-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">คอร์สเรียนทั้งหมด</h2>
          <button
            type="button"
            onClick={() => setIsCatModalOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
          >
            หมวดหมู่ <Grid size={13} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="ค้นหาชื่อคอร์ส..."
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className="group relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:text-primary sm:h-12 sm:w-12"
          >
            <Filter size={20} className="group-hover:text-primary" />
            {hasActiveFilters ? (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" />
            ) : null}
          </button>
        </div>

        <div className="hidden md:block">
          <CategoryPills
            categories={categories}
            activeCat={activeCat}
            onSelect={setActiveCat}
            className="mt-1"
          />
        </div>
      </div>

      {loading ? (
        <div className="relative z-10 mb-10 mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton.CourseCard key={i} />
          ))}
        </div>
      ) : null}

      <div className="relative z-10 mb-10 mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {!loading && filtered.length > 0 ? (
          filtered.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => navigate(`/user/courses/${course.id}`)}
              onBookmarkChange={handleBookmarkChange}
              className="h-full w-full"
            />
          ))
        ) : null}

        {!loading && filtered.length === 0 ? (
          <div className="col-span-full flex w-full flex-col items-center justify-center rounded-[2rem] border border-dashed border-gray-300 bg-white py-16 text-center text-gray-400 shadow-sm">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
              <Search size={32} className="text-gray-400" strokeWidth={2} />
            </div>
            <h3 className="mb-1 text-lg font-bold text-gray-600">ไม่พบคอร์สที่ค้นหา</h3>
            <p className="text-sm text-gray-400">ลองเปลี่ยนคำค้นหา หรือปรับตัวกรองเพื่อดูคอร์สเพิ่มเติม</p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-6 rounded-full bg-primary/10 px-6 py-2 font-bold text-primary transition-colors hover:bg-primary hover:text-white"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : null}
      </div>

      <FilterSidebar
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        sortBy={sortBy}
        setSortBy={setSortBy}
        categories={categories}
        activeCat={activeCat}
        setActiveCat={setActiveCat}
        status={status}
        setStatus={setStatus}
        onReset={resetAllFilters}
      />

      <CategorySearchModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories.filter((category) => category.id !== FILTER_VALUES.ALL)}
        courses={courses}
        onSelect={(categoryName) => setActiveCat(categoryName)}
      />
    </div>
  );
};

export default CourseList;
