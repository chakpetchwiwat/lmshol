import React from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  UserCheck, 
  Trash2, 
  Star, 
  Search,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ArrowRightLeft
} from 'lucide-react';
import { adminAPI, courseStaffAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';
import Skeleton from '../common/Skeleton';
import UserLink from '../admin/UserLink';
import { getCourseAccess } from '../../utils/coursePermissions';

const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: Shield,
    description: 'ผู้รับผิดชอบหลัก มีสิทธิ์สูงสุดในการจัดการคอร์ส'
  },
  instructor: {
    label: 'Instructor',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: UserCheck,
    description: 'วิทยากรผู้สอน สามารถจัดการเนื้อหาและดูรายงานได้'
  },
  trainer: {
    label: 'Trainer',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: Users,
    description: 'ผู้ช่วยสอน สามารถดูรายงานผลสอบได้'
  }
};

const CourseStaffEditor = ({ courseId, currentUser, onStaffChanged, initialStaff }) => {
  const toast = useToast();
  const [staff, setStaff] = React.useState(initialStaff || []);
  const [allUsers, setAllUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(!initialStaff);
  const [processing, setProcessing] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAdding, setIsAdding] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [newRole, setNewRole] = React.useState('trainer');
  const [isPrimary, setIsPrimary] = React.useState(false);

  // Permission logic
  const userAccess = React.useMemo(() => 
    getCourseAccess({ currentUser, staff }), 
  [currentUser, staff]);

  const canEdit = userAccess === 'full';

  const fetchStaff = React.useCallback(async () => {
    try {
      if (staff.length === 0) setLoading(true);
      const response = await courseStaffAPI.getStaff(courseId);
      setStaff(response.data);
      if (onStaffChanged) onStaffChanged(response.data);
    } catch (error) {
      console.error('Fetch staff error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลทีมงานได้');
    } finally {
      setLoading(false);
    }
  }, [courseId, staff.length, toast, onStaffChanged]);

  const fetchAllUsers = React.useCallback(async () => {
    try {
      const response = await adminAPI.getUsers();
      setAllUsers(response.data);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  }, []);

  React.useEffect(() => {
    if (courseId) {
      fetchStaff();
      fetchAllUsers();
    }
  }, [courseId, fetchStaff, fetchAllUsers]);

  const handleMutationError = React.useCallback((error, defaultMessage) => {
    console.error('Mutation error:', error);
    
    // Explicit 403 Forbidden handling
    if (error.response?.status === 403) {
      toast.error('คุณไม่มีสิทธิ์จัดการทีมงานของคอร์สนี้');
    } else {
      const backendMessage = error.response?.data?.message;
      toast.error(backendMessage || defaultMessage);
    }
    
    // Always refresh staff list on conflict or permission errors to ensure UI consistency
    if (error.response?.status === 409 || error.response?.status === 403 || error.response?.status === 400) {
      fetchStaff();
    }
  }, [fetchStaff, toast]);

  const handleAddStaff = async () => {
    if (!selectedUser) return;
    
    try {
      setProcessing(true);
      await courseStaffAPI.assignStaff(courseId, {
        userId: selectedUser.id,
        role: newRole,
        isPrimary: newRole === 'instructor' ? isPrimary : false
      });
      
      toast.success(`เพิ่ม ${selectedUser.name} เป็น ${ROLE_CONFIG[newRole].label} เรียบร้อย`);
      setIsAdding(false);
      setSelectedUser(null);
      setSearchTerm('');
      fetchStaff();
    } catch (error) {
      handleMutationError(error, 'ไม่สามารถเพิ่มทีมงานได้');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateRole = async (staffId, role, isPrimaryValue = false) => {
    try {
      setProcessing(true);
      await courseStaffAPI.updateStaff(courseId, staffId, { 
        role, 
        isPrimary: role === 'instructor' ? isPrimaryValue : false 
      });
      toast.success('อัปเดตบทบาททีมงานเรียบร้อย');
      fetchStaff();
    } catch (error) {
      handleMutationError(error, 'ไม่สามารถอัปเดตบทบาทได้');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveStaff = async (staffId, name) => {
    if (!window.confirm(`ยืนยันการลบ ${name} ออกจากทีมงานใช่หรือไม่?`)) return;

    try {
      setProcessing(true);
      await courseStaffAPI.deleteStaff(courseId, staffId);
      toast.success('ลบทีมงานเรียบร้อย');
      fetchStaff();
    } catch (error) {
      handleMutationError(error, 'ไม่สามารถลบทีมงานได้');
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = React.useMemo(() => {
    if (!searchTerm) return [];
    const lowerSearch = searchTerm.toLowerCase();
    const existingIds = new Set(staff.map(s => s.userId));
    
    return allUsers
      .filter(u => !existingIds.has(u.id))
      .filter(u => 
        u.name.toLowerCase().includes(lowerSearch) || 
        u.email.toLowerCase().includes(lowerSearch)
      )
      .slice(0, 5);
  }, [searchTerm, allUsers, staff]);

  if (loading) return <Skeleton.Table rows={5} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <Users size={20} className="text-primary" />
            ทีมงานประจำคอร์ส
          </h4>
          <p className="text-sm text-slate-500 mt-1">จัดการรายชื่อวิทยากรและผู้ดูแลหลักสูตรนี้</p>
        </div>
        
        {canEdit && (
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`btn ${isAdding ? 'btn-outline' : 'btn-primary'} flex items-center gap-2`}
          >
            {isAdding ? 'ยกเลิก' : <><UserPlus size={18} /> เพิ่มทีมงาน</>}
          </button>
        )}
      </div>

      {/* Add Staff Form */}
      {isAdding && canEdit && (
        <div className="bg-white border-2 border-primary/20 rounded-xl p-5 shadow-sm space-y-4 animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Search */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ค้นหาพนักงาน</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="พิมพ์ชื่อหรืออีเมลเพื่อค้นหา..."
                  className="input pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={selectedUser}
                />
                
                {!selectedUser && searchTerm && filteredUsers.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                    {filteredUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user);
                          setSearchTerm(user.name);
                        }}
                        className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                      >
                        <div className="font-bold text-slate-700">{user.name}</div>
                        <div className="text-xs text-slate-400">{user.email} • {user.department || 'ไม่ระบุแผนก'}</div>
                      </button>
                    ))}
                  </div>
                )}
                
                {selectedUser && (
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary hover:underline"
                  >
                    เปลี่ยน
                  </button>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">บทบาทหน้าที่</label>
              <div className="flex gap-2">
                {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                  <button
                    key={role}
                    onClick={() => setNewRole(role)}
                    className={`flex-1 flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                      newRole === role 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-slate-100 hover:border-slate-200 text-slate-500'
                    }`}
                  >
                    <config.icon size={18} />
                    <span className="text-xs font-bold mt-1">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-4">
              {newRole === 'instructor' && (
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="peer sr-only"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                    />
                    <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-primary transition-colors"></div>
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </div>
                  <span className="text-sm font-bold text-slate-600 group-hover:text-primary transition-colors">ตั้งเป็นวิทยากรหลัก</span>
                </label>
              )}
            </div>
            
            <button
              onClick={handleAddStaff}
              disabled={!selectedUser || processing}
              className="btn btn-primary flex items-center gap-2 px-8"
            >
              {processing ? 'กำลังบันทึก...' : 'เพิ่มเข้าทีมงาน'}
            </button>
          </div>
        </div>
      )}

      {/* Staff List */}
      <div className="grid grid-cols-1 gap-3">
        {staff.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">ยังไม่มีการกำหนดทีมงานประจำคอร์สนี้</p>
          </div>
        ) : (
          staff.map((s) => {
            const config = ROLE_CONFIG[s.role] || ROLE_CONFIG.trainer;
            const isSelf = currentUser && (s.userId === currentUser.id || s.userId === currentUser.userId);
            
            return (
              <div 
                key={s.id} 
                className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-primary/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${config.color} shrink-0`}>
                    <config.icon size={22} />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <UserLink userName={s.name} userId={s.userId} className="text-lg" />
                      {s.isPrimary && (
                        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-sm">
                          <Star size={10} fill="currentColor" />
                          Primary
                        </div>
                      )}
                      {isSelf && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">You</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">• {config.description}</span>
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Owner Change Action */}
                    {s.role !== 'owner' && (
                      <button 
                        onClick={() => handleUpdateRole(s.id, 'owner')}
                        title="เปลี่ยนเป็นเจ้าของคอร์ส"
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <ArrowRightLeft size={18} />
                      </button>
                    )}

                    {/* Primary Toggle */}
                    {s.role === 'instructor' && !s.isPrimary && (
                      <button 
                        onClick={() => handleUpdateRole(s.id, 'instructor', true)}
                        title="ตั้งเป็นวิทยากรหลัก"
                        className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Star size={18} />
                      </button>
                    )}

                    {/* Role Downgrade/Upgrade */}
                    {s.role === 'trainer' && (
                      <button 
                        onClick={() => handleUpdateRole(s.id, 'instructor')}
                        title="เปลี่ยนเป็นวิทยากร"
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <UserCheck size={18} />
                      </button>
                    )}

                    {s.role === 'instructor' && (
                      <button 
                        onClick={() => handleUpdateRole(s.id, 'trainer')}
                        title="เปลี่ยนเป็นผู้ช่วย"
                        className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Users size={18} />
                      </button>
                    )}

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    <button 
                      onClick={() => handleRemoveStaff(s.id, s.name)}
                      disabled={s.role === 'owner' && staff.filter(x => x.role === 'owner').length <= 1}
                      title="ลบออกจากทีมงาน"
                      className="p-2 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Access Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 items-start">
        <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 leading-relaxed">
          <p className="font-bold mb-1">การกำหนดบทบาททีมงาน:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li><strong>Owner:</strong> มีสิทธิ์จัดการคอร์ส เนื้อหา และทีมงานได้ทั้งหมด (มีได้เพียง 1 คนต่อคอร์ส)</li>
            <li><strong>Instructor:</strong> วิทยากรผู้สอน สามารถจัดการเนื้อหาคอร์สและบทเรียนได้</li>
            <li><strong>Trainer:</strong> ผู้ช่วยสอน สามารถเข้าดูรายงานและผลการเรียนของผู้ใช้งานได้เท่านั้น</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CourseStaffEditor;
