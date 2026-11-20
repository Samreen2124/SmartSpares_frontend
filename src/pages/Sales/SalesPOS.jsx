import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';

export default function SalesPOS() {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'history' | 'settlement'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // POS State
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [billDiscount, setBillDiscount] = useState('0.00');
  const [taxRate, setTaxRate] = useState('18.00');
  const [batteryRebate, setBatteryRebate] = useState('0.00');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [saleNotes, setSaleNotes] = useState('');

  // Invoice History State
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');

  // Modals
  const [printInvoiceData, setPrintInvoiceData] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Credit Settlement State
  const [settleCustomerId, setSettleCustomerId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('CASH');
  const [settleRef, setSettleRef] = useState('');
  const [settleNotes, setSettleNotes] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchInvoices();
    }
  }, [activeTab, historyStatusFilter]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, custRes, sumRes] = await Promise.all([
        apiClient.get('/products/?is_active=true'),
        apiClient.get('/categories/?is_active=true'),
        apiClient.get('/customers/?is_active=true'),
        apiClient.get('/sales/invoices/today-summary/')
      ]);
      setProducts(prodRes.data.results || prodRes.data || []);
      setCategories(catRes.data.results || catRes.data || []);
      setCustomers(custRes.data.results || custRes.data || []);
      setTodaySummary(sumRes.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to initialize POS terminal.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      let url = '/sales/invoices/';
      const params = new URLSearchParams();
      if (historyStatusFilter) params.append('payment_status', historyStatusFilter);
      if (historySearch) params.append('search', historySearch);
      const q = params.toString();
      if (q) url += `?${q}`;

      const res = await apiClient.get(url);
      setInvoices(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load invoices.');
    }
  };

  // Cart Management
  const addToCart = (product) => {
    if (product.current_stock <= 0) {
      alert(`Cannot add '${product.name}' - Out of Stock!`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          alert(`Cannot exceed available stock of ${product.current_stock} units.`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        product,
        quantity: 1,
        unit_price: product.selling_price,
        discount: '0.00'
      }];
    });
  };

  const updateCartQty = (productId, newQty) => {
    const qty = parseInt(newQty, 10);
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        if (isNaN(qty) || qty < 1) return { ...item, quantity: 1 };
        if (qty > item.product.current_stock) {
          alert(`Maximum available stock for ${item.product.name} is ${item.product.current_stock}.`);
          return { ...item, quantity: item.product.current_stock };
        }
        return { ...item, quantity: qty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setBillDiscount('0.00');
    setBatteryRebate('0.00');
    setPaidAmount('');
    setPaymentRef('');
    setSaleNotes('');
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    cart.forEach(item => {
      const q = item.quantity || 1;
      const p = parseFloat(item.unit_price) || 0;
      const d = parseFloat(item.discount) || 0;
      subtotal += Math.max(0, (q * p) - d);
    });

    const bDisc = parseFloat(billDiscount) || 0;
    const taxable = Math.max(0, subtotal - bDisc);
    const tRate = parseFloat(taxRate) || 0;
    const tax = taxable * (tRate / 100);
    const gross = taxable + tax;
    const batRebate = parseFloat(batteryRebate) || 0;
    const finalAmount = Math.max(0, gross - batRebate);

    return {
      subtotal: subtotal.toFixed(2),
      taxable: taxable.toFixed(2),
      tax: tax.toFixed(2),
      finalAmount: finalAmount.toFixed(2)
    };
  };

  const totals = calculateTotals();

  // Selected Customer details
  const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId, 10));

  // Handle POS Sale Submission
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty! Please select at least one spare part.');
      return;
    }

    if (paymentMethod === 'CREDIT' && !selectedCustomerId) {
      alert('Store Credit purchase requires selecting a registered customer.');
      return;
    }

    const finalVal = parseFloat(totals.finalAmount);
    let paidVal = paidAmount === '' ? finalVal : parseFloat(paidAmount);
    if (paymentMethod === 'CREDIT' && paidAmount === '') {
      paidVal = 0;
    }

    if (paidVal > finalVal) {
      alert(`Paid amount (₹${paidVal}) cannot exceed final bill (₹${finalVal}).`);
      return;
    }

    const balVal = finalVal - paidVal;
    if (balVal > 0 && !selectedCustomerId) {
      alert('Walk-in retail sales must be paid in full. Unpaid balances require a customer account.');
      return;
    }

    if (selectedCustomer && balVal > 0) {
      const curBal = parseFloat(selectedCustomer.outstanding_balance) || 0;
      const credLimit = parseFloat(selectedCustomer.credit_limit) || 0;
      if (curBal + balVal > credLimit) {
        alert(`Credit limit exceeded! Customer balance (₹${curBal}) + new credit (₹${balVal.toFixed(2)}) exceeds limit of ₹${credLimit}.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        customer: selectedCustomerId ? parseInt(selectedCustomerId, 10) : null,
        payment_method: paymentMethod,
        discount_amount: parseFloat(billDiscount) || 0,
        tax_rate: parseFloat(taxRate) || 18,
        battery_exchange_discount: parseFloat(batteryRebate) || 0,
        paid_amount: paidVal.toFixed(2),
        payment_reference: paymentRef,
        notes: saleNotes,
        items: cart.map(it => ({
          product: it.product.id,
          quantity: it.quantity,
          unit_price: parseFloat(it.unit_price).toFixed(2),
          discount: parseFloat(it.discount || 0).toFixed(2)
        }))
      };

      const res = await apiClient.post('/sales/invoices/', payload);
      setSuccessMsg(`Invoice ${res.data.invoice_number} created successfully! Total: ₹${res.data.final_amount}`);
      setPrintInvoiceData(res.data);
      clearCart();
      // Refresh products stock & today summary
      fetchInitialData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.response?.data?.detail || 'Failed to process sale.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cancel Invoice
  const handleConfirmCancel = async () => {
    if (!invoiceToCancel) return;
    try {
      setSubmitting(true);
      await apiClient.post(`/sales/invoices/${invoiceToCancel.id}/cancel/`, {
        reason: cancelReason || 'Customer return / order cancelled'
      });
      setSuccessMsg(`Invoice ${invoiceToCancel.invoice_number} cancelled. Stock restored.`);
      setShowCancelModal(false);
      setInvoiceToCancel(null);
      setCancelReason('');
      fetchInvoices();
      fetchInitialData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to cancel invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Customer Settlement
  const handleSettleCustomer = async (e) => {
    e.preventDefault();
    if (!settleCustomerId) {
      alert('Please select a customer.');
      return;
    }
    const amt = parseFloat(settleAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.post('/sales/payments/settle-customer/', {
        customer: parseInt(settleCustomerId, 10),
        amount: amt.toFixed(2),
        payment_method: settleMethod,
        reference_number: settleRef,
        notes: settleNotes
      });
      setSuccessMsg(`Payment receipt ${res.data.payment_number} processed! Amount: ₹${res.data.amount}`);
      setSettleAmount('');
      setSettleRef('');
      setSettleNotes('');
      fetchInitialData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to record settlement payment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products by category & search
  const filteredProducts = products.filter(p => {
    const matchesCat = !selectedCategory || p.category === parseInt(selectedCategory, 10);
    const matchesSearch = !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(productSearch.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Paid</span>;
      case 'PARTIALLY_PAID':
        return <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Partially Paid</span>;
      case 'UNPAID':
        return <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Unpaid (Credit)</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Sales, Billing & POS
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.875rem' }}>
            Fast counter checkout, inventory deduction, GST calculation, customer credit, and tax invoices.
          </p>
        </div>

        {/* Tab Navigation Buttons */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('pos')}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              backgroundColor: activeTab === 'pos' ? '#ffffff' : 'transparent',
              color: activeTab === 'pos' ? 'var(--accent-blue)' : '#64748b',
              boxShadow: activeTab === 'pos' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            🛒 POS Terminal
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              backgroundColor: activeTab === 'history' ? '#ffffff' : 'transparent',
              color: activeTab === 'history' ? 'var(--accent-blue)' : '#64748b',
              boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            📋 Invoices Ledger
          </button>
          <button
            onClick={() => setActiveTab('settlement')}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              backgroundColor: activeTab === 'settlement' ? '#ffffff' : 'transparent',
              color: activeTab === 'settlement' ? 'var(--accent-blue)' : '#64748b',
              boxShadow: activeTab === 'settlement' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            💳 Customer Settlements
          </button>
        </div>
      </div>

      {/* Today KPI Strip */}
      {todaySummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <div className="card" style={{ padding: '12px 16px', borderLeft: '4px solid var(--accent-blue)' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Today's Invoices</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>{todaySummary.total_invoices}</div>
          </div>
          <div className="card" style={{ padding: '12px 16px', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Today's Billed</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#047857' }}>
              ₹{parseFloat(todaySummary.total_billed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="card" style={{ padding: '12px 16px', borderLeft: '4px solid #6366f1' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Cash / UPI Collected</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
              ₹{parseFloat(todaySummary.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="card" style={{ padding: '12px 16px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Credit Extended</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#b45309' }}>
              ₹{parseFloat(todaySummary.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {successMsg && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}
      {errorMsg && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          ⚠ {errorMsg}
        </div>
      )}

      {/* TAB 1: POS BILLING TERMINAL */}
      {activeTab === 'pos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 480px', gap: '20px', alignItems: 'start' }}>
          {/* Left Panel: Catalog & Spare Parts Search */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search part by name, SKU, brand, model..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="form-control"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ width: '200px' }}>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="form-control"
                  style={{ width: '100%' }}
                >
                  <option value="">All Vehicle Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', maxHeight: '680px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredProducts.map(p => {
                const isOutOfStock = p.current_stock <= 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px',
                      backgroundColor: isOutOfStock ? '#f8fafc' : '#ffffff',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      opacity: isOutOfStock ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => { if (!isOutOfStock) e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
                    onMouseLeave={(e) => { if (!isOutOfStock) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {p.category_name}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: isOutOfStock ? '#fee2e2' : p.current_stock < 10 ? '#fef3c7' : '#dcfce7',
                          color: isOutOfStock ? '#991b1b' : p.current_stock < 10 ? '#b45309' : '#15803d'
                        }}>
                          {isOutOfStock ? 'Out of Stock' : `${p.current_stock} in stock`}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: '4px 0 2px' }}>
                        {p.name}
                      </h4>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        SKU: <strong>{p.sku}</strong> | Brand: {p.brand || 'OEM'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                        ₹{parseFloat(p.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', pointerEvents: 'none' }}
                        disabled={isOutOfStock}
                      >
                        {isOutOfStock ? 'Sold Out' : '+ Add'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Active Cart & Bill Settlement */}
          <div className="card" style={{ padding: '20px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                🛒 Active Sale Cart ({cart.length})
              </h2>
              {cart.length > 0 && (
                <button onClick={clearCart} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Customer Account
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="form-control"
                style={{ width: '100%' }}
              >
                <option value="">👤 Walk-in Retail Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - {c.customer_type}
                  </option>
                ))}
              </select>

              {/* Customer Balance info strip */}
              {selectedCustomer && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', marginTop: '6px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Outstanding Bal: <strong style={{ color: '#b45309' }}>₹{parseFloat(selectedCustomer.outstanding_balance).toFixed(2)}</strong></span>
                  <span>Credit Limit: <strong>₹{parseFloat(selectedCustomer.credit_limit).toFixed(2)}</strong></span>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No items in cart.<br />Click products on the left to add.
                </div>
              ) : (
                cart.map(item => {
                  const lineTotal = (item.quantity * parseFloat(item.unit_price) - (parseFloat(item.discount) || 0)).toFixed(2);
                  return (
                    <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f1f5f9', gap: '8px' }}>
                      <div style={{ flex: '1 1 120px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.product.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>₹{item.unit_price} / unit</div>
                      </div>

                      {/* Qty Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                          style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.product.current_stock}
                          value={item.quantity}
                          onChange={(e) => updateCartQty(item.product.id, e.target.value)}
                          style={{ width: '38px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 0', fontSize: '0.85rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                          style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>

                      <div style={{ fontWeight: 600, fontSize: '0.85rem', width: '70px', textAlign: 'right' }}>
                        ₹{parseFloat(lineTotal).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '2px' }}
                      >
                        🗑
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Calculations & Discounts */}
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Cart Subtotal:</span>
                <strong style={{ color: 'var(--text-main)' }}>₹{totals.subtotal}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Discount (₹):</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={billDiscount}
                  onChange={(e) => setBillDiscount(e.target.value)}
                  style={{ width: '90px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 6px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>GST Tax Rate:</span>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  style={{ width: '90px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 6px' }}
                >
                  <option value="0.00">0% Exempt</option>
                  <option value="5.00">5% GST</option>
                  <option value="12.00">12% GST</option>
                  <option value="18.00">18% Standard</option>
                  <option value="28.00">28% Luxury</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tax Amount ({taxRate}%):</span>
                <span>₹{totals.tax}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
                <span style={{ color: '#047857', fontWeight: 600 }}>🔋 Battery Trade-In Rebate (₹):</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={batteryRebate}
                  onChange={(e) => setBatteryRebate(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '90px', textAlign: 'right', border: '1px solid #86efac', borderRadius: '4px', padding: '2px 6px', color: '#047857', fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #e2e8f0', paddingTop: '8px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Final Payable:</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                  ₹{totals.finalAmount}
                </span>
              </div>
            </div>

            {/* Payment Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Payment Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="form-control"
                  >
                    <option value="CASH">💵 Cash</option>
                    <option value="UPI">📱 UPI / QR</option>
                    <option value="CARD">💳 Card</option>
                    <option value="CREDIT">🧾 Store Credit</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Amount Paid (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={paymentMethod === 'CREDIT' ? '0.00' : totals.finalAmount}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <input
                type="text"
                placeholder="UPI UTR #, Card Auth Ref, or Cheque No."
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.8rem' }}
              />

              <input
                type="text"
                placeholder="Order notes / vehicle registration number..."
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.8rem' }}
              />
            </div>

            {/* Submit Checkout Button */}
            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={submitting || cart.length === 0}
              className="btn btn-primary"
              style={{
                padding: '12px',
                fontSize: '1rem',
                fontWeight: 700,
                backgroundColor: cart.length === 0 ? '#cbd5e1' : '#059669',
                borderColor: cart.length === 0 ? '#cbd5e1' : '#059669',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {submitting ? 'Processing Invoice...' : `✓ Complete Sale (₹${totals.finalAmount})`}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES HISTORY & LEDGER */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flex: '1 1 300px' }}>
              <input
                type="text"
                placeholder="Search invoice #, customer name, phone..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="form-control"
                style={{ width: '100%' }}
              />
              <button onClick={fetchInvoices} className="btn btn-secondary">🔍 Search</button>
            </div>

            <div style={{ width: '180px' }}>
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="form-control"
              >
                <option value="">All Payment Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="UNPAID">Unpaid (Credit)</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>Invoice #</th>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Customer</th>
                  <th style={{ padding: '10px 14px' }}>Items</th>
                  <th style={{ padding: '10px 14px' }}>Bill Amount</th>
                  <th style={{ padding: '10px 14px' }}>Paid</th>
                  <th style={{ padding: '10px 14px' }}>Balance Due</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  invoices.map(inv => {
                    const isCancelled = inv.notes && inv.notes.includes('CANCELLED');
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: isCancelled ? 0.6 : 1 }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                          {inv.invoice_number}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#64748b' }}>
                          {new Date(inv.sale_date).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                          {inv.customer_name}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>
                          {inv.items_count} items
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                          ₹{parseFloat(inv.final_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#059669', fontWeight: 600 }}>
                          ₹{parseFloat(inv.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 14px', color: parseFloat(inv.balance_amount) > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                          ₹{parseFloat(inv.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {isCancelled ? (
                            <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>CANCELLED</span>
                          ) : (
                            getStatusBadge(inv.payment_status)
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={async () => {
                                const res = await apiClient.get(`/sales/invoices/${inv.id}/`);
                                setPrintInvoiceData(res.data);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            >
                              🖨 Print
                            </button>
                            {!isCancelled && (
                              <button
                                onClick={() => {
                                  setInvoiceToCancel(inv);
                                  setShowCancelModal(true);
                                }}
                                className="btn"
                                style={{ padding: '3px 8px', fontSize: '0.75rem', color: '#dc2626', border: '1px solid #fecaca' }}
                              >
                                ✕ Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER BALANCE SETTLEMENT */}
      {activeTab === 'settlement' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>
              💳 Customer Credit Settlement
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
              Record credit payments from mechanics or fleet accounts and auto-allocate across open invoices.
            </p>

            <form onSubmit={handleSettleCustomer}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Select Customer *</label>
                <select
                  value={settleCustomerId}
                  onChange={(e) => {
                    setSettleCustomerId(e.target.value);
                    const c = customers.find(item => item.id === parseInt(e.target.value, 10));
                    if (c) setSettleAmount(c.outstanding_balance);
                  }}
                  className="form-control"
                  required
                >
                  <option value="">Select customer with outstanding balance</option>
                  {customers.filter(c => parseFloat(c.outstanding_balance) > 0).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Outstanding: ₹{parseFloat(c.outstanding_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Settlement Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Payment Mode *</label>
                  <select
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value)}
                    className="form-control"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. PhonePe UTR # or Cheque # 400192"
                  value={settleRef}
                  onChange={(e) => setSettleRef(e.target.value)}
                  className="form-control"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Remarks / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Partial balance clearance for Nov purchases"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="form-control"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 600, backgroundColor: '#059669', borderColor: '#059669' }}
                disabled={submitting}
              >
                {submitting ? 'Processing Payment...' : 'Confirm Balance Settlement & Issue Receipt'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE MODAL */}
      {printInvoiceData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', maxHeight: '95vh', overflowY: 'auto', padding: '32px', backgroundColor: '#ffffff', color: '#0f172a' }}>
            {/* Action Bar (Not Printed) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <button
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                🖨 Print Invoice Receipt
              </button>
              <button
                onClick={() => setPrintInvoiceData(null)}
                className="btn btn-secondary"
              >
                ✕ Close
              </button>
            </div>

            {/* Printable Receipt Body */}
            <div id="printable-receipt" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '1px' }}>AUTOPARTS PRO</h2>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>Automobile Spare Parts & Industrial Machinery</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Plot 44, Industrial Area, Ring Road | Phone: +91 98765 43210</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>GSTIN: 29AAAAA0000A1Z5</div>
                <div style={{ borderBottom: '1px dashed #64748b', margin: '10px 0' }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>TAX INVOICE / CASH BILL</div>
              </div>

              {/* Invoice Metadata */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.8rem' }}>
                <div>
                  <div>Invoice: <strong>#{printInvoiceData.invoice_number}</strong></div>
                  <div>Date: {new Date(printInvoiceData.sale_date).toLocaleString()}</div>
                  <div>Staff: {printInvoiceData.served_by_name || 'Counter'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Customer: <strong>{printInvoiceData.customer_name}</strong></div>
                  <div>Phone: {printInvoiceData.customer_phone || 'N/A'}</div>
                  <div>Payment: <strong>{printInvoiceData.payment_method_display}</strong></div>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #64748b', margin: '8px 0' }} />

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', fontSize: '0.75rem' }}>
                    <th style={{ padding: '4px 0' }}>Item Description</th>
                    <th style={{ padding: '4px 0', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '4px 0', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '4px 0', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(printInvoiceData.items || []).map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px dotted #e2e8f0' }}>
                      <td style={{ padding: '6px 0' }}>
                        <div>{it.product_name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>SKU: {it.product_sku}</div>
                      </td>
                      <td style={{ padding: '6px 0', textAlign: 'center' }}>{it.quantity}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>₹{parseFloat(it.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>₹{parseFloat(it.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderBottom: '1px dashed #64748b', margin: '8px 0' }} />

              {/* Financial Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'right', fontSize: '0.8rem' }}>
                <div>Subtotal: ₹{parseFloat(printInvoiceData.subtotal).toFixed(2)}</div>
                {parseFloat(printInvoiceData.discount_amount) > 0 && (
                  <div>Discount: -₹{parseFloat(printInvoiceData.discount_amount).toFixed(2)}</div>
                )}
                <div>Tax ({printInvoiceData.tax_rate}% GST): ₹{parseFloat(printInvoiceData.tax_amount).toFixed(2)}</div>
                {parseFloat(printInvoiceData.battery_exchange_discount) > 0 && (
                  <div style={{ color: '#047857', fontWeight: 600 }}>
                    Old Battery Rebate: -₹{parseFloat(printInvoiceData.battery_exchange_discount).toFixed(2)}
                  </div>
                )}
                <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '1rem', fontWeight: 800 }}>
                  NET PAYABLE: ₹{parseFloat(printInvoiceData.final_amount).toFixed(2)}
                </div>
                <div>Amount Paid: ₹{parseFloat(printInvoiceData.paid_amount).toFixed(2)}</div>
                {parseFloat(printInvoiceData.balance_amount) > 0 && (
                  <div style={{ color: '#dc2626', fontWeight: 700 }}>
                    BALANCE DUE: ₹{parseFloat(printInvoiceData.balance_amount).toFixed(2)}
                  </div>
                )}
              </div>

              <div style={{ borderBottom: '1px dashed #64748b', margin: '12px 0' }} />

              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                <div>Thank you for your business!</div>
                <div>Spare parts once sold can be returned within 7 days in original condition.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL INVOICE MODAL */}
      {showCancelModal && invoiceToCancel && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px', color: '#dc2626' }}>
              Cancel Invoice #{invoiceToCancel.invoice_number}?
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              This will automatically return all sold items back into active warehouse stock and reverse any customer credit balance.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Cancellation Reason *</label>
              <input
                type="text"
                placeholder="e.g. Customer cancelled order / defective return"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="form-control"
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setShowCancelModal(false); setInvoiceToCancel(null); }}
                className="btn btn-secondary"
                disabled={submitting}
              >
                No, Keep Invoice
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="btn"
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                disabled={submitting}
              >
                {submitting ? 'Restoring Stock...' : 'Yes, Cancel & Restore Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
