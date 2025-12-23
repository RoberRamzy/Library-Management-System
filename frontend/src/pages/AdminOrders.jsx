import React, { useState, useEffect } from 'react'
import { apiBase } from '../App'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [books, setBooks] = useState([])
  const [publishers, setPublishers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [orderForm, setOrderForm] = useState({
    ISBN: '',
    PubID: '',
    Quantity: 50  // Constant quantity as per requirements
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
    } else if (user.Role !== 'Admin') {
      navigate('/')
    } else {
      loadOrders()
      loadBooks()
      loadPublishers()
    }
  }, [user])

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/admin/publisher-orders`)
      if (!res.ok) throw new Error('Failed to load orders')
      const data = await res.json()
      setOrders(data)
    } catch (err) {
      setError('Failed to load publisher orders')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadBooks = async () => {
    try {
      const res = await fetch(`${apiBase}/books/search`)
      if (!res.ok) throw new Error('Failed to load books')
      const data = await res.json()
      setBooks(data)
    } catch (err) {
      console.error('Failed to load books:', err)
    }
  }

  const loadPublishers = async () => {
    try {
      const res = await fetch(`${apiBase}/admin/publishers`)
      if (!res.ok) throw new Error('Failed to load publishers')
      const data = await res.json()
      setPublishers(data)
    } catch (err) {
      console.error('Failed to load publishers:', err)
    }
  }

  const handleConfirmOrder = async (orderID) => {
    if (!window.confirm('Are you sure you want to confirm this order? Stock will be automatically added.')) {
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/admin/confirm-order/${orderID}`, {
        method: 'PUT'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to confirm order')
      }

      setMessage('Order confirmed! Stock has been updated.')
      loadOrders()
      loadBooks() // Refresh books to show updated stock
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to confirm order')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrder = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const res = await fetch(`${apiBase}/admin/publisher-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ISBN: orderForm.ISBN,
          PubID: parseInt(orderForm.PubID),
          Quantity: parseInt(orderForm.Quantity)
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to create order')
      }

      const data = await res.json()
      setMessage(`Order created successfully! Order ID: ${data.orderID}`)
      setShowCreateForm(false)
      setOrderForm({ ISBN: '', PubID: '', Quantity: 50 })
      loadOrders()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const getSelectedBook = () => {
    return books.find(b => b.ISBN === orderForm.ISBN)
  }

  const handleBookChange = (isbn) => {
    const book = books.find(b => b.ISBN === isbn)
    if (book) {
      setOrderForm(prev => ({ ...prev, ISBN: isbn, PubID: book.PubID.toString() }))
    } else {
      setOrderForm(prev => ({ ...prev, ISBN: isbn }))
    }
  }

  if (!user || user.Role !== 'Admin') {
    return null
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="page-title">Publisher Orders Management</h2>
        <button
          className="button button-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Place New Order'}
        </button>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Create Order Form */}
      {showCreateForm && (
        <div className="admin-section" style={{ marginBottom: '2rem' }}>
          <h3>Place New Publisher Order</h3>
          <form onSubmit={handleCreateOrder} className="form-grid">
            <div className="form-group">
              <label>Book (ISBN) *</label>
              <select
                className="input"
                value={orderForm.ISBN}
                onChange={(e) => handleBookChange(e.target.value)}
                required
              >
                <option value="">Select Book</option>
                {books.map(book => (
                  <option key={book.ISBN} value={book.ISBN}>
                    {book.ISBN} - {book.Title} (Stock: {book.StockQuantity}, Threshold: {book.threshold})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Publisher *</label>
              <select
                className="input"
                value={orderForm.PubID}
                onChange={(e) => setOrderForm({ ...orderForm, PubID: e.target.value })}
                required
              >
                <option value="">Select Publisher</option>
                {publishers.map(pub => (
                  <option key={pub.PubID} value={pub.PubID}>{pub.name}</option>
                ))}
              </select>
              {getSelectedBook() && (
                <p className="small" style={{ marginTop: '0.5rem', color: '#666' }}>
                  Book's Publisher: {publishers.find(p => p.PubID === getSelectedBook().PubID)?.name || 'N/A'}
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Quantity *</label>
              <input
                className="input"
                type="number"
                min="1"
                value={orderForm.Quantity}
                onChange={(e) => setOrderForm({ ...orderForm, Quantity: parseInt(e.target.value) || 50 })}
                required
              />
              <p className="small" style={{ marginTop: '0.5rem', color: '#666' }}>
                Default order quantity: 50
              </p>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <button className="button button-primary" type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Place Order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Orders List */}
      <div className="admin-section">
        <h3>Publisher Orders</h3>
        <button className="button button-secondary" onClick={loadOrders} disabled={loading} style={{ marginBottom: '1rem' }}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>

        {loading && orders.length === 0 ? (
          <div className="loading">Loading orders...</div>
        ) : orders.length === 0 ? (
          <p className="empty-state">No publisher orders found</p>
        ) : (
          <div className="orders-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Book (ISBN)</th>
                  <th>Title</th>
                  <th>Publisher</th>
                  <th>Quantity</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.orderID}>
                    <td>{order.orderID}</td>
                    <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                    <td>{order.ISBN}</td>
                    <td>{order.Title}</td>
                    <td>{order.publisher_name}</td>
                    <td>{order.Quantity}</td>
                    <td>{order.StockQuantity}</td>
                    <td>{order.threshold}</td>
                    <td>
                      <span className={`role-badge ${order.status === 'Confirmed' ? 'role-admin' : 'role-customer'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {order.status === 'Pending' ? (
                        <button
                          className="button button-primary button-small"
                          onClick={() => handleConfirmOrder(order.orderID)}
                          disabled={loading}
                        >
                          Confirm Order
                        </button>
                      ) : (
                        <span className="text-muted">Confirmed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="info-box" style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h4 style={{ marginTop: 0 }}>About Publisher Orders</h4>
        <ul style={{ marginBottom: 0, paddingLeft: '1.5rem' }}>
          <li>Orders are automatically created when book stock drops below threshold</li>
          <li>Default order quantity is 50 units (configurable when placing manual orders)</li>
          <li>When you confirm an order, stock is automatically added to the book</li>
          <li>Only pending orders can be confirmed</li>
        </ul>
      </div>
    </div>
  )
}

