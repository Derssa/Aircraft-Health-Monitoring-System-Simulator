import React, { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity, AlertTriangle, Thermometer, Droplets, Wind, Settings, ChevronDown, ChevronUp, Bell, X } from 'lucide-react';

interface Telemetry {
  id: string;
  timestamp: string;
  engine_temperature: number;
  engine_vibration: number;
  hydraulic_pressure: number;
  cabin_pressure: number;
  fuel_flow: number;
}

interface Alert {
  id: string;
  timestamp: string;
  alert_type: string;
  message: string;
  value: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showAlerts, setShowAlerts] = useState(window.innerWidth > 1024);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [telRes, alertsRes] = await Promise.all([
          fetch(`${API_URL}/telemetry/history`),
          fetch(`${API_URL}/alerts`),
        ]);

        if (telRes.ok && alertsRes.ok) {
          const telData: any[] = await telRes.json();
          const parsedTelemetry: Telemetry[] = telData.map((t) => ({
            ...t,
            engine_temperature: Number(t.engine_temperature),
            engine_vibration: Number(t.engine_vibration),
            hydraulic_pressure: Number(t.hydraulic_pressure),
            cabin_pressure: Number(t.cabin_pressure),
            fuel_flow: Number(t.fuel_flow),
          }));
          // API returns newest-first, reverse to get oldest-first for chart
          setTelemetry(parsedTelemetry.reverse());

          const alertsData: any[] = await alertsRes.json();
          const parsedAlerts: Alert[] = alertsData.map((a) => ({
            ...a,
            value: Number(a.value),
          }));
          setAlerts(parsedAlerts);
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (err) {
        setIsConnected(false);
        console.error('Failed to fetch data', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const latest = telemetry[telemetry.length - 1] || null;

  const chartData = useMemo(() => {
    return telemetry.slice(-60).map((t) => ({
      time: new Date(t.timestamp).toLocaleTimeString('en-US', { hour12: false }),
      temp: t.engine_temperature,
      vibration: t.engine_vibration,
      hydraulic: t.hydraulic_pressure,
      cabin: t.cabin_pressure,
    }));
  }, [telemetry]);

  return (
    <div className="app-container">
      <header>
        <div className="title-container">
          <Activity className="title-icon" />
          <div className="header-text">
            <h1>Aircraft Health Monitoring System</h1>
            <div className="status-badge">
              System Status:
              {isConnected ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-green)' }}>
                  Online <div className="status-dot" />
                </span>
              ) : (
                <span style={{ color: 'var(--accent-red)' }}>Offline</span>
              )}
            </div>
          </div>
        </div>
        
        <button 
          className="alerts-fab" 
          onClick={() => setShowAlerts(!showAlerts)}
          aria-label="Toggle alerts"
        >
          <Bell size={24} />
          {alerts.length > 0 && <span className="fab-badge">{alerts.length}</span>}
        </button>
      </header>

      <div className="dashboard-grid">
        <main className="main-content">
          {/* Live Stats */}
          <section className="stats-section">
            <h2 className="panel-title" style={{ marginBottom: '1rem' }}>Live Telemetry</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">
                  <Thermometer size={16} color="var(--accent-red)" />
                  Engine Temp
                </div>
                <div className="stat-value">
                  {latest ? latest.engine_temperature.toFixed(1) : '--'}
                  <span className="stat-unit">°C</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  <Activity size={16} color="var(--accent-yellow)" />
                  Vibration
                </div>
                <div className="stat-value">
                  {latest ? latest.engine_vibration.toFixed(2) : '--'}
                  <span className="stat-unit">g</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  <Droplets size={16} color="var(--accent-blue)" />
                  Hydraulic
                </div>
                <div className="stat-value">
                  {latest ? latest.hydraulic_pressure.toFixed(0) : '--'}
                  <span className="stat-unit">PSI</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  <Wind size={16} color="var(--accent-cyan)" />
                  Cabin Press
                </div>
                <div className="stat-value">
                  {latest ? latest.cabin_pressure.toFixed(1) : '--'}
                  <span className="stat-unit">PSI</span>
                </div>
              </div>
            </div>
          </section>

          {/* Charts side by side */}
          <div className="charts-row">
            <section className="panel">
              <div className="panel-header">
                <Activity size={18} color="var(--text-secondary)" />
                <h2 className="panel-title">Engine Temp &amp; Vibration</h2>
              </div>
              <ResponsiveContainer width="100%" height="99%">
                <LineChart data={chartData} margin={{ top: 5, right: 25, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ color: '#f8fafc', fontSize: '12px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="temp" name="Temp (°C)" stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" dataKey="vibration" name="Vibration (g)" stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </section>

            <section className="panel">
              <div className="panel-header">
                <Droplets size={18} color="var(--text-secondary)" />
                <h2 className="panel-title">Hydraulics &amp; Cabin Pressure</h2>
              </div>
              <ResponsiveContainer width="100%" height="99%">
                <LineChart data={chartData} margin={{ top: 5, right: 25, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ color: '#f8fafc', fontSize: '12px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="hydraulic" name="Hydraulic (PSI)" stroke="#38bdf8" dot={false} strokeWidth={2} isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" dataKey="cabin" name="Cabin Press (PSI)" stroke="#34d399" dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </section>
          </div>
        </main>

        {/* Alerts sidebar */}
        <aside className={`panel alerts-panel ${!showAlerts ? 'collapsed' : ''}`}>
          <div className="panel-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={20} color="var(--accent-red)" />
              <h2 className="panel-title">System Alerts ({alerts.length})</h2>
            </div>
            <button className="panel-close-btn" onClick={() => setShowAlerts(false)} aria-label="Close alerts">
              <X size={20} />
            </button>
          </div>

          <div className="alerts-list">
            {alerts.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                No active alerts. System functioning normally.
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className={`alert-item alert-${alert.alert_type.toLowerCase()}`}>
                  <div className="alert-icon-wrapper">
                    {alert.alert_type === 'CRITICAL' && <AlertTriangle size={20} />}
                    {alert.alert_type === 'WARNING' && <Activity size={20} />}
                    {alert.alert_type === 'MAINTENANCE' && <Settings size={20} />}
                  </div>
                  <div className="alert-content">
                    <div className="alert-header">
                      <span className="alert-type">{alert.alert_type}</span>
                      <span className="alert-time">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="alert-message">{alert.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
