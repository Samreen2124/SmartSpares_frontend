import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function CustomerList() {
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    customer_type: 'INDIVIDUAL',
    credit_limit: '0.00',
    outstanding_balance: '0.00'
  });
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sales History Drawer State
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (customerTypeFilter) params.append('customer_type', customerTypeFilter);

      const res = await apiClient.get(`/customers/?${params.toString()}`);
      setCustomers(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery, customerTypeFilter]);

  const handleOpenModal = (customer = null) => {
    setErrorMsg(null);
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        customer_type: customer.customer_type,
        credit_limit: customer.credit_limit || '0.00',
        outstanding_balance: customer.outstanding_balance || '0.00'
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        customer_type: 'INDIVIDUAL',
        credit_limit: '0.00',
        outstanding_balance: '0.00'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingCustomer) {
        await apiClient.put(`/customers/${editingCustomer.id}/`, formData);
      } else {
        await apiClient.post('/customers/', formData);
      }
      handleCloseModal();
      fetchCustomers();
    } catch (err) {
      const detail = err.response?.data?.phone?.[0] || 
                     err.response?.data?.credit_limit?.[0] || 
                     err.response?.data?.name?.[0] || 
                     err.response?.data?.detail || 
                     'Error saving customer.';
      setErrorMsg(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewHistory = async (customer) => {
    try {
      const res = await apiClient.get(`/customers/${customer.id}/sales-history/`);
      setSelectedCustomerHistory(res.data);
    } catch (err) {
      alert('Failed to retrieve customer sales history.');
    }
  };

  const handleToggleActive = async (cust) => {
    if (!isAdmin) return;
    try {
      await apiClient.post(`/customers/${cust.id}/toggle-active/`);
      fetchCustomers();
    } catch (err) {
      alert('Failed to toggle status.');
    }
  };

  const getCustomerTypeBadge = (type) => {
    switch (type) {
      case 'WHOLESALE':
        return <span className="badge badge-danger">Wholesale Fleet</span>;
      case 'REPAIR_SHOP':
        return <span className="badge badge-warning">Repair Workshop</span>;
      case 'MECHANIC':
        return <span className="badge badge-info">Mechanic</span>;
      default:
        return <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>Individual</span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Customer Directory & Credit Balances
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Manage counter walk-in buyers, repeat mechanics, workshops, and commercial fleet credit lines.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="btn btn-primary"
          style={{ fontSize: '0.85rem' }}
        >
          + Register Customer
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search customers by name, phone number, address, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ width: '220px' }}>
            <select
              className="form-control"
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
            >
              <option value="">All Customer Types</option>
              <option value="INDIVIDUAL">Retail Individuals</option>
              <option value="MECHANIC">Independent Mechanics</option>
              <option value="REPAIR_SHOP">Repair Workshops</option>
              <option value="WHOLESALE">Wholesale Commercial Fleets</option>
            </select>
          </div>

          {(searchQuery || customerTypeFilter) && (
            <button
              onClick={() => { setSearchQuery(''); setCustomerTypeFilter(''); }}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Phone & Contact</th>
              <th>Customer Type</th>
              <th style={{ textAlign: 'right' }}>Credit Limit</th>
              <th style={{ textAlign: 'right' }}>Outstanding Balance</th>
              <th style={{ textAlign: 'right' }}>Available Credit</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Loading customer database...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No customers found matching your criteria.
                </td>
              </tr>
            ) : (
              customers.map((cust) => (
                <tr key={cust.id}>
                  <td>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{cust.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cust.address || 'No address logged'}</div>
                  </td>
                  <td>
                    <div>📞 {cust.phone}</div>
                    {cust.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>✉️ {cust.email}</div>}
                  </td>
                  <td>{getCustomerTypeBadge(cust.customer_type)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{parseFloat(cust.credit_limit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{
                      fontWeight: 700,
                      color: parseFloat(cust.outstanding_balance) > 0 ? '#b91c1c' : '#059669',
                      fontSize: '0.9rem'
                    }}>
                      ₹{parseFloat(cust.outstanding_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                    ₹{parseFloat(cust.available_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className={`badge ${cust.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {cust.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => handleViewHistory(cust)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Purchases ({cust.total_purchases_count})
                      </button>
                      <button
                        onClick={() => handleOpenModal(cust)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleToggleActive(cust)}
                          className={`btn ${cust.is_active ? 'btn-danger' : 'btn-success'}`}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          {cust.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog for Add / Edit Customer */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: 'var(--primary-navy)',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                {editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Register Customer Account'}
              </h3>
              <button
                onClick={handleCloseModal}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              {errorMsg && (
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--status-danger-bg)',
                  color: 'var(--status-danger-text)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  marginBottom: '16px'
                }}>
                  {errorMsg}
                </div>
              )}

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Full Name / Garage Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Master Mechanic Maqbool"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number * (10 Digits)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Customer Classification *</label>
                  <select
                    className="form-control"
                    value={formData.customer_type}
                    onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                  >
                    <option value="INDIVIDUAL">Retail Individual</option>
                    <option value="MECHANIC">Independent Mechanic</option>
                    <option value="REPAIR_SHOP">Repair Workshop</option>
                    <option value="WHOLESALE">Wholesale Commercial Fleet</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address (Optional)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. customer@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">
                    Credit Limit (₹) {isAdmin ? '' : '(🔒 Admin Only)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    disabled={!isAdmin}
                    style={{ backgroundColor: !isAdmin ? '#f1f5f9' : '#fff' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Outstanding Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formData.outstanding_balance}
                    onChange={(e) => setFormData({ ...formData, outstanding_balance: e.target.value })}
                    disabled={!isAdmin}
                    style={{ backgroundColor: !isAdmin ? '#f1f5f9' : '#fff' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Billing / Shop Address</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Local shop location, market stall, or residence..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Sales History Drawer Modal */}
      {selectedCustomerHistory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              backgroundColor: 'var(--primary-navy)',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                  Purchase Invoice History: {selectedCustomerHistory.customer_name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {selectedCustomerHistory.sales_history.length} invoices on file
                </span>
              </div>
              <button
                onClick={() => setSelectedCustomerHistory(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {selectedCustomerHistory.sales_history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No prior invoices found for this customer.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Sale Date</th>
                      <th>Payment Mode</th>
                      <th>Payment Status</th>
                      <th style={{ textAlign: 'right' }}>Invoice Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomerHistory.sales_history.map((inv) => (
                      <tr key={inv.id}>
                        <td><strong>{inv.invoice_number}</strong></td>
                        <td>{new Date(inv.sale_date).toLocaleDateString()}</td>
                        <td>{inv.payment_method}</td>
                        <td>
                          <span className={`badge ${
                            inv.payment_status === 'PAID' ? 'badge-success' :
                            inv.payment_status === 'PARTIALLY_PAID' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {inv.payment_status_display}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          ₹{parseFloat(inv.final_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedCustomerHistory(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
