import React, { useEffect, useState } from 'react'
import { apiBase } from '../App'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Cart() {
  const [cart, setCart] = useState({ items: [], cart_total: 0 })
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
      const res = await fetch(`${apiBase}/cart/${user.userID}`)
      if (!res.ok) throw new Error('Failed to load cart')
      
      const data = await res.json()
      setCart(data)
    } catch (err) {
      setError('Failed to load cart. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (isbn) => {
    if (!user) return
    
    try {
      const res = await fetch(
        `${apiBase}/cart/remove?userID=${user.userID}&isbn=${encodeURIComponent(isbn)}`,
        { method: 'DELETE' }
      )
      
      if (!res.ok) throw new Error('Failed to remove item')
      
      await load()
    } catch (err) {
      alert('Failed to remove item. Please try again.')
      console.error(err)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="page">
      <h2 className="page-title">Your Shopping Cart</h2>
      
      {loading ? (
        <div className="loading">Loading cart...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : cart.items.length === 0 ? (
        <div className="empty-cart">
          <p className="empty-state">Your cart is empty</p>
          <Link to="/search">
            <button className="button button-primary">Browse Books</button>
          </Link>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cart.items.map(item => (
              <div key={item.ISBN} className="book-card">
                <div className="book-info">
                  <h3 className="book-title">{item.Title}</h3>
                  <div className="book-details">
                    <span className="book-meta">ISBN: {item.ISBN}</span>
                    <span className="book-meta">Quantity: {item.Quantity}</span>
                    <span className="book-meta">Unit Price: ${item.Price.toFixed(2)}</span>
                  </div>
                  <div className="book-price">Item Total: ${item.TotalItemPrice.toFixed(2)}</div>
                </div>
                <div className="book-actions">
                  <button
                    className="button button-danger"
                    onClick={() => remove(item.ISBN)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-row">
              <span className="summary-label">Cart Total:</span>
              <span className="summary-value">${cart.cart_total.toFixed(2)}</span>
            </div>
            
            <Link to="/checkout">
              <button className="button button-primary button-large">
                Proceed to Checkout
              </button>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
