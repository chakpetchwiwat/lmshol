import React from 'react';
import { useNavigate } from 'react-router-dom';

const Logout = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#f7faff_0%,_#eef2ff_45%,_#f8fafc_100%)] font-bold text-slate-500">
      <div className="text-center">
        <p className="text-lg">กำลังออกจากระบบ...</p>
        <p className="text-xs text-slate-400 mt-2">โปรดรอสักครู่</p>
      </div>
    </div>
  );
};

export default Logout;
