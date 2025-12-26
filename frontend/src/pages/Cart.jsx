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

  const updateQuantity = async (isbn, currentQty, newQty) => {
    if (!user) return
    if (newQty < 1) return; // Prevent 0 or negative via input

    // Calculate the difference because /cart/add adds to existing qty
    const difference = newQty - currentQty;
    if (difference === 0) return;

    try {
      const res = await fetch(`${apiBase}/cart/add?userID=${user.userID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ISBN: isbn, Quantity: difference })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Insufficient stock to update quantity');
      }

      await load(); // Refresh cart to show new totals
    } catch (err) {
      alert(err.message);
      await load(); // Reset input to actual DB value on failure
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
      alert('Failed to remove item.')
    }
  }

  if (!user) return null

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
              <div key={item.ISBN} className="book-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="book-info">
                  <h3 className="book-title">{item.Title}</h3>
                  <div className="book-details">
                    <p className="book-meta">ISBN: {item.ISBN}</p>
                    <p className="book-meta">Unit Price: ${item.Price.toFixed(2)}</p>
                  </div>
                  <div className="book-price"><strong>Subtotal: ${item.TotalItemPrice.toFixed(2)}</strong></div>
                </div>

                <div className="cart-item-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                  <div className="qty-control" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.9rem' }}>Qty:</label>
                    <input
                      type="number"
                      className="input"
                      style={{ width: '70px', textAlign: 'center' }}
                      min="1"
                      value={item.Quantity}
                      onChange={(e) => updateQuantity(item.ISBN, item.Quantity, parseInt(e.target.value))}
                    />
                  </div>
                  <button
                    className="button button-danger"
                    style={{ padding: '5px 15px', fontSize: '0.8rem' }}
                    onClick={() => remove(item.ISBN)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary" style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px', textAlign: 'right' }}>
            <div className="summary-row" style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
              <strong>Grand Total: ${cart.cart_total.toFixed(2)}</strong>
            </div>
            
            <Link to="/checkout">
              <button className="button button-primary button-large" style={{ width: '250px' }}>
                Proceed to Checkout
              </button>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}