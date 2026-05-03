import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { canAccessAdminPanel } from '../../utils/roles';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const emailInputId = React.useId();
  const passwordInputId = React.useId();

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      const user = JSON.parse(userStr);

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

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_28px_70px_-32px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-primary text-white shadow-[0_22px_40px_-20px_rgba(79,70,229,0.6)] transition-transform duration-300 hover:-translate-y-0.5">
          <BookOpen size={40} strokeWidth={1.5} />
        </div>

        <h1 className="mb-1 text-center text-3xl font-black tracking-tight text-gray-900">
          LMS Connect
        </h1>
        <p className="mb-8 text-center text-sm font-medium text-slate-600">
          e-Learning ระบบพัฒนาบุคลากร
        </p>

        <form onSubmit={handleLogin} className="flex w-full flex-col gap-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={emailInputId} className="text-sm font-bold text-slate-700">
              อีเมล
            </label>
            <input
              id={emailInputId}
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm font-medium text-slate-900 transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              placeholder="example@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={passwordInputId} className="text-sm font-bold text-slate-700">
              รหัสผ่าน
            </label>
            <input
              id={passwordInputId}
              type="password"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm font-medium text-slate-900 transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary mt-4 w-full justify-center rounded-xl py-3.5 text-[15px] font-bold shadow-[0_18px_30px_-18px_rgba(79,70,229,0.7)] disabled:opacity-70"
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
