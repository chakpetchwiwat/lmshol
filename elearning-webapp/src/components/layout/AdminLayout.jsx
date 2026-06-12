import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Book,
  Users,
  Target,
  Gift,
  Menu,
  X,
  LogOut,
  GraduationCap,
  ClipboardList,
  BellRing,
  Activity,
  Award,
  ClipboardCheck,
  Network,
} from 'lucide-react';
import useAccessibleOverlay from '../../hooks/useAccessibleOverlay';
import { canEditAdminUsers, getRoleLabel } from '../../utils/roles';
import { USER_ROLES } from '../../utils/constants/roles';
import AppLogo from '../common/AppLogo';
import './AdminLayout.css';

const AdminLayout = () => {
  const [isDrawerOpen, setDrawerOpen] = React.useState(false);
  const [user] = React.useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return JSON.parse(localStorage.getItem('user') || 'null');
  });
  const navigate = useNavigate();
  const location = useLocation();
  const isWiderPage = location.pathname.startsWith('/admin/users') ||
                      location.pathname.startsWith('/admin/courses') ||
                      location.pathname.startsWith('/admin/competencies') ||
                      location.pathname.startsWith('/admin/redeems') ||
                      location.pathname.startsWith('/admin/certificates') ||
                      location.pathname.startsWith('/admin/assessments') ||
                      location.pathname.startsWith('/admin/cohort-tracking') ||
                      location.pathname.startsWith('/admin/goals');
  const drawerRef = React.useRef(null);
  const mainRef = React.useRef(null);
  const closeButtonRef = React.useRef(null);
  const drawerTitleId = React.useId();

  const toggleDrawer = () => setDrawerOpen((current) => !current);
  const closeDrawer = () => setDrawerOpen(false);

  useAccessibleOverlay({
    isOpen: isDrawerOpen,
    onClose: closeDrawer,
    containerRef: drawerRef,
    initialFocusRef: closeButtonRef,
  });

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isFullAdmin = canEditAdminUsers(user);
  const isManager = user?.role === USER_ROLES.MANAGER;
  const isSupervisor = user?.isSupervisor === true;
  const isCourseStaffOnly = !isFullAdmin && !isManager && !isSupervisor && user?.isCourseStaff;

  const menuItems = [
    // Dashboard: Visible to Admin and Managers
    ...(!isCourseStaffOnly ? [{ path: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' }] : []),
    ...((isFullAdmin || isManager || isSupervisor) ? [{ path: '/admin/cohort-tracking', icon: <Activity size={20} />, label: 'Cohort Tracking' }] : []),
    
    // Learning Goals: Visible to Admin and Managers
    ...(!isCourseStaffOnly ? [{ path: '/admin/goals', icon: <Target size={20} />, label: 'เป้าหมายการเรียน' }] : []),
    
    // Course Management: Visible to Admin, Managers, Staff, but NOT Supervisors
    ...(!isSupervisor ? [{ path: '/admin/courses', icon: <Book size={20} />, label: 'จัดการคอร์สเรียน' }] : []),
    ...(isFullAdmin ? [{ path: '/admin/competencies', icon: <Network size={20} />, label: 'Competency' }] : []),
    
    // Announcements: Visible to Admin and Managers
    ...(!isCourseStaffOnly ? [{ path: '/admin/announcements', icon: <BellRing size={20} />, label: 'จัดการประกาศแผนก' }] : []),
    
    // Rewards: SuperAdmin/Admin Only
    ...(isFullAdmin
      ? [{ path: '/admin/rewards', icon: <Gift size={20} />, label: 'จัดการของรางวัล' }]
      : []),
    
    // Reduems: Visible to Admin and Managers, but NOT Supervisors
    ...((!isCourseStaffOnly && !isSupervisor) ? [{ path: '/admin/redeems', icon: <ClipboardList size={20} />, label: 'รายการ Redeem' }] : []),
    
    // Users: Admin and Managers (Backend will filter the data)
    ...(!isCourseStaffOnly ? [{ path: '/admin/users', icon: <Users size={20} />, label: 'ผู้ใช้งาน' }] : []),
    
    // Certificates: SuperAdmin/Admin Only
    ...(isFullAdmin
      ? [{ path: '/admin/certificates', icon: <Award size={20} />, label: 'ภาพรวมเกียรติบัตร' }]
      : []),

    { path: '/admin/assessments', icon: <ClipboardCheck size={20} />, label: 'Assessment Center' },
  ];

  return (
    <div className="admin-layout">
      <header className="admin-mobile-header">
        <button
          type="button"
          onClick={toggleDrawer}
          className="menu-btn"
          aria-controls="admin-navigation-drawer"
          aria-expanded={isDrawerOpen}
          aria-haspopup="dialog"
          aria-label="เปิดเมนูผู้ดูแลระบบ"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold">
          {isFullAdmin ? 'Admin Panel' : isManager ? 'Manager Panel' : isSupervisor ? 'Supervisor Panel' : 'Staff Panel'}
        </h1>
        <div style={{ width: 24 }} />
      </header>

      {isDrawerOpen && (
        <button
          type="button"
          className="admin-backdrop"
          onClick={closeDrawer}
          aria-label="ปิดเมนูผู้ดูแลระบบ"
        />
      )}

      <aside
        id="admin-navigation-drawer"
        ref={drawerRef}
        role={isDrawerOpen ? 'dialog' : undefined}
        aria-modal={isDrawerOpen ? 'true' : undefined}
        aria-labelledby={drawerTitleId}
        tabIndex={isDrawerOpen ? -1 : undefined}
        className={`admin-sidebar ${isDrawerOpen ? 'open' : ''}`}
      >
        <div className="sidebar-header !py-4">
          <AppLogo height="h-16" className="min-w-0" imageClassName="max-w-[200px]" />
          <h2 id={drawerTitleId} className="sr-only">
            Looma
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="close-btn lg-hidden"
            onClick={closeDrawer}
            aria-label="ปิดเมนูผู้ดูแลระบบ"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="เมนูผู้ดูแลระบบ">
          <div className="nav-group">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              {getRoleLabel(user)}
            </p>
            <p className="nav-group-title">เมนูหลัก</p>
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={closeDrawer}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            onClick={() => navigate('/user/home')}
            className="sidebar-link w-full justify-start"
          >
            <GraduationCap size={20} />
            <span>ไปหน้า User</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-link text-danger w-full justify-start"
          >
            <LogOut size={20} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      <main ref={mainRef} className="admin-main">
        <div className={`admin-content-wrapper ${isWiderPage ? 'wider-page' : ''}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
