import React, { useState } from 'react'
import { apiBase } from '../App'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const CATEGORIES = ['Science', 'Art', 'Religion', 'History', 'Geography']

export default function Search() {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [isbn, setIsbn] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  const doSearch = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      const params = new URLSearchParams()
      if (title.trim()) params.append('title', title.trim())
      if (category) params.append('category', category)
      if (isbn.trim()) params.append('isbn', isbn.trim())
      
      const res = await fetch(`${apiBase}/books/search?${params.toString()}`)
      if (!res.ok) throw new Error('Search failed')
      
      const data = await res.json()
      setResults(data)
      if (data.length === 0) {
        setMessage('No books found. Try different search terms.')
      }
    } catch (error) {
      setMessage('Error searching books. Please try again.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async (book) => {
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

      setMessage(`${book.Title} added to cart!`)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      alert(error.message || 'Failed to add to cart')
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">Search Books</h2>
      
      <form onSubmit={doSearch} className="search-form">
        <div className="search-inputs">
          <input
            className="input"
            type="text"
            placeholder="Search by title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input
            className="input"
            type="text"
            placeholder="ISBN (optional)"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? 'Searching...' : '🔍 Search'}
          </button>
        </div>
      </form>

      {message && (
        <div className={`message ${message.includes('added') ? 'success-message' : 'info-message'}`}>
          {message}
        </div>
      )}

      <div className="results-container">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : results.length === 0 && !message ? (
          <p className="empty-state">Enter search terms and click Search to find books</p>
        ) : (
          results.map(book => (
            <div key={book.ISBN} className="book-card">
              <div className="book-info">
                <h3 className="book-title">{book.Title}</h3>
                <div className="book-details">
                  <span className="book-meta">ISBN: {book.ISBN}</span>
                  <span className="book-meta">Category: {book.category}</span>
                  <span className="book-meta">Year: {book.pubYear}</span>
                  <span className="book-stock">Stock: {book.StockQuantity}</span>
                </div>
                <div className="book-price">${book.Price.toFixed(2)}</div>
              </div>
              <div className="book-actions">
                <button
                  className="button button-primary"
                  onClick={() => addToCart(book)}
                  disabled={book.StockQuantity === 0}
                >
                  {book.StockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
