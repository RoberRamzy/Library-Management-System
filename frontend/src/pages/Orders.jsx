import React, { useEffect, useState } from 'react'
import { apiBase } from '../App'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      load()
    } else {
      navigate('/login')
    }
  }, [user])

  const load = async () => {
    if (!user) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/customer/orders/${user.userID}`)
      if (!res.ok) throw new Error('Failed to load orders')

      const data = await res.json()
      setOrders(data)
    } catch (err) {
      setError('Failed to load orders. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="page">
      <h2 className="page-title">Your Orders</h2>

      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : orders.length === 0 ? (
        <div className="empty-state-container">
          <p className="empty-state">You haven't placed any orders yet</p>
          <Link to="/search">
            <button className="button button-primary">Browse Books</button>
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.orderID} className="order-card">
              <div className="order-header">
                <div>
                  <h3 className="order-id">Order #{order.orderID}</h3>
                  <div className="order-meta">
                    <span className="order-date">Date: {new Date(order.orderDate).toLocaleDateString()}</span>
                    <span className={`order-status status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                <div className="order-total">
                  ${parseFloat(order.totalPrice).toFixed(2)}
                </div>
              </div>
              <div className="order-items">
                <strong>Items:</strong> {order.items}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
