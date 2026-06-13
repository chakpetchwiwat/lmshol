import React from 'react';
import { Users, Droplet, Flame, BookOpen, Search, Award, RefreshCw, X, Calendar, Landmark, CheckCircle2 } from 'lucide-react';
import { userAPI, getFullUrl } from '../../utils/api';
import { useToast } from '../../context/useToast';
import Skeleton from '../../components/common/Skeleton';

const ShepherdDashboard = () => {
  const toast = useToast();
  const [sheepList, setSheepList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [search, setSearch] = React.useState('');
  
  // Detail Modal state
  const [selectedSheep, setSelectedSheep] = React.useState(null);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [sheepDetails, setSheepDetails] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('courses');

  const fetchSheep = React.useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      const response = await userAPI.getMySheep();
      setSheepList(response.data || []);
    } catch (error) {
      console.error('Fetch sheep error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลลูกแกะได้');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchSheep();
  }, [fetchSheep]);

  const handleViewDetails = async (sheepId) => {
    try {
      setSelectedSheep(sheepList.find(s => s.id === sheepId));
      setDetailsLoading(true);
      setSheepDetails(null);
      setActiveTab('courses');
      
      const response = await userAPI.getSheepDetails(sheepId);
      setSheepDetails(response.data);
    } catch (error) {
      console.error('Fetch sheep details error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลรายละเอียดได้');
      setSelectedSheep(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredSheep = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sheepList;
    return sheepList.filter(s => 
      s.name.toLowerCase().includes(query) || 
      (s.nickname && s.nickname.toLowerCase().includes(query)) ||
      s.email.toLowerCase().includes(query)
    );
  }, [search, sheepList]);

  if (loading) {
    return (
      <div className="py-6 space-y-6">
        <div className="h-10 w-48 rounded bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pt-0 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">ลูกแกะของฉัน (Shepherd Dashboard)</h2>
          <p className="text-sm text-slate-500 font-medium">ติดตามดูการเติบโต การเรียนรู้ และเป้าหมายฝ่ายวิญญาณของลูกแกะที่คุณดูแล</p>
        </div>
        <button
          type="button"
          onClick={() => fetchSheep(true)}
          disabled={refreshing}
          className="btn btn-outline btn-sm self-start sm:self-auto flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
        </button>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            className="form-input pl-10 w-full"
            placeholder="ค้นหาตามชื่อ, ชื่อเล่น, หรืออีเมล..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        <div className="w-full sm:w-auto text-left sm:text-right sm:ml-auto text-xs text-slate-400 font-bold uppercase tracking-wider">
          พบลูกแกะทั้งหมด {filteredSheep.length} คน
        </div>
      </div>

      {/* Main List */}
      {filteredSheep.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSheep.map((sheep) => (
            <div
              key={sheep.id}
              className="card group border border-slate-100 bg-white p-5 transition-all duration-300 hover:border-indigo-100 hover:shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-12 w-12 shrink-0 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shadow-sm">
                    {sheep.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-black text-slate-800 leading-tight truncate">
                      {sheep.name} {sheep.nickname && sheep.nickname !== '-' ? `(${sheep.nickname})` : ''}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">{sheep.email}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500/80 mt-1">
                      {sheep.tier} · สังกัด {sheep.department}
                    </p>
                  </div>
                </div>

                {/* Baptism indicators */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black ${
                    sheep.waterBaptismDate 
                      ? 'bg-blue-50 text-blue-600 border border-blue-100/50' 
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}>
                    <Droplet size={11} className={sheep.waterBaptismDate ? 'text-blue-500 animate-pulse' : 'text-slate-300'} />
                    บัพติศมาน้ำ: {sheep.waterBaptismDate ? '✅' : '⏳'}
                  </span>
                  
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black ${
                    sheep.spiritBaptismDate 
                      ? 'bg-rose-50 text-rose-600 border border-rose-100/50' 
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}>
                    <Flame size={11} className={sheep.spiritBaptismDate ? 'text-rose-500 animate-pulse' : 'text-slate-300'} />
                    บัพติศมาวิญญาณ: {sheep.spiritBaptismDate ? '✅' : '⏳'}
                  </span>
                </div>
              </div>

              {/* Active Learning Progress */}
              <div className="border-t border-slate-50 pt-4 flex flex-col gap-2.5 mt-auto">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-bold text-slate-600 flex items-center gap-1.5">
                    <BookOpen size={13} className="text-slate-400" />
                    {sheep.latestCourse}
                  </span>
                  <span className="font-extrabold text-slate-700 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md text-[10px]">
                    {Math.round(sheep.progress)}%
                  </span>
                </div>
                
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${sheep.progress}%` }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleViewDetails(sheep.id)}
                  className="btn btn-outline btn-xs w-full mt-2 font-bold hover:bg-indigo-50 hover:text-indigo-600"
                >
                  ดูรายละเอียดและประวัติการเรียน
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Users size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {search ? 'ไม่พบลูกแกะตามคำค้นหาของคุณ' : 'ยังไม่มีลูกแกะในความดูแลของคุณ'}
          </h3>
          <p className="text-slate-400 font-semibold max-w-sm text-sm">
            {search ? 'ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง' : 'หากมีลูกแกะที่ต้องดูแล กรุณาแจ้งผู้ดูแลระบบเพื่อทำการระบุชื่อพี่เลี้ยงให้บัญชีลูกแกะ'}
          </p>
        </div>
      )}

      {/* Detailed Modal */}
      {selectedSheep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
          <div className="card flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden border border-slate-100 bg-white shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                  {selectedSheep.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    ประวัติของ {selectedSheep.name} {selectedSheep.nickname && selectedSheep.nickname !== '-' ? `(${selectedSheep.nickname})` : ''}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">สังกัด {selectedSheep.department} · ตำแหน่ง {selectedSheep.tier}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSheep(null)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-100 px-6 bg-slate-50/50 overflow-x-auto no-scrollbar whitespace-nowrap">
              <button
                onClick={() => setActiveTab('courses')}
                className={`py-3 px-4 text-xs font-black border-b-2 transition-all ${
                  activeTab === 'courses' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                คอร์สเรียนทั้งหมด
              </button>
              <button
                onClick={() => setActiveTab('certificates')}
                className={`py-3 px-4 text-xs font-black border-b-2 transition-all ${
                  activeTab === 'certificates' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                ใบรับรองและประวัติการอบรม
              </button>
              <button
                onClick={() => setActiveTab('points')}
                className={`py-3 px-4 text-xs font-black border-b-2 transition-all ${
                  activeTab === 'points' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                ประวัติแต้มสะสม
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailsLoading ? (
                <div className="space-y-4 py-8">
                  <div className="h-6 w-1/3 rounded bg-slate-100 animate-pulse" />
                  <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
                  <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
                </div>
              ) : sheepDetails ? (
                <div className="space-y-6">
                  {/* TAB 1: Courses */}
                  {activeTab === 'courses' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">คอร์สเรียนในการลงทะเบียน</h4>
                      {sheepDetails.enrollments?.length > 0 ? (
                        <div className="grid gap-4">
                          {sheepDetails.enrollments.map((en) => (
                            <div key={en.id} className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-100 bg-white rounded-2xl p-4 shadow-sm gap-4">
                              <div className="min-w-0">
                                <h5 className="text-sm font-bold text-slate-800 truncate">{en.course?.title}</h5>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  หมวดหมู่: {en.course?.categoryName || 'ทั่วไป'} · มูลค่าแต้ม: {en.course?.points || 0} PTS
                                </p>
                              </div>
                              <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                    en.status === 'COMPLETED' 
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                      : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                  }`}>
                                    {en.status === 'COMPLETED' ? 'เรียนจบแล้ว ✅' : 'กำลังเรียนอยู่ ⏳'}
                                  </span>
                                  <p className="text-[10px] text-slate-400 mt-1 font-bold">
                                    ความคืบหน้า {Math.round(en.progressPercent)}%
                                  </p>
                                </div>
                                <div className="h-10 w-10 shrink-0 rounded-full border border-slate-100 flex items-center justify-center font-bold text-xs bg-slate-50">
                                  {Math.round(en.progressPercent)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 font-semibold py-4 text-center">ไม่มีข้อมูลประวัติการเรียนวิชาใดๆ</p>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Certificates */}
                  {activeTab === 'certificates' && (
                    <div className="space-y-6">
                      {/* LMS System Certificates */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Award size={16} className="text-indigo-600" />
                          ใบรับรองจากการเรียนรู้ในระบบ
                        </h4>
                        {sheepDetails.systemCertificates?.length > 0 ? (
                          <div className="grid gap-3">
                            {sheepDetails.systemCertificates.map((cert) => (
                              <div key={cert.id} className="flex items-center justify-between border border-slate-100 bg-white rounded-2xl p-4 shadow-sm">
                                <div>
                                  <h5 className="text-sm font-bold text-slate-800">{cert.courseTitle}</h5>
                                  <p className="text-xs text-slate-400 mt-0.5">เลขใบรับรอง: {cert.certificateNo}</p>
                                </div>
                                {cert.pdfUrl && (
                                  <a
                                    href={cert.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline btn-xs px-2.5 font-bold"
                                  >
                                    เปิดดูใบประกาศ
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 font-semibold py-2 text-center">ยังไม่ได้รับใบประกาศนียบัตรในระบบ</p>
                        )}
                      </div>

                      {/* External Training Certificates */}
                      <div className="space-y-4 pt-4 border-t border-slate-50">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Landmark size={16} className="text-emerald-600" />
                          ประวัติอบรมภายนอกอื่น ๆ
                        </h4>
                        {sheepDetails.externalCertificates?.length > 0 ? (
                          <div className="grid gap-3">
                            {sheepDetails.externalCertificates.map((cert) => (
                              <div key={cert.id} className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-100 bg-white rounded-2xl p-4 shadow-sm gap-2">
                                <div>
                                  <h5 className="text-sm font-bold text-slate-800">{cert.title}</h5>
                                  <p className="text-xs text-slate-400 mt-0.5">ผู้จัด: {cert.issuer} · หมวดความสามารถ: {cert.competencyCode || '-'}</p>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 self-start sm:self-auto flex items-center gap-1">
                                  <Calendar size={12} />
                                  วันที่บันทึก: {new Date(cert.createdAt).toLocaleDateString('th-TH')}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 font-semibold py-2 text-center">ไม่มีการบันทึกประวัติการอบรมภายนอก</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Points Ledger */}
                  {activeTab === 'points' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100/50 p-4 rounded-2xl mb-4">
                        <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">แต้มคงเหลือสะสมทั้งหมด</span>
                        <span className="text-xl font-black text-indigo-600">{sheepDetails.pointsBalance} PTS</span>
                      </div>

                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">ประวัติแต้มสะสมเข้า/ออก</h4>
                      {sheepDetails.pointsHistory?.length > 0 ? (
                        <div className="border border-slate-100 bg-white rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm">
                          {sheepDetails.pointsHistory.map((item) => (
                            <div key={item.id} className="flex justify-between items-center p-3.5 hover:bg-slate-50 transition-colors">
                              <div>
                                <p className="text-sm font-semibold text-slate-700 leading-snug">{item.sourceLabel}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(item.createdAt).toLocaleString('th-TH')}</p>
                              </div>
                              <span className={`text-sm font-black ${
                                item.direction === 'earned' ? 'text-success' : 'text-danger'
                              }`}>
                                {item.direction === 'earned' ? `+${item.points}` : item.points} PTS
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 font-semibold py-4 text-center">ไม่มีบันทึกประวัติแต้มสะสม</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 font-bold">ไม่สามารถดึงข้อมูลได้</div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSheep(null)}
                className="btn btn-outline min-w-[100px]"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShepherdDashboard;
