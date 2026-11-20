import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function ProductList() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('');

  // Pagination State
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    oem_number: '',
    category: '',
    compatible_models: '',
    brand: '',
    supplier: '',
    purchase_price: '0.00',
    selling_price: '0.00',
    current_stock: 0,
    min_stock_level: 5,
    uom: 'PCS',
    description: '',
    is_battery: false
  });
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load auxiliary dropdowns (Categories and Suppliers)
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [catRes, supRes] = await Promise.all([
          apiClient.get('/categories/'),
          apiClient.get('/suppliers/')
        ]);
        setCategories(catRes.data.results || catRes.data);
        setSuppliers(supRes.data.results || supRes.data);
      } catch (err) {
        console.error('Failed to load auxiliary options:', err);
      }
    };
    loadDropdownData();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedBrand) params.append('brand', selectedBrand);
      if (selectedSupplier) params.append('supplier', selectedSupplier);
      if (selectedStockStatus) params.append('stock_status', selectedStockStatus);
      params.append('page', currentPage);

      const res = await apiClient.get(`/products/?${params.toString()}`);
      if (res.data.results) {
        setProducts(res.data.results);
        setTotalCount(res.data.count);
      } else {
        setProducts(res.data);
        setTotalCount(res.data.length);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory, selectedBrand, selectedSupplier, selectedStockStatus, currentPage]);

  const handleOpenModal = (product = null) => {
    setErrorMsg(null);
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku,
        oem_number: product.oem_number || '',
        category: product.category,
        compatible_models: product.compatible_models,
        brand: product.brand,
        supplier: product.supplier || '',
        purchase_price: product.purchase_price,
        selling_price: product.selling_price,
        current_stock: product.current_stock,
        min_stock_level: product.min_stock_level,
        uom: product.uom,
        description: product.description || '',
        is_battery: product.is_battery || false
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: '',
        oem_number: '',
        category: categories[0]?.id || '',
        compatible_models: '',
        brand: '',
        supplier: suppliers[0]?.id || '',
        purchase_price: '0.00',
        selling_price: '0.00',
        current_stock: 0,
        min_stock_level: 5,
        uom: 'PCS',
        description: '',
        is_battery: false
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      ...formData,
      category: parseInt(formData.category, 10),
      supplier: formData.supplier ? parseInt(formData.supplier, 10) : null,
      current_stock: parseInt(formData.current_stock, 10),
      min_stock_level: parseInt(formData.min_stock_level, 10)
    };

    try {
      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct.id}/`, payload);
      } else {
        await apiClient.post('/products/', payload);
      }
      handleCloseModal();
      fetchProducts();
    } catch (err) {
      const resp = err.response?.data;
      const detail = resp?.sku?.[0] || 
                     resp?.selling_price?.[0] || 
                     resp?.purchase_price?.[0] || 
                     resp?.current_stock?.[0] || 
                     resp?.detail || 
                     'Error saving product to catalog.';
      setErrorMsg(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (p) => {
    if (!isAdmin) return;
    try {
      await apiClient.post(`/products/${p.id}/toggle-active/`);
      fetchProducts();
    } catch (err) {
      alert('Failed to toggle status.');
    }
  };

  // Distinct Brands in current state
  const knownBrands = ['Bosch', 'TVS', 'Exide', 'Amaron', 'MICO', 'Mahindra Genuine'];

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Automobile Spare Parts Catalog
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Inventory master records for Cars, Bikes, Tractors, Lorries, and Harvesting Combine machines.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            + Add New Spare Part
          </button>
        )}
      </div>

      {/* KPI Metric Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '18px' }}>
        <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL CATALOG SKUs</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{totalCount}</div>
        </div>

        <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>IN STOCK ITEMS</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {products.filter(p => !p.is_low_stock && !p.is_out_of_stock).length}
          </div>
        </div>

        <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>LOW STOCK WARNINGS</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {products.filter(p => p.is_low_stock).length}
          </div>
        </div>

        <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>CRITICAL OUT OF STOCK</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
            {products.filter(p => p.is_out_of_stock).length}
          </div>
        </div>
      </div>

      {/* Multi-Criteria Filters Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
          <div>
            <input
              type="text"
              className="form-control"
              placeholder="Search by part name, SKU, OEM code, compatible model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <select
              className="form-control"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="form-control"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              <option value="">All Brands</option>
              {knownBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="form-control"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="form-control"
              value={selectedStockStatus}
              onChange={(e) => setSelectedStockStatus(e.target.value)}
            >
              <option value="">All Stock Levels</option>
              <option value="in_stock">Healthy Stock</option>
              <option value="low_stock">⚠️ Low Stock Alerts</option>
              <option value="out_of_stock">❌ Out of Stock</option>
            </select>
          </div>
        </div>

        {(searchQuery || selectedCategory || selectedBrand || selectedSupplier || selectedStockStatus) && (
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
                setSelectedBrand('');
                setSelectedSupplier('');
                setSelectedStockStatus('');
              }}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>SKU / OEM</th>
              <th>Product Name & Specification</th>
              <th>Category</th>
              <th>Compatible Models</th>
              <th>Brand</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>Cost Price</th>}
              <th style={{ textAlign: 'right' }}>Selling Price</th>
              <th style={{ textAlign: 'center' }}>Stock Level</th>
              <th>Status</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Loading catalog inventory...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No spare parts found matching the selected filters.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const isLow = p.is_low_stock;
                const isOut = p.is_out_of_stock;
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-navy)' }}>
                        {p.sku}
                      </div>
                      {p.oem_number && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          OEM: {p.oem_number}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {p.name}
                      </div>
                      {p.is_battery && (
                        <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '1px 5px', marginTop: '2px' }}>
                          ⚡ Battery
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 600 }}>
                        {p.category_name}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                      {p.compatible_models}
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{p.brand}</span>
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        ₹{parseFloat(p.purchase_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                      ₹{parseFloat(p.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        backgroundColor: isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#ecfdf5',
                        color: isOut ? '#991b1b' : isLow ? '#92400e' : '#065f46',
                        border: `1px solid ${isOut ? '#fecaca' : isLow ? '#fde68a' : '#a7f3d0'}`
                      }}>
                        {p.current_stock} {p.uom}
                      </span>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Min: {p.min_stock_level}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${p.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenModal(p)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(p)}
                            className={`btn ${p.is_active ? 'btn-danger' : 'btn-success'}`}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            {p.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog for Add / Edit Product */}
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
            maxWidth: '680px',
            maxHeight: '90vh',
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
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Register New Spare Part'}
              </h3>
              <button
                onClick={handleCloseModal}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
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
                  <label className="form-label">Part Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Swaraj 855 FE Hydraulic Pump"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Product Code / SKU * (Unique)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. TRAC-HYD-002"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>

              <div className="grid-cols-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">OEM Part # (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. SW855-HP-01"
                    value={formData.oem_number}
                    onChange={(e) => setFormData({ ...formData, oem_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle Category *</label>
                  <select
                    className="form-control"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Brand / Manufacturer *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Bosch, TVS, Exide"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Compatible Vehicles / Machine Models *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Mahindra 575 DI, Swaraj 855 FE, Sonalika 60"
                  value={formData.compatible_models}
                  onChange={(e) => setFormData({ ...formData, compatible_models: e.target.value })}
                  required
                />
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Primary Supplier (Optional)</label>
                  <select
                    className="form-control"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  >
                    <option value="">None / Open Sourced</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Unit of Measurement (UOM) *</label>
                  <select
                    className="form-control"
                    value={formData.uom}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                  >
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="SET">Set / Kit (SET)</option>
                    <option value="LTR">Litre (LTR)</option>
                    <option value="KG">Kilogram (KG)</option>
                    <option value="MTR">Meter (MTR)</option>
                  </select>
                </div>
              </div>

              <div className="grid-cols-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Purchase Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Selling Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Available Stock *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Min Stock Level *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_battery}
                    onChange={(e) => setFormData({ ...formData, is_battery: e.target.checked })}
                  />
                  <span>This item is a <strong>Storage Battery</strong> (enables battery exchange workflow in Phase 8)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
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
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Register Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
