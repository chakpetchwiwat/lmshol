import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Gift, User, BookMarked, LogOut, Settings, Bell, Target } from 'lucide-react';
import { userAPI } from '../../utils/api';
import { canAccessAdminPanel } from '../../utils/roles';
import { formatThaiDateTime } from '../../utils/dateUtils';
import './UserLayout.css';

const UserLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);
  const desktopNotificationRef = useRef(null);
  const mobileNotificationRef = useRef(null);
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser) setUser(storedUser);

        const [pointsRes, notificationsRes] = await Promise.all([
          userAPI.getPoints(),
          userAPI.getNotifications()
        ]);

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
  }, [location.pathname]);

  useEffect(() => {
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

  useEffect(() => {
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

  const renderNotificationPanel = (positionClasses = "right-0") => (
    <div className={`absolute ${positionClasses} top-full z-50 mt-3 w-[min(24rem,88vw)] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Notifications</p>
          <h3 className="mt-1 text-sm font-bold text-slate-800">การแจ้งเตือนเป้าหมายการเรียน</h3>
        </div>
        {unreadNotificationCount > 0 ? (
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-rose-600">
            {unreadNotificationCount} ใหม่
          </span>
        ) : null}
      </div>

      <div className="max-h-[24rem] overflow-y-auto">
        {notifications.length > 0 ? notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => handleNotificationClick(notification)}
            className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
              notification.readAt ? 'bg-white' : 'bg-rose-50/40'
            }`}
          >
            <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              notification.readAt ? 'bg-slate-100 text-slate-500' : 'bg-rose-100 text-rose-600'
            }`}>
              <Target size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-slate-800">{notification.title}</p>
                {!notification.readAt ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" /> : null}
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-500">{notification.message}</p>
              <p className="mt-2 text-[11px] font-semibold text-slate-400">
                {formatThaiDateTime(notification.scheduledFor, true)}
              </p>
            </div>
          </button>
        )) : (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Bell size={20} />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-700">ยังไม่มีการแจ้งเตือน</p>
            <p className="mt-1 text-xs font-medium text-slate-400">เมื่อถึงเวลาที่ระบบแจ้งเตือนเป้าหมาย รายการจะแสดงที่นี่</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="user-layout flex flex-col md:flex-row bg-transparent">
      <aside className="hidden md:flex w-[260px] xl:w-[280px] 2xl:w-[300px] flex-col bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-gray-100/80 my-5 ml-5 h-[calc(100vh-2.5rem)] z-[40] shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100 shrink-0">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-sm">
            <BookMarked size={20} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-none">LMS Connect</h1>
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
            <BookOpen size={20} /> <span className="font-bold">คอร์สเรียน</span>
          </NavLink>

          <NavLink to="/user/rewards" className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 ${isActive ? 'bg-primary/5 text-primary border border-primary/5 shadow-sm shadow-primary/5' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'}`}>
            <Gift size={20} /> <span className="font-bold">ของรางวัล</span>
          </NavLink>

          <NavLink to="/user/profile" className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 ${isActive ? 'bg-primary/5 text-primary border border-primary/5 shadow-sm shadow-primary/5' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'}`}>
            <User size={20} /> <span className="font-bold">โปรไฟล์</span>
          </NavLink>

          {canAccessAdminPanel(user) && (
            <NavLink to="/admin/dashboard" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 text-rose-500 hover:bg-rose-50 hover:translate-x-1 mt-auto bg-rose-50/30">
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
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-md shadow-primary/20 shrink-0">
                <BookMarked size={20} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col overflow-hidden">
                <h1 className="text-lg font-bold tracking-tight text-gray-900 leading-none truncate">LMS Connect</h1>
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
              <span>คอร์สเรียน</span>
            </NavLink>

            <NavLink to="/user/rewards" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <div className="nav-icon-wrapper"><Gift size={22} /></div>
              <span>ของรางวัล</span>
            </NavLink>

            <NavLink to="/user/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <div className="nav-icon-wrapper"><User size={22} /></div>
              <span>โปรไฟล์</span>
            </NavLink>

            {canAccessAdminPanel(user) && (
              <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-item text-rose-500 ${isActive ? 'active' : ''}`}>
                <div className="nav-icon-wrapper"><Settings size={22} /></div>
                <span>จัดการ</span>
              </NavLink>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default UserLayout;
