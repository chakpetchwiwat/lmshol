import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Gift, User, Bookmark, LogOut, Settings, Bell, Target, ClipboardCheck } from 'lucide-react';
import { authAPI, userAPI } from '../../utils/api';
import { canAccessAdminPanel } from '../../utils/roles';
import { formatThaiDateTime } from '../../utils/dateUtils';
import AppLogo from '../common/AppLogo';
import './UserLayout.css';

const UserLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = React.useRef(null);
  const desktopNotificationRef = React.useRef(null);
  const mobileNotificationRef = React.useRef(null);
  const [user, setUser] = React.useState(null);
  const [points, setPoints] = React.useState(0);
  const [notifications, setNotifications] = React.useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) setUser(storedUser);

        const [userRes, pointsRes, notificationsRes] = await Promise.all([
          authAPI.getCurrentUser(),
          userAPI.getPoints(),
          userAPI.getNotifications()
        ]);

        const freshUser = userRes?.data || userRes;
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));

          if (freshUser.mustChangePassword && location.pathname !== '/user/profile') {
            navigate('/user/profile', { replace: true, state: { forcePasswordChange: true } });
            return;
          }
        }

        setPoints(pointsRes.data.balance || 0);
        setNotifications(notificationsRes.data.items || []);
        setUnreadNotificationCount(notificationsRes.data.unreadCount || 0);
      } catch (error) {
        console.error('Failed to fetch user data', error);
      }
    };

    fetchUser();
    const intervalId = window.setInterval(fetchUser, 60000);

    return () => window.clearInterval(intervalId);
  }, [location.pathname, navigate]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedDesktop = desktopNotificationRef.current?.contains(event.target);
      const clickedMobile = mobileNotificationRef.current?.contains(event.target);

      if (!clickedDesktop && !clickedMobile) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setIsNotificationOpen(false);
  }, [location.pathname, location.search]);

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    try {
      const response = await userAPI.markNotificationRead(notification.id);
      setNotifications(response.data.items || []);
      setUnreadNotificationCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    } finally {
      setIsNotificationOpen(false);
      navigate(notification.actionUrl || '/user/home');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await userAPI.markAllNotificationsRead();
      setNotifications(response.data.items || []);
      setUnreadNotificationCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  };
  
  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const performClearAll = async () => {
    try {
      const response = await userAPI.clearAllNotifications();
      setNotifications(response.data.items || []);
      setUnreadNotificationCount(response.data.unreadCount || 0);
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear all notifications', error);
    }
  };

  const displayNotifications = React.useMemo(() => {
    // Basic de-duplication: show only the latest notification per target + type
    const seen = new Set();
    return notifications.filter(n => {
      const key = `${n.assessmentSubmissionId || n.goalId || n.id}-${n.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [notifications]);

  const getNotificationIcon = (notification) => {
    if (notification.type === 'ASSESSMENT_REVIEWED' || notification.type === 'ASSESSMENT_SUBMITTED') {
      return <ClipboardCheck size={18} />;
    }

    return <Target size={18} />;
  };

  const renderNotificationPanel = (positionClasses = "right-0") => (
    <div className={`absolute ${positionClasses} top-full z-50 mt-3 w-[min(24rem,88vw)] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl animate-fade-in`}>
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Notifications</p>
            <h3 className="mt-0.5 text-[15px] font-bold text-slate-800">การแจ้งเตือนของคุณ</h3>
          </div>
          {unreadNotificationCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-primary">
              {unreadNotificationCount} ใหม่
            </span>
          ) : null}
        </div>
        
        {notifications.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); handleMarkAllRead(); }}
              className="text-[11px] font-bold text-primary hover:text-primary-dark transition-colors px-2 py-1 rounded-lg hover:bg-primary/5"
            >
              ทำเป็นอ่านแล้วทั้งหมด
            </button>
            <div className="h-3 w-px bg-slate-200" />
            <button 
              onClick={(e) => { e.stopPropagation(); handleClearAll(); }}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
            >
              ล้างทั้งหมด
            </button>
          </div>
        )}
      </div>

      <div className="max-h-[26rem] overflow-y-auto no-scrollbar overscroll-contain">
        {displayNotifications.length > 0 ? displayNotifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => handleNotificationClick(notification)}
            className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-4 text-left transition-all hover:bg-slate-50/80 active:scale-[0.98] ${
              notification.readAt ? 'bg-white' : 'bg-primary/[0.02]'
            }`}
          >
            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              notification.readAt ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'
            }`}>
              {getNotificationIcon(notification)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className={`text-sm leading-tight transition-colors ${notification.readAt ? 'font-medium text-slate-600' : 'font-bold text-slate-900'}`}>
                  {notification.title}
                </p>
                {!notification.readAt ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary shadow-sm shadow-primary/20" /> : null}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 line-clamp-3">{notification.message}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                  {formatThaiDateTime(notification.scheduledFor, true)}
                </p>
              </div>
            </div>
          </button>
        )) : (
          <div className="px-5 py-12 text-center bg-slate-50/30">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-white border border-slate-100 text-slate-300 shadow-sm">
              <Bell size={24} />
            </div>
            <p className="mt-4 text-[15px] font-bold text-slate-700">ยังไม่มีการแจ้งเตือน</p>
            <p className="mt-1 text-xs font-medium text-slate-400 max-w-[180px] mx-auto leading-relaxed">
              เมื่อถึงเวลาที่ระบบแจ้งเตือนเป้าหมาย รายการจะแสดงที่นี่
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="user-layout flex flex-col md:flex-row bg-transparent">
      <aside className="hidden md:flex w-[260px] xl:w-[280px] 2xl:w-[300px] flex-col bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-gray-100/80 my-5 ml-5 h-[calc(100vh-2.5rem)] z-[40] shrink-0">
        <div className="px-6 py-3 flex items-center border-b border-gray-100 shrink-0">
          <AppLogo height="h-16" imageClassName="max-w-[200px]" />
        </div>

        <div className="p-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="points-pill w-full flex justify-center !py-2.5">
              <Gift size={16} strokeWidth={3} />
              <span className="text-sm">{points.toLocaleString()} แต้ม</span>
            </div>
            <div className="relative shrink-0" ref={desktopNotificationRef}>
              <button
                type="button"
                onClick={() => setIsNotificationOpen((current) => !current)}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-slate-300 hover:text-primary"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadNotificationCount > 0 ? <span className="notification-dot" /> : null}
              </button>
              {isNotificationOpen ? renderNotificationPanel("left-0") : null}
            </div>
          </div>
          <div className="mt-3 text-center px-2">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.08em] mb-0.5">ผู้ใช้งาน</p>
            <p className="font-extrabold text-[15px] text-gray-900 tracking-tight truncate">{user?.name || 'Loading...'}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto no-scrollbar">
          <NavLink to="/user/home" className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 ${isActive ? 'bg-primary/5 text-primary border border-primary/5 shadow-sm shadow-primary/5' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'}`}>
            <Home size={20} /> <span className="font-bold">หน้าแรก</span>
          </NavLink>

          <NavLink to="/user/courses" className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 ${isActive ? 'bg-primary/5 text-primary border border-primary/5 shadow-sm shadow-primary/5' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'}`}>
            <BookOpen size={20} /> <span className="font-bold">คอร์สทั้งหมด</span>
          </NavLink>

          <NavLink to="/user/bookmarks" className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 ${isActive ? 'bg-primary/5 text-primary border border-primary/5 shadow-sm shadow-primary/5' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'}`}>
            <Bookmark size={20} /> <span className="font-bold">คอร์สที่บันทึก</span>
          </NavLink>

          <NavLink to="/user/rewards" className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 ${isActive ? 'bg-primary/5 text-primary border border-primary/5 shadow-sm shadow-primary/5' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'}`}>
            <Gift size={20} /> <span className="font-bold">ของรางวัล</span>
          </NavLink>

          <NavLink to="/user/profile" className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 ${isActive ? 'bg-primary/5 text-primary border border-primary/5 shadow-sm shadow-primary/5' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'}`}>
            <User size={20} /> <span className="font-bold">โปรไฟล์</span>
          </NavLink>

          {canAccessAdminPanel(user) && (
            <NavLink to={user?.isSupervisor && user?.role === 'user' ? '/admin/cohort-tracking' : '/admin/dashboard'} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 text-rose-500 hover:bg-rose-50 hover:translate-x-1 mt-auto bg-rose-50/30">
              <Settings size={20} /> <span className="font-bold">จัดการระบบ</span>
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100 shrink-0">
          <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 w-full transition-all border border-transparent hover:border-red-100 active:scale-95">
            <LogOut size={18} /> <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      <div className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="user-header md:hidden">
          <div className="header-content pt-1">
            <div className="flex items-center gap-2 max-w-[65%]">
              <AppLogo height="h-12" imageClassName="max-w-[140px]" />
              <div className="flex flex-col overflow-hidden">
                {location.pathname !== '/user/home' && (
                  <span className="text-[10px] text-gray-500 font-medium truncate mt-0.5">
                    สวัสดีคุณ {user?.name ? (user.name.split(' ')[0] === 'คุณ' ? user.name.split(' ')[1] : user.name.split(' ')[0]) : 'ผู้ใช้งาน'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative" ref={mobileNotificationRef}>
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen((current) => !current)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-600 shadow-sm"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unreadNotificationCount > 0 ? <span className="notification-dot" /> : null}
                </button>
                {isNotificationOpen ? renderNotificationPanel("right-0") : null}
              </div>
            </div>
          </div>
        </header>

        <main ref={mainRef} className="user-main flex-1 min-h-0 no-scrollbar bg-transparent w-full">
          <div className="user-main-inner px-4 md:!max-w-[1600px] md:!px-8 lg:!px-12 md:!pt-12 md:!pb-12">
            <Outlet />
          </div>
        </main>

        <nav className="bottom-nav md:hidden">
          <div className="nav-items-container">
            <NavLink to="/user/home" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <div className="nav-icon-wrapper"><Home size={22} /></div>
              <span>หน้าแรก</span>
            </NavLink>

            <NavLink to="/user/courses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <div className="nav-icon-wrapper"><BookOpen size={22} /></div>
              <span>คอร์สทั้งหมด</span>
            </NavLink>

            <NavLink to="/user/bookmarks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <div className="nav-icon-wrapper"><Bookmark size={22} /></div>
              <span>คอร์สที่บันทึก</span>
            </NavLink>

            <NavLink to="/user/rewards" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <div className="nav-icon-wrapper"><Gift size={22} /></div>
              <span>ของรางวัล</span>
            </NavLink>

            <NavLink to="/user/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <div className="nav-icon-wrapper"><User size={22} /></div>
              <span>โปรไฟล์</span>
            </NavLink>
          </div>
        </nav>
      </div>
      {/* Premium Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowClearConfirm(false)}
          />
          <div className="relative w-full max-sm overflow-hidden rounded-[2rem] bg-white p-8 shadow-2xl animate-scale-in">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-500 mb-6">
                <Bell size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">ล้างการแจ้งเตือน?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                คุณต้องการล้างรายการแจ้งเตือนทั้งหมดใช่หรือไม่?<br />
                การดำเนินการนี้ไม่สามารถเรียกคืนได้
              </p>
              <div className="mt-8 flex w-full flex-col gap-3">
                <button
                  type="button"
                  onClick={performClearAll}
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-rose-500 font-bold text-white shadow-lg shadow-rose-200 transition-all hover:bg-rose-600 active:scale-95"
                >
                  ใช่, ล้างทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-slate-100 font-bold text-slate-600 transition-all hover:bg-slate-200 active:scale-95"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserLayout;
