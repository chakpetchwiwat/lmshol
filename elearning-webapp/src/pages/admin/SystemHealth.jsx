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
  HardDrive
} from 'lucide-react';
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
