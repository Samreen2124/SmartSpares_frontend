import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function CategoryList() {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const url = searchQuery ? `/categories/?search=${encodeURIComponent(searchQuery)}` : '/categories/';
      const res = await apiClient.get(url);
      setCategories(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [searchQuery]);

  const handleOpenModal = (category = null) => {
    setErrorMsg(null);
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        code: category.code,
        description: category.description || ''
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', code: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', code: '', description: '' });
    setErrorMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingCategory) {
        await apiClient.put(`/categories/${editingCategory.id}/`, formData);
      } else {
        await apiClient.post('/categories/', formData);
      }
      handleCloseModal();
      fetchCategories();
    } catch (err) {
      const detail = err.response?.data?.code?.[0] || 
                     err.response?.data?.name?.[0] || 
                     err.response?.data?.detail || 
                     'Error saving category.';
      setErrorMsg(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (cat) => {
    if (!isAdmin) return;
    try {
      await apiClient.post(`/categories/${cat.id}/toggle-active/`);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle category status.');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Vehicle & Equipment Categories
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Manage classifications for Cars, Bikes, Tractors, Trucks, Harvesters, and Agricultural Machinery.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            + Add New Category
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search category by name, shorthand code, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Code</th>
              <th>Category Name</th>
              <th>Description</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Active Spares</th>
              <th style={{ width: '110px' }}>Status</th>
              {isAdmin && <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Loading vehicle categories from MySQL...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No vehicle categories found matching your criteria.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      backgroundColor: '#f1f5f9',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      color: 'var(--primary-navy)'
                    }}>
                      {cat.code}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontSize: '0.9rem' }}>{cat.name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                    {cat.description || '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-info">
                      {cat.product_count} products
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${cat.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {cat.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenModal(cat)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(cat)}
                          className={`btn ${cat.is_active ? 'btn-danger' : 'btn-success'}`}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          {cat.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog for Add / Edit Category */}
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
            maxWidth: '500px',
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
                {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Vehicle Category'}
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

              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Tractors or Harvesting Machines"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Shorthand Code * (Uppercase, e.g. TRAC, HARV, CAR)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. TRAC"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Scope and machine types covered by this category..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
