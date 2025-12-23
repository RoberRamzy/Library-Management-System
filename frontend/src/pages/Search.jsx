import React, { useState } from 'react'
import { apiBase } from '../App'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

const CATEGORIES = ['Science', 'Art', 'Religion', 'History', 'Geography']

export default function Search() {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [isbn, setIsbn] = useState('')
  const [author, setAuthor] = useState('')
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
      if (author.trim()) params.append('author', author.trim())
      // Include userID to get available stock (accounting for items in cart)
      if (user) params.append('userID', user.userID)
      
      const res = await fetch(`${apiBase}/books/search?${params.toString()}`)
      if (!res.ok) throw new Error('Search failed')
      
      const data = await res.json()
      // Use AvailableStock if provided, otherwise use StockQuantity
      const processedData = data.map(book => ({
        ...book,
        DisplayStock: book.AvailableStock !== undefined ? book.AvailableStock : book.StockQuantity
      }))
      setResults(processedData)
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

  const addToCart = async (book, index) => {
    if (!user) {
      alert('Please login to add items to cart')
      navigate('/login')
      return
    }

    // Check if book is available (use DisplayStock if available, otherwise StockQuantity)
    const availableStock = book.DisplayStock !== undefined ? book.DisplayStock : book.StockQuantity
    if (availableStock <= 0) {
      alert('This book is out of stock')
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

      const data = await res.json()
      
      // Update the book's available stock in the results array
      setResults(prevResults => {
        const updatedResults = [...prevResults]
        const currentBook = updatedResults[index]
        updatedResults[index] = {
          ...currentBook,
          StockQuantity: data.currentStock || currentBook.StockQuantity,
          DisplayStock: data.availableStock !== undefined ? data.availableStock : (currentBook.DisplayStock || currentBook.StockQuantity) - 1
        }
        return updatedResults
      })

      setMessage(`${book.Title} added to cart!`)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      alert(error.message || 'Failed to add to cart')
      // If error is about stock, refresh the book data
      if (error.message.includes('stock') || error.message.includes('available')) {
        // Refetch the specific book to get updated stock
        try {
          const res = await fetch(`${apiBase}/books/search?isbn=${book.ISBN}`)
          if (res.ok) {
            const bookData = await res.json()
            if (bookData.length > 0) {
              setResults(prevResults => {
                const updatedResults = [...prevResults]
                const bookIndex = updatedResults.findIndex(b => b.ISBN === book.ISBN)
                if (bookIndex !== -1) {
                  updatedResults[bookIndex] = bookData[0]
                }
                return updatedResults
              })
            }
          }
        } catch (err) {
          console.error('Failed to refresh book data:', err)
        }
      }
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
          <input
            className="input"
            type="text"
            placeholder="Author (optional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
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
          results.map((book, index) => (
            <div key={book.ISBN} className="book-card">
              <div className="book-info">
                <h3 className="book-title">
                  <Link to={`/books/${book.ISBN}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {book.Title}
                  </Link>
                </h3>
                <div className="book-details">
                  <span className="book-meta">ISBN: {book.ISBN}</span>
                  <span className="book-meta">Category: {book.category}</span>
                  <span className="book-meta">Year: {book.pubYear}</span>
                  {book.authors && book.authors.length > 0 && (
                    <span className="book-meta">
                      Author{book.authors.length > 1 ? 's' : ''}: {book.authors.map(a => a.author_name).join(', ')}
                    </span>
                  )}
                  <span className={(book.DisplayStock !== undefined ? book.DisplayStock : book.StockQuantity) > 0 ? "book-stock" : "book-stock out-of-stock"}>
                    Available: {(book.DisplayStock !== undefined ? book.DisplayStock : book.StockQuantity)}
                  </span>
                </div>
                <div className="book-price">${book.Price.toFixed(2)}</div>
              </div>
              <div className="book-actions">
                <Link to={`/books/${book.ISBN}`} style={{ marginRight: '0.5rem' }}>
                  <button className="button button-secondary">
                    View Details
                  </button>
                </Link>
                <button
                  className="button button-primary"
                  onClick={() => addToCart(book, index)}
                  disabled={(book.DisplayStock !== undefined ? book.DisplayStock : book.StockQuantity) <= 0}
                >
                  {(book.DisplayStock !== undefined ? book.DisplayStock : book.StockQuantity) <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
