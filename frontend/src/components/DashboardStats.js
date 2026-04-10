import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import api from '../services/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Design tokens
const T = {
  dark: "#0f172a",
  dark2: "#1e293b",
  dark3: "#334155",
  card: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  text2: "#cbd5e1",
  text3: "#94a3b8",
  green: "#059669",
  greenLight: "#34d399",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  orange: "#f59e0b",
  red: "#ef4444",
};

export default function DashboardStats({ onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/stats/dashboard');
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la încărcarea statisticilor');
    } finally {
      setLoading(false);
    }
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: { color: T.border },
        ticks: { color: T.text3 },
      },
      y: {
        grid: { color: T.border },
        ticks: { color: T.text3 },
        beginAtZero: true,
      },
    },
  };

  // Applications chart data
  const applicationsChartData = stats?.charts?.applications_daily ? {
    labels: stats.charts.applications_daily.map(d => d.label),
    datasets: [{
      data: stats.charts.applications_daily.map(d => d.count),
      backgroundColor: `${T.green}88`,
      borderColor: T.green,
      borderWidth: 2,
      borderRadius: 6,
    }],
  } : null;

  // Earnings chart data
  const earningsChartData = stats?.charts?.earnings_monthly ? {
    labels: stats.charts.earnings_monthly.map(d => d.month),
    datasets: [{
      data: stats.charts.earnings_monthly.map(d => d.total),
      borderColor: T.purple,
      backgroundColor: `${T.purple}22`,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: T.purple,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    }],
  } : null;

  // Applications status chart
  const applicationStatusData = stats?.applications ? {
    labels: ['În așteptare', 'Acceptate', 'Respinse'],
    datasets: [{
      data: [
        stats.applications.sent.pending,
        stats.applications.sent.accepted,
        stats.applications.sent.rejected,
      ],
      backgroundColor: [T.orange, T.green, T.red],
      borderWidth: 0,
    }],
  } : null;

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: T.text, fontSize: 18 }}>Se încarcă statisticile...</div>
      </div>
    );
  }

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 20, overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          background: T.dark, borderRadius: 24, width: '100%', maxWidth: 900,
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)', margin: '20px 0',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 24, fontWeight: 800, color: T.text, margin: 0 }}>
              📊 Dashboard Statistici
            </h2>
            <p style={{ fontSize: 14, color: T.text3, margin: '4px 0 0' }}>
              Vizualizare completă a activității tale
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: 28, color: T.text3, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {error ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.red }}>{error}</div>
        ) : (
          <div style={{ padding: 24 }}>
            {/* Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Joburi postate', value: stats?.overview?.total_jobs_posted || 0, icon: '💼', color: T.blue },
                { label: 'Aplicări trimise', value: stats?.overview?.total_applications_sent || 0, icon: '📤', color: T.green },
                { label: 'Aplicări primite', value: stats?.overview?.applications_received || 0, icon: '📥', color: T.orange },
                { label: 'Conversații', value: stats?.overview?.total_conversations || 0, icon: '💬', color: T.purple },
                { label: 'Contracte semnate', value: stats?.overview?.contracts_signed || 0, icon: '✍️', color: T.greenLight },
                { label: 'Rating mediu', value: stats?.reviews?.received?.average || '-', icon: '⭐', color: T.orange },
              ].map((item, i) => (
                <div key={i} style={{
                  background: T.card, borderRadius: 14, padding: '16px 14px',
                  border: `1px solid ${T.border}`,
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: item.color, fontFamily: 'Outfit,sans-serif' }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div style={{
              background: `linear-gradient(135deg, ${T.green}22, ${T.purple}22)`,
              borderRadius: 16, padding: 20, marginBottom: 24,
              border: `1px solid ${T.green}33`,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: '0 0 16px', fontFamily: 'Outfit,sans-serif' }}>
                💰 Rezumat Financiar
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: T.text3, marginBottom: 4 }}>Total câștigat</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.greenLight }}>
                    {stats?.finances?.total_earned?.toLocaleString() || 0} RON
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: T.text3, marginBottom: 4 }}>În așteptare</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.orange }}>
                    {stats?.finances?.pending_earnings?.toLocaleString() || 0} RON
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: T.text3, marginBottom: 4 }}>Total plătit</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.purple }}>
                    {stats?.finances?.total_paid?.toLocaleString() || 0} RON
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: T.text3, marginBottom: 4 }}>Comisioane</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.text2 }}>
                    {stats?.finances?.commission_paid?.toLocaleString() || 0} RON
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
              {/* Applications Chart */}
              <div style={{ background: T.card, borderRadius: 16, padding: 20, border: `1px solid ${T.border}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: '0 0 16px' }}>
                  📈 Aplicări (ultimele 7 zile)
                </h3>
                <div style={{ height: 180 }}>
                  {applicationsChartData && <Bar data={applicationsChartData} options={chartOptions} />}
                </div>
              </div>

              {/* Earnings Chart */}
              <div style={{ background: T.card, borderRadius: 16, padding: 20, border: `1px solid ${T.border}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: '0 0 16px' }}>
                  💵 Câștiguri (ultimele 6 luni)
                </h3>
                <div style={{ height: 180 }}>
                  {earningsChartData && <Line data={earningsChartData} options={chartOptions} />}
                </div>
              </div>
            </div>

            {/* Applications Status */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {/* Doughnut Chart */}
              <div style={{ background: T.card, borderRadius: 16, padding: 20, border: `1px solid ${T.border}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: '0 0 16px' }}>
                  📊 Status aplicări trimise
                </h3>
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {applicationStatusData && stats.applications.sent.total > 0 ? (
                    <Doughnut 
                      data={applicationStatusData} 
                      options={{ 
                        ...chartOptions, 
                        cutout: '60%',
                        plugins: { legend: { display: true, position: 'bottom', labels: { color: T.text3, font: { size: 11 } } } }
                      }} 
                    />
                  ) : (
                    <div style={{ color: T.text3, fontSize: 14 }}>Nicio aplicare încă</div>
                  )}
                </div>
              </div>

              {/* Activity Summary */}
              <div style={{ background: T.card, borderRadius: 16, padding: 20, border: `1px solid ${T.border}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: '0 0 16px' }}>
                  🎯 Activitate recentă
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: T.text2 }}>Aplicări (7 zile)</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: T.green }}>{stats?.activity?.applications_last_7_days || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: T.text2 }}>Aplicări (30 zile)</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: T.blue }}>{stats?.activity?.applications_last_30_days || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: T.text2 }}>Joburi postate (30 zile)</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: T.purple }}>{stats?.activity?.jobs_posted_last_30_days || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: T.text2 }}>Review-uri primite</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: T.orange }}>{stats?.reviews?.received?.total || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
