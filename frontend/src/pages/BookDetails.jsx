import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { apiBase } from '../App'
import { useAuth } from '../context/AuthContext'

export default function BookDetails() {
  const { isbn } = useParams()
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadBookDetails()
  }, [isbn])

  const loadBookDetails = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/books/${isbn}`)
      if (!res.ok) throw new Error('Failed to load book details')
      const data = await res.json()
      setBook(data)
    } catch (err) {
      setError('Failed to load book details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async () => {
    if (!user) {
      alert('Please login to add items to cart')
      navigate('/login')
      return
    }

    try {
      const payload = { ISBN: book.ISBN, Quantity: 1 }
      const res = await fetch(`${apiBase}/cart/add?userID=${user.userID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to add to cart')
      }

      alert(`${book.Title} added to cart!`)
      loadBookDetails() // Refresh to update available stock
    } catch (error) {
      alert(error.message || 'Failed to add to cart')
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading book details...</div>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="page">
        <div className="error-message">{error || 'Book not found'}</div>
        <Link to="/search">
          <button className="button button-primary">Back to Search</button>
        </Link>
      </div>
    )
  }

  const availableStock = book.AvailableStock !== undefined ? book.AvailableStock : book.StockQuantity

  return (
    <div className="page">
      <Link to="/search" style={{ display: 'inline-block', marginBottom: '1rem', color: '#667eea', textDecoration: 'none' }}>
        ← Back to Search
      </Link>

      <div className="book-details-container">
        <div className="book-details-header">
          <div className="book-details-main">
            <h1 className="book-details-title">{book.Title}</h1>
            
            <div className="book-details-meta">
              <div className="meta-item">
                <strong>ISBN:</strong> {book.ISBN}
              </div>
              <div className="meta-item">
                <strong>Category:</strong> {book.category}
              </div>
              <div className="meta-item">
                <strong>Publication Year:</strong> {book.pubYear}
              </div>
            </div>

            <div className="book-authors-section">
              <h3>Author{book.authors && book.authors.length > 1 ? 's' : ''}</h3>
              {book.authors && book.authors.length > 0 ? (
                <ul className="authors-list">
                  {book.authors.map(author => (
                    <li key={author.authorID}>{author.author_name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No authors listed</p>
              )}
            </div>

            {book.publisher && (
              <div className="book-publisher-section">
                <h3>Publisher</h3>
                <div className="publisher-info">
                  <p><strong>Name:</strong> {book.publisher.name}</p>
                  {book.publisher.phone && <p><strong>Phone:</strong> {book.publisher.phone}</p>}
                  {book.publisher.address && <p><strong>Address:</strong> {book.publisher.address}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="book-details-sidebar">
            <div className="book-price-large">${book.Price.toFixed(2)}</div>
            
            <div className="book-stock-info">
              <div className="stock-item">
                <span className="stock-label">Current Stock:</span>
                <span className="stock-value">{book.StockQuantity}</span>
              </div>
              {user && (
                <div className="stock-item">
                  <span className="stock-label">Available:</span>
                  <span className={`stock-value ${availableStock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                    {availableStock}
                  </span>
                </div>
              )}
              <div className="stock-item">
                <span className="stock-label">Threshold:</span>
                <span className="stock-value">{book.threshold}</span>
              </div>
            </div>

            {user && (
              <button
                className="button button-primary button-large"
                onClick={addToCart}
                disabled={availableStock <= 0}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                {availableStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            )}

            {!user && (
              <Link to="/login">
                <button className="button button-primary button-large" style={{ width: '100%', marginTop: '1rem' }}>
                  Login to Add to Cart
                </button>
              </Link>
            )}

            {user && user.Role === 'Admin' && (
              <Link to={`/admin/books?edit=${book.ISBN}`}>
                <button className="button button-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Edit Book (Admin)
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}




