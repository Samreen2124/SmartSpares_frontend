import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function SupplierList() {
  const { isAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    outstanding_balance: '0.00'
  });
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History Drawer State
  const [selectedSupplierHistory, setSelectedSupplierHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const url = searchQuery ? `/suppliers/?search=${encodeURIComponent(searchQuery)}` : '/suppliers/';
      const res = await apiClient.get(url);
      setSuppliers(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [searchQuery]);

  const handleOpenModal = (supplier = null) => {
    setErrorMsg(null);
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person,
        phone: supplier.phone,
        email: supplier.email || '',
        address: supplier.address,
        gst_number: supplier.gst_number || '',
        outstanding_balance: supplier.outstanding_balance || '0.00'
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        gst_number: '',
        outstanding_balance: '0.00'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingSupplier) {
        await apiClient.put(`/suppliers/${editingSupplier.id}/`, formData);
      } else {
        await apiClient.post('/suppliers/', formData);
      }
      handleCloseModal();
      fetchSuppliers();
    } catch (err) {
      const detail = err.response?.data?.phone?.[0] || 
                     err.response?.data?.name?.[0] || 
                     err.response?.data?.detail || 
                     'Error saving supplier.';
      setErrorMsg(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewHistory = async (supplier) => {
    setHistoryLoading(true);
    try {
      const res = await apiClient.get(`/suppliers/${supplier.id}/purchase-history/`);
      setSelectedSupplierHistory(res.data);
    } catch (err) {
      alert('Failed to retrieve supplier purchase history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleActive = async (sup) => {
    if (!isAdmin) return;
    try {
      await apiClient.post(`/suppliers/${sup.id}/toggle-active/`);
      fetchSuppliers();
    } catch (err) {
      alert('Failed to toggle status.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Supplier & Distributor Management
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Track spare parts vendors, bulk purchase order histories, and outstanding payable balances.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            + Add New Supplier
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '18px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Search suppliers by company name, contact person, phone, email, or GST number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Contact Person</th>
              <th>Phone & Email</th>
              <th>GST Number</th>
              <th style={{ textAlign: 'center' }}>Supplied Spares</th>
              <th style={{ textAlign: 'right' }}>Outstanding Balance</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Loading supplier directory...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No suppliers found matching your query.
                </td>
              </tr>
            ) : (
              suppliers.map((sup) => (
                <tr key={sup.id}>
                  <td>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{sup.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sup.address}</div>
                  </td>
                  <td>{sup.contact_person}</td>
                  <td>
                    <div>📞 {sup.phone}</div>
                    {sup.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>✉️ {sup.email}</div>}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {sup.gst_number || '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-info">{sup.supplied_products_count} parts</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{
                      fontWeight: 700,
                      color: parseFloat(sup.outstanding_balance) > 0 ? '#b91c1c' : '#059669',
                      fontSize: '0.9rem'
                    }}>
                      ₹{parseFloat(sup.outstanding_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${sup.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {sup.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => handleViewHistory(sup)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Orders ({sup.total_orders})
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenModal(sup)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(sup)}
                            className={`btn ${sup.is_active ? 'btn-danger' : 'btn-success'}`}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            {sup.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog for Add / Edit Supplier */}
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
                {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Register New Supplier'}
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
                  <label className="form-label">Supplier Company Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Bosch India Automotive"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Person Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Rajesh Sharma"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address (Optional)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. vendor@spares.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">GST Number (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 29AABCB1234F1Z1"
                    value={formData.gst_number}
                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
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
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Warehouse / Office Address *</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Complete physical address..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
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
                  {isSubmitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Purchase History Drawer Modal */}
      {selectedSupplierHistory && (
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
                  Purchase Order History: {selectedSupplierHistory.supplier_name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {selectedSupplierHistory.purchase_orders.length} total orders recorded
                </span>
              </div>
              <button
                onClick={() => setSelectedSupplierHistory(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {selectedSupplierHistory.purchase_orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No bulk purchase orders have been placed with this supplier yet.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PO Number</th>
                      <th>Order Date</th>
                      <th>Expected Delivery</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSupplierHistory.purchase_orders.map((po) => (
                      <tr key={po.id}>
                        <td><strong>{po.po_number}</strong></td>
                        <td>{po.order_date}</td>
                        <td>{po.expected_delivery_date || '—'}</td>
                        <td>
                          <span className={`badge ${
                            po.status === 'RECEIVED' ? 'badge-success' :
                            po.status === 'PARTIALLY_RECEIVED' ? 'badge-warning' :
                            po.status === 'CANCELLED' ? 'badge-danger' : 'badge-info'
                          }`}>
                            {po.status_display}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          ₹{parseFloat(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedSupplierHistory(null)}
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
