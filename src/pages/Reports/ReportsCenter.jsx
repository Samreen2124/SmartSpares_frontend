import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';

export default function ReportsCenter() {
  const [reportType, setReportType] = useState('sales'); // 'sales' | 'purchases' | 'products' | 'categories' | 'batteries' | 'customers'
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      let endpoint = '';

      switch (reportType) {
        case 'sales':
          endpoint = `/reports/sales/?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'purchases':
          endpoint = `/reports/purchases/?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'products':
          endpoint = `/reports/products/?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'categories':
          endpoint = `/reports/categories/?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'batteries':
          endpoint = `/reports/batteries/?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'customers':
          endpoint = `/reports/customers/`;
          break;
        default:
          endpoint = `/reports/sales/?start_date=${startDate}&end_date=${endDate}`;
      }

      const res = await apiClient.get(endpoint);
      setReportData(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const url = `http://127.0.0.1:8000/api/reports/export/?type=${reportType}&start_date=${startDate}&end_date=${endDate}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Reports & Financial Analytics
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.875rem' }}>
            Comprehensive business reports powered by real database transactions • Export to Excel / CSV and PDF.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🖨 Print / PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#059669', borderColor: '#059669' }}
          >
            📥 Export CSV / Excel
          </button>
        </div>
      </div>

      {/* Filter Ribbon: Report Tabs & Date Selectors */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setReportType('sales')}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              backgroundColor: reportType === 'sales' ? '#ffffff' : 'transparent',
              color: reportType === 'sales' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            📈 Sales & Margins
          </button>
          <button
            onClick={() => setReportType('purchases')}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              backgroundColor: reportType === 'purchases' ? '#ffffff' : 'transparent',
              color: reportType === 'purchases' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            🛒 Purchases & Suppliers
          </button>
          <button
            onClick={() => setReportType('products')}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              backgroundColor: reportType === 'products' ? '#ffffff' : 'transparent',
              color: reportType === 'products' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            📦 Product Performance
          </button>
          <button
            onClick={() => setReportType('categories')}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              backgroundColor: reportType === 'categories' ? '#ffffff' : 'transparent',
              color: reportType === 'categories' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            🚜 Vehicle Categories
          </button>
          <button
            onClick={() => setReportType('batteries')}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              backgroundColor: reportType === 'batteries' ? '#ffffff' : 'transparent',
              color: reportType === 'batteries' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            🔋 Battery Ecosystem
          </button>
          <button
            onClick={() => setReportType('customers')}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
              backgroundColor: reportType === 'customers' ? '#ffffff' : 'transparent',
              color: reportType === 'customers' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            👥 Customer Credit Ledger
          </button>
        </div>

        {/* Date Filters */}
        {reportType !== 'customers' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Period:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
            />
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.8rem', padding: '4px 8px' }}
            />
          </div>
        )}
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px' }}>
          ⚠ {errorMsg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Generating analytics report...
        </div>
      ) : reportData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. SALES REPORT VIEW */}
          {reportType === 'sales' && (
            <>
              {/* Sales KPI Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Sales Revenue</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#047857', marginTop: '2px' }}>
                    ₹{parseFloat(reportData.summary.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{reportData.summary.total_invoices} invoices</div>
                </div>

                <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Gross Profit & Margin</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '2px' }}>
                    ₹{parseFloat(reportData.summary.gross_profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                    {reportData.summary.profit_margin_pct}% Gross Margin
                  </div>
                </div>

                <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #6366f1' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Cash & UPI Collected</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                    ₹{parseFloat(reportData.summary.total_collected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Credit Extended</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#b45309', marginTop: '2px' }}>
                    ₹{parseFloat(reportData.summary.total_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Records Table */}
              <div className="card" style={{ padding: '20px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>Itemized Counter Sales Transactions</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', fontSize: '0.8rem', color: '#475569' }}>
                        <th style={{ padding: '8px 12px' }}>Invoice #</th>
                        <th style={{ padding: '8px 12px' }}>Date</th>
                        <th style={{ padding: '8px 12px' }}>Customer</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Subtotal</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Tax (GST)</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Final Amount</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Paid</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Balance Due</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.records || []).map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--accent-blue)' }}>{r.invoice_number}</td>
                          <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#64748b' }}>{r.sale_date}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 500 }}>{r.customer_name}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{parseFloat(r.subtotal).toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{parseFloat(r.tax).toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>₹{parseFloat(r.final_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>₹{parseFloat(r.paid_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: parseFloat(r.balance_amount) > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>₹{parseFloat(r.balance_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                              backgroundColor: r.payment_status === 'PAID' ? '#dcfce7' : r.payment_status === 'PARTIALLY_PAID' ? '#fef3c7' : '#fee2e2',
                              color: r.payment_status === 'PAID' ? '#15803d' : r.payment_status === 'PARTIALLY_PAID' ? '#b45309' : '#b91c1c'
                            }}>
                              {r.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* 2. PURCHASES REPORT VIEW */}
          {reportType === 'purchases' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Purchase Orders</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#b45309', marginTop: '2px' }}>{reportData.summary.total_orders} Orders</div>
                </div>
                <div className="card" style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Purchase Expenditure</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '2px' }}>
                    ₹{parseFloat(reportData.summary.total_spend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '20px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>Supplier Purchase History</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', fontSize: '0.8rem', color: '#475569' }}>
                        <th style={{ padding: '8px 12px' }}>PO #</th>
                        <th style={{ padding: '8px 12px' }}>Supplier</th>
                        <th style={{ padding: '8px 12px' }}>Order Date</th>
                        <th style={{ padding: '8px 12px' }}>Expected Delivery</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Amount</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.records || []).map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--accent-blue)' }}>{r.po_number}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 500 }}>{r.supplier_name}</td>
                          <td style={{ padding: '8px 12px', fontSize: '0.85rem' }}>{r.order_date}</td>
                          <td style={{ padding: '8px 12px', fontSize: '0.85rem', color: '#64748b' }}>{r.expected_delivery}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>₹{parseFloat(r.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* 3. PRODUCT-WISE PERFORMANCE */}
          {reportType === 'products' && (
            <div className="card" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>Spare Parts Sales & Margin Breakdown</h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', fontSize: '0.8rem', color: '#475569' }}>
                      <th style={{ padding: '8px 12px' }}>Spare Part Name</th>
                      <th style={{ padding: '8px 12px' }}>SKU</th>
                      <th style={{ padding: '8px 12px' }}>Category</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Units Sold</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Gross Revenue</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>COGS (Cost)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Gross Profit Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.records || []).map(p => (
                      <tr key={p.product_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--accent-blue)' }}>{p.sku}</td>
                        <td style={{ padding: '8px 12px' }}>{p.category}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{p.units_sold}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(p.gross_revenue).toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>₹{parseFloat(p.total_cogs).toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>₹{parseFloat(p.gross_profit).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. VEHICLE CATEGORIES CONTRIBUTION */}
          {reportType === 'categories' && (
            <div className="card" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>Sales Contribution by Vehicle Machinery Category</h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', fontSize: '0.8rem', color: '#475569' }}>
                      <th style={{ padding: '8px 12px' }}>Vehicle Category</th>
                      <th style={{ padding: '8px 12px' }}>Category Code</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Units Sold</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Sales Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.categories || []).map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{c.code}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{c.units_sold}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-blue)' }}>
                          ₹{parseFloat(c.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. BATTERY ECOSYSTEM REPORT */}
          {reportType === 'batteries' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Trade-In Exchanges</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#047857', marginTop: '2px' }}>{reportData.exchange_tradeins_count} Units</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rebates: ₹{parseFloat(reportData.total_exchange_rebates).toLocaleString('en-IN')}</div>
              </div>
              <div className="card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Direct Scrap Buybacks</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309', marginTop: '2px' }}>{reportData.direct_scrap_buybacks_count} Units</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Payouts: ₹{parseFloat(reportData.total_direct_scrap_payouts).toLocaleString('en-IN')}</div>
              </div>
              <div className="card" style={{ padding: '16px', borderLeft: '4px solid #6366f1' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Recycler Revenue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4f46e5', marginTop: '2px' }}>
                  ₹{parseFloat(reportData.recycler_liquidation_revenue).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{reportData.scrap_units_liquidated} units sold to smelter</div>
              </div>
              <div className="card" style={{ padding: '16px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Current Scrap Yard Stock</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '2px' }}>
                  {reportData.current_scrap_yard_stock} Units
                </div>
              </div>
            </div>
          )}

          {/* 6. CUSTOMER CREDIT & OUTSTANDING LEDGER */}
          {reportType === 'customers' && (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Customer Credit & Outstanding Ledger</h2>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#dc2626' }}>
                  Total Outstanding Balance: ₹{parseFloat(reportData.total_outstanding_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', fontSize: '0.8rem', color: '#475569' }}>
                      <th style={{ padding: '8px 12px' }}>Customer Name</th>
                      <th style={{ padding: '8px 12px' }}>Phone</th>
                      <th style={{ padding: '8px 12px' }}>Customer Type</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Credit Limit</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Outstanding Balance</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Available Credit Headroom</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.records || []).map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: '8px 12px', color: '#2563eb' }}>{c.phone}</td>
                        <td style={{ padding: '8px 12px' }}>{c.customer_type}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{parseFloat(c.credit_limit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: parseFloat(c.outstanding_balance) > 0 ? '#dc2626' : '#059669' }}>
                          ₹{parseFloat(c.outstanding_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>₹{parseFloat(c.available_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
