import React, { useState, useEffect } from 'react'
import { apiBase } from '../App'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Checkout() {
  const [card, setCard] = useState('')
  const [expiry, setExpiry] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cartTotal, setCartTotal] = useState(0)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    
    // Load cart total
    fetch(`${apiBase}/cart/${user.userID}`)
      .then(res => res.json())
      .then(data => {
        setCartTotal(data.cart_total || 0)
        if (data.items.length === 0) {
          navigate('/cart')
        }
      })
      .catch(err => console.error(err))
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return

    setError('')
    setLoading(true)

    // Validation
    if (!card.trim() || card.trim().length < 13) {
      setError('Please enter a valid card number')
      setLoading(false)
      return
    }

    if (!expiry) {
      setError('Please enter card expiry date')
      setLoading(false)
      return
    }

    try {
      const payload = {
        userID: user.userID,
        card_number: card.trim(),
        card_expiry: expiry
      }

      const res = await fetch(`${apiBase}/customer/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Checkout failed')
      }

      const data = await res.json()
      alert(`Checkout successful! Order ID: ${data.orderID}`)
      navigate('/orders')
    } catch (err) {
      setError(err.message || 'Checkout failed. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  // Calculate minimum expiry date (today)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="page">
      <h2 className="page-title">Checkout</h2>
      
      <div className="checkout-container">
        <div className="checkout-form-card">
          <h3>Payment Information</h3>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Card Number</label>
              <input
                className="input"
                type="text"
                placeholder="1234 5678 9012 3456"
                value={card}
                onChange={(e) => setCard(e.target.value.replace(/\D/g, ''))}
                maxLength="16"
                disabled={loading}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Card Expiry Date</label>
              <input
                className="input"
                type="date"
                value={expiry}
                min={today}
                onChange={(e) => setExpiry(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className="checkout-summary">
              <div className="summary-row">
                <span className="summary-label">Total Amount:</span>
                <span className="summary-value large">${cartTotal.toFixed(2)}</span>
              </div>
            </div>
            
            <button
              className="button button-primary button-large"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm Payment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

