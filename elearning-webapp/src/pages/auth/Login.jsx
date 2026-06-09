import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AppLogo from '../../components/common/AppLogo';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const emailInputId = React.useId();
  const passwordInputId = React.useId();

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      navigate('/user/home');
    }
  }, [navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { authAPI } = await import('../../utils/api');
      const response = await authAPI.login(email, password);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      navigate('/user/home');
    } catch (loginError) {
      setError(loginError.response?.data?.message || 'อีเมล หรือ รหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[linear-gradient(135deg,_#f7faff_0%,_#eef2ff_45%,_#f8fafc_100%)] p-4 animate-fade-in">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.12),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(15,118,110,0.1),_transparent_30%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/80 to-transparent" />

      <div className="relative z-10 flex w-full max-w-[460px] flex-col items-center overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_28px_70px_-32px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-10 2xl:max-w-[520px] 2xl:p-12">
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <AppLogo className="mb-2 justify-center" height="h-28 2xl:h-32" imageClassName="max-w-[320px] 2xl:max-w-[360px]" />
        <p className="mb-8 text-center text-[15px] font-medium leading-relaxed text-slate-800 2xl:text-base">
          เชื่อมโยงความรู้และสร้างวัฒนธรรมการเรียนรู้ <br />ในองค์กร
        </p>

        <form onSubmit={handleLogin} className="flex w-full flex-col gap-5 2xl:gap-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={emailInputId} className="text-sm font-semibold text-slate-700">
              อีเมล
            </label>
            <input
              id={emailInputId}
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm font-medium text-slate-900 transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 2xl:p-4"
              placeholder="example@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={passwordInputId} className="text-sm font-semibold text-slate-700">
              รหัสผ่าน
            </label>
            <div className="relative">
              <input
                id={passwordInputId}
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 pr-12 text-sm font-medium text-slate-900 transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 2xl:p-4"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary mt-4 w-full justify-center rounded-xl py-3.5 text-[15px] font-semibold shadow-[0_18px_30px_-18px_rgba(79,70,229,0.7)] disabled:opacity-70 2xl:py-4"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="mt-8 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-xs font-medium text-slate-500">
          v1.0 MVP
        </p>
      </div>
    </div>
  );
};

export default Login;
