import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/dashboard/stats/');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to fetch store dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔄</div>
        Loading live business management dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '16px', borderRadius: '8px' }}>
          ⚠ {error || 'Failed to load dashboard data.'}
          <button onClick={fetchDashboardMetrics} className="btn btn-secondary" style={{ marginLeft: '16px' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { kpi, recent_sales, recent_purchases, monthly_trend, category_distribution } = data;

  // Max value calculation for dual-bar chart scaling
  const maxTrendVal = Math.max(
    ...monthly_trend.map(m => Math.max(m.sales, m.purchases)),
    10000
  );

  // Total stock across categories for percentage
  const totalCatStock = category_distribution.reduce((sum, c) => sum + (c.stock || 0), 0) || 1;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
      case 'RECEIVED':
        return <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>;
      case 'PARTIALLY_PAID':
      case 'PARTIALLY_RECEIVED':
        return <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{status.replace('_', ' ')}</span>;
      case 'ORDERED':
      case 'UNPAID':
        return <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>;
      case 'CANCELLED':
        return <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Cancelled</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Welcome Header Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        border: '1px solid #334155',
        padding: '24px 28px',
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              AutoParts Pro • Automobile Spare Parts Management System
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '6px 0 4px', color: '#ffffff' }}>
              Welcome back, {user?.full_name || user?.username}! 👋
            </h1>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', margin: 0 }}>
              Live store metrics calculated directly from MySQL database • Cars, Bikes, Tractors, Lorries, and Harvesters.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-block',
              padding: '6px 14px',
              backgroundColor: 'rgba(37, 99, 235, 0.25)',
              border: '1px solid #3b82f6',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#93c5fd'
            }}>
              {isAdmin ? '👑 Store Administrator' : '💼 Sales / Counter Staff'}
            </span>
            <button
              onClick={fetchDashboardMetrics}
              style={{
                backgroundColor: '#334155',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Operational KPI Cards (Grid of 4) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Today's Sales Revenue</div>
            <span style={{ fontSize: '1.25rem' }}>💳</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#047857', marginTop: '6px' }}>
            ₹{parseFloat(kpi.today_sales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {kpi.today_invoices_count} counter invoices processed today
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Monthly Sales Volume</div>
            <span style={{ fontSize: '1.25rem' }}>📈</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '6px' }}>
            ₹{parseFloat(kpi.monthly_sales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Estimated Gross Margin: <strong style={{ color: '#059669' }}>₹{parseFloat(kpi.estimated_monthly_profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Monthly Purchases (Spend)</div>
            <span style={{ fontSize: '1.25rem' }}>🛒</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
            ₹{parseFloat(kpi.monthly_purchases).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {kpi.pending_pos_count} purchase orders pending delivery
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Available Stock Units</div>
            <span style={{ fontSize: '1.25rem' }}>📦</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', marginTop: '6px' }}>
            {kpi.total_available_stock} Units
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Across {kpi.total_products} active spare parts models
          </div>
        </div>
      </div>

      {/* 3. Secondary Metrics: Categories, Customers, Suppliers, Scrap Batteries (Grid of 4) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Link to="/products" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '14px 18px', transition: 'transform 0.15s ease' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Products</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{kpi.total_products} Parts</div>
          </div>
        </Link>
        <Link to="/categories" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '14px 18px', transition: 'transform 0.15s ease' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Vehicle Categories</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{kpi.total_categories} Classes</div>
          </div>
        </Link>
        <Link to="/customers" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '14px 18px', transition: 'transform 0.15s ease' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Active Customers</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>{kpi.total_customers} Registered</div>
          </div>
        </Link>
        <Link to="/batteries" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ padding: '14px 18px', transition: 'transform 0.15s ease', borderLeft: '4px solid #047857' }}>
            <div style={{ fontSize: '0.75rem', color: '#047857', textTransform: 'uppercase', fontWeight: 600 }}>Scrap Battery Yard</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#047857', marginTop: '2px' }}>
              {kpi.battery_scrap_in_stock} Units (₹{parseFloat(kpi.battery_scrap_valuation).toLocaleString('en-IN')})
            </div>
          </div>
        </Link>
      </div>

      {/* 4. Quick Actions Toolbar */}
      <div className="card" style={{ padding: '16px 20px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
          ⚡ Fast Counter Shortcuts:
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link to="/sales" className="btn btn-primary" style={{ backgroundColor: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🛒 New Counter Sale (POS)
          </Link>
          <Link to="/purchases" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            ➕ Create Purchase Order
          </Link>
          <Link to="/batteries" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            🔋 Battery Exchange / Buyback
          </Link>
          <Link to="/inventory" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            📋 Stock Movement Ledger
          </Link>
        </div>
      </div>

      {/* 5. Dual Visual Analytics: Monthly Trend & Category Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Sales vs Purchases 6-Month Chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                📊 Monthly Sales vs. Purchasing Trend (6 Months)
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Comparative spend vs revenue from real MySQL transactions</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: '#2563eb', borderRadius: '2px' }} /> Sales
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: '#f59e0b', borderRadius: '2px' }} /> Purchases
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '200px', paddingTop: '20px', borderBottom: '1px solid #e2e8f0', gap: '12px' }}>
            {monthly_trend.map((m, idx) => {
              const salesHeight = maxTrendVal > 0 ? (m.sales / maxTrendVal) * 160 : 0;
              const purchasesHeight = maxTrendVal > 0 ? (m.purchases / maxTrendVal) * 160 : 0;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '160px' }}>
                    {/* Sales Bar */}
                    <div
                      title={`Sales: ₹${m.sales.toFixed(2)}`}
                      style={{
                        width: '20px',
                        height: `${Math.max(salesHeight, 4)}px`,
                        backgroundColor: '#2563eb',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease'
                      }}
                    />
                    {/* Purchases Bar */}
                    <div
                      title={`Purchases: ₹${m.purchases.toFixed(2)}`}
                      style={{
                        width: '20px',
                        height: `${Math.max(purchasesHeight, 4)}px`,
                        backgroundColor: '#f59e0b',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Stock Distribution */}
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px' }}>
            🚜 Category Stock Distribution
          </h2>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '16px' }}>
            Physical spare parts distribution across machinery types
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {category_distribution.map((cat, idx) => {
              const percent = Math.round((cat.stock / totalCatStock) * 100);
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{cat.name}</span>
                    <span style={{ color: '#64748b' }}>{cat.stock} units ({percent}%)</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${percent}%`,
                      height: '100%',
                      backgroundColor: idx === 0 ? '#2563eb' : idx === 1 ? '#059669' : idx === 2 ? '#f59e0b' : idx === 3 ? '#8b5cf6' : '#ec4899',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. Dual Recent Transactions: Sales & Purchases Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Recent Sales Table */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Recent Counter Sales Invoices
            </h2>
            <Link to="/sales" style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
              View All POS →
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', fontSize: '0.75rem', color: '#475569' }}>
                  <th style={{ padding: '8px 10px' }}>Invoice</th>
                  <th style={{ padding: '8px 10px' }}>Customer</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '8px 10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_sales.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                      No recent sales.
                    </td>
                  </tr>
                ) : (
                  recent_sales.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.85rem' }}>
                        {s.invoice_number}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '0.85rem' }}>
                        {s.customer_name}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>
                        ₹{parseFloat(s.final_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {getStatusBadge(s.payment_status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Purchases Table */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Recent Purchase Orders
            </h2>
            <Link to="/purchases" style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
              View All Orders →
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', fontSize: '0.75rem', color: '#475569' }}>
                  <th style={{ padding: '8px 10px' }}>PO Number</th>
                  <th style={{ padding: '8px 10px' }}>Supplier</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '8px 10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_purchases.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                      No recent purchases.
                    </td>
                  </tr>
                ) : (
                  recent_purchases.map(po => (
                    <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.85rem' }}>
                        {po.po_number}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '0.85rem' }}>
                        {po.supplier_name}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>
                        ₹{parseFloat(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {getStatusBadge(po.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
