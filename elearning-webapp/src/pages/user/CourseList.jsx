import React, { useState, useEffect } from 'react';
import { Search, Filter, Grid } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { userAPI } from '../../utils/api';
import { filterCourses, sortCourses } from '../../utils/courseFilters';
import CategorySearchModal from '../../components/common/CategorySearchModal';
import CourseCard from '../../components/common/CourseCard';
import SearchInput from '../../components/common/SearchInput';
import CategoryPills from '../../components/common/CategoryPills';
import FilterSidebar from '../../components/common/FilterSidebar';
import { FILTER_VALUES } from '../../utils/constants/filters';

const CourseList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlCategory = searchParams.get('category');
  
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Filter & Search State
  const [activeCat, setActiveCat] = useState(urlCategory || FILTER_VALUES.ALL_LABEL);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'a-z'
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  useEffect(() => {
    if (urlCategory) {
      setActiveCat(urlCategory);
    }
  }, [urlCategory]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, catRes] = await Promise.all([
          userAPI.getCourses(),
          userAPI.getCategories(),
        ]);
        setCourses(Array.isArray(coursesRes?.data) ? coursesRes.data : []);
        setCategories([
          { id: FILTER_VALUES.ALL, name: FILTER_VALUES.ALL_LABEL }, 
          ...(Array.isArray(catRes?.data) ? catRes.data : [])
        ]);
      } catch (error) {
        console.error('Fetch data error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute Filtered and Sorted Array with safety checks
  const filtered = React.useMemo(() => {
    if (!Array.isArray(courses)) return [];
    
    return sortCourses(
      filterCourses(courses, { activeCat, searchQuery, status }),
      sortBy
    );
  }, [courses, activeCat, searchQuery, status, sortBy]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pt-2 relative pb-10">
      <div className="sticky top-0 md:top-[-1px] z-40 -mx-5 px-5 md:-mx-0 md:px-0 bg-[#f8fafc]/95 backdrop-blur-md pt-5 md:pt-3 pb-2 md:pb-4 space-y-3 sm:space-y-4 shadow-sm sm:shadow-none border-b border-gray-100 sm:border-none mb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">คอร์สเรียนทั้งหมด</h2>
          <button 
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
            onClick={() => setShowFilterModal(true)}
            className="group relative flex h-[46px] w-[46px] sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:text-primary"
          >
            <Filter size={20} className="group-hover:text-primary" />
            {(activeCat !== FILTER_VALUES.ALL_LABEL || sortBy !== 'newest') && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full"></span>
            )}
          </button>
        </div>

        {/* Categories Horizontal Scroll - Desktop Only */}
        <div className="hidden md:block">
          <CategoryPills 
            categories={categories}
            activeCat={activeCat}
            onSelect={setActiveCat}
            onViewAll={() => setIsCatModalOpen(true)}
            className="mt-1"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Course List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4 mb-10 relative z-10">
        {!loading && filtered.length > 0 ? (
          filtered.map(course => (
            <CourseCard 
              key={course.id} 
              course={course} 
              onClick={() => navigate(`/user/courses/${course.id}`)}
              className="w-full h-full"
            />
          ))
        ) : !loading && (
          <div className="col-span-full text-center py-16 flex flex-col items-center justify-center text-gray-400 bg-white rounded-[2rem] border border-dashed border-gray-300 shadow-sm w-full">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
               <Search size={32} className="text-gray-400" strokeWidth={2} />
            </div>
            <h3 className="font-bold text-gray-600 text-lg mb-1">ไม่พบคอร์สที่ค้นหา</h3>
            <p className="text-sm text-gray-400">ลองเปลี่ยนคำค้นหา หรือใช้ตัวกรองหมวดหมู่อื่นดูสิ</p>
            <button 
              onClick={() => { setSearchQuery(''); setActiveCat(FILTER_VALUES.ALL_LABEL); setStatus('all'); setSortBy('newest'); }}
              className="mt-6 px-6 py-2 bg-primary/10 text-primary font-bold rounded-full hover:bg-primary hover:text-white transition-colors"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Filter Sidebar */}
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
        onReset={() => { setActiveCat(FILTER_VALUES.ALL_LABEL); setSearchQuery(''); setStatus('all'); setSortBy('newest'); }}
      />

      {/* Categories Search Modal */}
      <CategorySearchModal 
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories.filter(c => c.id !== FILTER_VALUES.ALL)}
        courses={courses}
        onSelect={(catName) => setActiveCat(catName)}
      />
    </div>
  );
};

export default CourseList;
