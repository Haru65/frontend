import React from 'react';
import './AdminDashboard.css';
import { Users, Settings, Database, Activity } from 'lucide-react';

function AdminDashboard() {
  const adminStats = {
    totalUsers: 45,
    activeUsers: 32,
    totalJobs: 156,
    completedJobs: 89
  };

  return (
    <div className="admin-dashboard fade-in">
      <div className="dashboard-header">
        <div className="header-info">
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <p className="dashboard-subtitle">System Management and Analytics</p>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#eff6ff' }}>
              <Users size={24} style={{ color: '#2563eb' }} />
            </div>
          </div>
          <div className="metric-title">Total Users</div>
          <div className="metric-value">{adminStats.totalUsers}</div>
          <div className="metric-description">registered users</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#f0fdf4' }}>
              <Activity size={24} style={{ color: '#16a34a' }} />
            </div>
          </div>
          <div className="metric-title">Active Users</div>
          <div className="metric-value">{adminStats.activeUsers}</div>
          <div className="metric-description">currently active</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#faf5ff' }}>
              <Database size={24} style={{ color: '#9333ea' }} />
            </div>
          </div>
          <div className="metric-title">Total Jobs</div>
          <div className="metric-value">{adminStats.totalJobs}</div>
          <div className="metric-description">in system</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-icon" style={{ backgroundColor: '#fff7ed' }}>
              <Settings size={24} style={{ color: '#ea580c' }} />
            </div>
          </div>
          <div className="metric-title">Completed</div>
          <div className="metric-value">{adminStats.completedJobs}</div>
          <div className="metric-description">jobs processed</div>
        </div>
      </div>

      <div className="admin-sections">
        <div className="admin-section">
          <h3>User Management</h3>
          <div className="admin-actions">
            <button className="admin-button">Add User</button>
            <button className="admin-button">Manage Roles</button>
            <button className="admin-button">View Logs</button>
          </div>
        </div>

        <div className="admin-section">
          <h3>System Settings</h3>
          <div className="admin-actions">
            <button className="admin-button">Database Backup</button>
            <button className="admin-button">System Config</button>
            <button className="admin-button">Maintenance</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
