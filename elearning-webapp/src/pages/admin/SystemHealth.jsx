import React from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  HardDrive,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserX
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import api from '../../utils/api';
import './SystemHealth.css';

const StatCard = ({ title, status, icon, metrics, error, loading }) => {
  const isUp = status === 'UP';
  const isDisabled = status === 'DISABLED';
  
  return (
    <div className={`health-card ${loading ? 'loading' : ''} ${!isUp && !isDisabled ? 'down' : ''} ${isDisabled ? 'disabled' : ''}`}>
      <div className="card-header">
        <div className="header-left">
          <div className="icon-wrapper">
            {icon}
          </div>
          <h3>{title}</h3>
        </div>
        <div className={`status-badge ${status?.toLowerCase()}`}>
          {isUp ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{status || 'UNKNOWN'}</span>
        </div>
      </div>
      
      <div className="card-content">
        {loading ? (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-4 w-full"></div>
            <div className="skeleton h-4 w-2/3"></div>
          </div>
        ) : error ? (
          <div className="error-message">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : (
          <div className="metrics-grid">
            {Object.entries(metrics || {}).map(([key, value]) => (
              <div key={key} className="metric-item">
                <span className="metric-label">{key}</span>
                <span className="metric-value">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SystemHealth = () => {
  const [healthData, setHealthData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState(null);
  const [resetIdentifier, setResetIdentifier] = React.useState('');
  const [isResetting, setIsResetting] = React.useState(false);

  const fetchHealth = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const response = await api.get('/admin/system/health');
      // The API interceptor already unwraps response.data.data into response.data
      if (response.data) {
        setHealthData(response.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleResetRateLimit = async (e) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) return;

    setIsResetting(true);
    try {
      const response = await api.post('/admin/system/security/reset', { 
        identifier: resetIdentifier.trim() 
      });
      
      if (response.data.success) {
        toast.success(response.data.message || 'Rate limit reset successfully');
        setResetIdentifier('');
      } else {
        toast.error(response.data.message || 'Failed to reset rate limit');
      }
    } catch (error) {
      console.error('Reset error:', error);
      toast.error(error.response?.data?.message || 'Error connecting to security service');
    } finally {
      setIsResetting(false);
    }
  };

  React.useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => fetchHealth(), 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return '-';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    
    return parts.length > 0 ? parts.join(' ') : '0s';
  };

  return (
    <div className="system-health-page">
      <AdminPageHeader 
        title="System Health Monitoring" 
        subtitle="Real-time status of application infrastructure"
        action={
          <button 
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
          >
            <RefreshCw size={18} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Now'}</span>
          </button>
        }
      />

      <div className="health-grid">
        {/* Server Card */}
        <StatCard 
          title="Application Server"
          icon={<Server size={24} />}
          status={healthData?.services?.server?.status}
          loading={loading}
          metrics={{
            'Uptime': formatUptime(healthData?.system?.uptime),
            'Node Version': healthData?.system?.nodeVersion,
            'Platform': healthData?.system?.platform,
            'Memory (Process)': formatBytes(healthData?.system?.memory?.process?.rss)
          }}
        />

        {/* Database Card */}
        <StatCard 
          title="PostgreSQL Database"
          icon={<Database size={24} />}
          status={healthData?.services?.database?.status}
          loading={loading}
          error={healthData?.services?.database?.error}
          metrics={{
            'Latency': healthData?.services?.database?.latency,
            'Connection': 'Prisma Pool'
          }}
        />

        {/* Redis Card */}
        <StatCard 
          title="Redis Cache"
          icon={<Activity size={24} />}
          status={healthData?.services?.redis?.status}
          loading={loading}
          error={healthData?.services?.redis?.error}
          metrics={{
            'Latency': healthData?.services?.redis?.latency,
            'Usage': healthData?.services?.redis?.message || 'Rate Limiting'
          }}
        />

        {/* System Load Card */}
        <StatCard 
          title="System Resources"
          icon={<Cpu size={24} />}
          status="UP"
          loading={loading}
          metrics={{
            'CPU Load (1m)': healthData?.system?.cpu?.[0]?.toFixed(2),
            'Free Memory': formatBytes(healthData?.system?.memory?.free),
            'Total Memory': formatBytes(healthData?.system?.memory?.total)
          }}
        />
      </div>

      <div className="security-section mt-8">
        <div className="section-header flex items-center gap-2 mb-4">
          <Shield className="text-primary" size={24} />
          <h2 className="text-xl font-bold">Security & Access Control</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security Status */}
          <div className="health-card security-status">
            <div className="card-header">
              <div className="header-left">
                <div className="icon-wrapper">
                  <ShieldCheck size={24} className="text-success" />
                </div>
                <h3>Rate Limiting Status</h3>
              </div>
              <div className={`status-badge ${healthData?.security?.rateLimiting?.enabled ? 'up' : 'disabled'}`}>
                {healthData?.security?.rateLimiting?.enabled ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                <span>{healthData?.security?.rateLimiting?.enabled ? 'ACTIVE' : 'DISABLED'}</span>
              </div>
            </div>
            <div className="card-content">
              <div className="metrics-grid">
                <div className="metric-item">
                  <span className="metric-label">Storage Engine</span>
                  <span className="metric-value">{healthData?.security?.rateLimiting?.store || 'Memory'}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Global Limit</span>
                  <span className="metric-value">{healthData?.security?.rateLimiting?.maxRequests} req / 15m</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Login Limit</span>
                  <span className="metric-value">{healthData?.security?.auth?.loginLimit} attempts</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Lockout Window</span>
                  <span className="metric-value">{(healthData?.security?.auth?.lockoutDuration / 60000).toFixed(0)} mins</span>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Unblock Tool */}
          <div className="health-card unblock-tool">
            <div className="card-header">
              <div className="header-left">
                <div className="icon-wrapper">
                  <UserX size={24} className="text-warning" />
                </div>
                <h3>Manual Unblock Tool</h3>
              </div>
            </div>
            <div className="card-content">
              <p className="text-sm text-gray-500 mb-4">
                Enter an IP address or User ID to manually clear all active rate limit blocks.
              </p>
              <form onSubmit={handleResetRateLimit} className="flex flex-col gap-4">
                <div className="input-group">
                  <input 
                    type="text" 
                    placeholder="e.g. 192.168.1.1 or user-uuid"
                    className="w-full p-2 border rounded bg-background"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary flex items-center justify-center gap-2"
                  disabled={isResetting || !resetIdentifier.trim()}
                >
                  {isResetting ? <RefreshCw size={18} className="spinning" /> : <Shield size={18} />}
                  <span>{isResetting ? 'Resetting...' : 'Unblock / Reset Rate Limit'}</span>
                </button>
              </form>
              {!healthData?.security?.rateLimiting?.store || healthData?.security?.rateLimiting?.store === 'Memory' ? (
                <div className="warning-note mt-4 p-2 bg-warning/10 text-warning text-xs rounded flex gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Manual unblock requires <strong>Redis</strong> storage. Memory-based blocks cannot be cleared without a server restart.</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="health-footer">
        <div className="last-updated">
          <Clock size={14} />
          <span>Last updated: {lastUpdated?.toLocaleTimeString()}</span>
        </div>
        <div className="monitoring-hint">
          <CheckCircle2 size={14} className="text-success" />
          <span>Automatic health checks are performed every 30 seconds.</span>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
