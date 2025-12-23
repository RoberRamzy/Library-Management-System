import React, { useState, useEffect } from 'react'
import { apiBase } from '../App'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['Science', 'Art', 'Religion', 'History', 'Geography']

export default function AdminBooks() {
  const [publishers, setPublishers] = useState([])
  const [authors, setAuthors] = useState([])
  const [books, setBooks] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [editingBook, setEditingBook] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [newAuthorName, setNewAuthorName] = useState('')
  const [showAuthorForm, setShowAuthorForm] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [bookForm, setBookForm] = useState({
    ISBN: '',
    Title: '',
    pubYear: new Date().getFullYear(),
    Price: 0,
    StockQuantity: 0,
    threshold: 0,
    category: 'Science',
    PubID: '',
    authorIDs: []
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
    } else if (user.Role !== 'Admin') {
      navigate('/')
    } else {
      loadPublishers()
      loadAuthors()
      loadBooks()
    }
  }, [user])

  const loadPublishers = async () => {
    try {
      const res = await fetch(`${apiBase}/admin/publishers`)
      if (!res.ok) throw new Error('Failed to load publishers')
      const data = await res.json()
      setPublishers(data)
      if (data.length > 0 && !bookForm.PubID) {
        setBookForm(prev => ({ ...prev, PubID: data[0].PubID }))
      }
    } catch (err) {
      setError('Failed to load publishers')
      console.error(err)
    }
  }

  const loadAuthors = async () => {
    try {
      const res = await fetch(`${apiBase}/admin/authors`)
      if (!res.ok) throw new Error('Failed to load authors')
      const data = await res.json()
      setAuthors(data)
    } catch (err) {
      console.error('Failed to load authors:', err)
    }
  }

  const handleCreateAuthor = async (e) => {
    e.preventDefault()
    if (!newAuthorName.trim()) {
      setError('Author name is required')
      return
    }

    try {
      const res = await fetch(`${apiBase}/admin/authors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_name: newAuthorName.trim() })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to create author')
      }

      setNewAuthorName('')
      setShowAuthorForm(false)
      loadAuthors()
      setMessage('Author created successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to create author')
    }
  }

  const loadBooks = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/books/search`)
      if (!res.ok) throw new Error('Failed to load books')
      const data = await res.json()
      setBooks(data)
    } catch (err) {
      setError('Failed to load books')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const searchBook = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/books/search?title=${encodeURIComponent(searchTerm)}&isbn=${encodeURIComponent(searchTerm)}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setSearchResults(data)
    } catch (err) {
      setError('Search failed')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBook = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    // Validate at least one author
    if (!bookForm.authorIDs || bookForm.authorIDs.length === 0) {
      setError('Please select at least one author')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${apiBase}/admin/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookForm,
          authorIDs: bookForm.authorIDs || []
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to add book')
      }

      setMessage('Book added successfully!')
      setShowAddForm(false)
      resetForm()
      loadBooks()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to add book')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateBook = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      // Only send fields that have values
      const updates = {}
      if (bookForm.Title) updates.Title = bookForm.Title
      if (bookForm.pubYear) updates.pubYear = parseInt(bookForm.pubYear)
      if (bookForm.Price) updates.Price = parseFloat(bookForm.Price)
      if (bookForm.StockQuantity !== null && bookForm.StockQuantity !== undefined) updates.StockQuantity = parseInt(bookForm.StockQuantity)
      if (bookForm.threshold !== null && bookForm.threshold !== undefined) updates.threshold = parseInt(bookForm.threshold)
      if (bookForm.category) updates.category = bookForm.category
      if (bookForm.PubID) updates.PubID = parseInt(bookForm.PubID)
      if (bookForm.authorIDs !== undefined) updates.authorIDs = bookForm.authorIDs

      const res = await fetch(`${apiBase}/admin/books/${editingBook.ISBN}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to update book')
      }

      setMessage('Book updated successfully!')
      setEditingBook(null)
      resetForm()
      loadBooks()
      setSearchResults([])
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update book')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = async (book) => {
    try {
      const res = await fetch(`${apiBase}/admin/books/${book.ISBN}`)
      if (!res.ok) throw new Error('Failed to load book details')
      const bookData = await res.json()
      
      setEditingBook(bookData)
      setBookForm({
        ISBN: bookData.ISBN,
        Title: bookData.Title,
        pubYear: bookData.pubYear,
        Price: bookData.Price,
        StockQuantity: bookData.StockQuantity,
        threshold: bookData.threshold,
        category: bookData.category,
        PubID: bookData.PubID,
        authorIDs: bookData.authors ? bookData.authors.map(a => a.authorID) : []
      })
      setShowAddForm(false)
    } catch (err) {
      setError(err.message || 'Failed to load book details')
    }
  }

  const resetForm = () => {
    setBookForm({
      ISBN: '',
      Title: '',
      pubYear: new Date().getFullYear(),
      Price: 0,
      StockQuantity: 0,
      threshold: 0,
      category: 'Science',
      PubID: publishers[0]?.PubID || '',
      authorIDs: []
    })
  }

  const handleAuthorToggle = (authorID) => {
    setBookForm(prev => {
      const current = prev.authorIDs || []
      const updated = current.includes(authorID)
        ? current.filter(id => id !== authorID)
        : [...current, authorID]
      return { ...prev, authorIDs: updated }
    })
  }

  const cancelEdit = () => {
    setEditingBook(null)
    setShowAddForm(false)
    resetForm()
    setError('')
  }

  if (!user || user.Role !== 'Admin') {
    return null
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="page-title">Book Management</h2>
        <button
          className="button button-primary"
          onClick={() => {
            cancelEdit()
            setShowAddForm(!showAddForm)
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add New Book'}
        </button>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Search for existing books */}
      <div className="admin-section" style={{ marginBottom: '2rem' }}>
        <h3>Search & Edit Books</h3>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <input
            className="input"
            type="text"
            placeholder="Search by ISBN or Title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchBook()}
            style={{ flex: 1 }}
          />
          <button className="button button-primary" onClick={searchBook} disabled={loading}>
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="book-results">
            {searchResults.map(book => (
              <div key={book.ISBN} className="book-card" style={{ marginBottom: '1rem' }}>
                <div className="book-info">
                  <h4>{book.Title}</h4>
                  <div className="book-details">
                    <span className="book-meta">ISBN: {book.ISBN}</span>
                    <span className="book-meta">Price: ${book.Price.toFixed(2)}</span>
                    <span className="book-meta">Stock: {book.StockQuantity}</span>
                    <span className="book-meta">Threshold: {book.threshold}</span>
                  </div>
                </div>
                <button className="button button-primary" onClick={() => startEdit(book)}>
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingBook) && (
        <div className="admin-section">
          <h3>{editingBook ? 'Edit Book' : 'Add New Book'}</h3>
          <form onSubmit={editingBook ? handleUpdateBook : handleAddBook} className="form-grid">
            <div className="form-group">
              <label>ISBN *</label>
              <input
                className="input"
                type="text"
                value={bookForm.ISBN}
                onChange={(e) => setBookForm({ ...bookForm, ISBN: e.target.value })}
                disabled={!!editingBook}
                required={!editingBook}
                placeholder="e.g., 978-0439708189"
              />
            </div>

            <div className="form-group">
              <label>Title *</label>
              <input
                className="input"
                type="text"
                value={bookForm.Title}
                onChange={(e) => setBookForm({ ...bookForm, Title: e.target.value })}
                required={!editingBook}
                placeholder="Book title"
              />
            </div>

            <div className="form-group">
              <label>Publication Year *</label>
              <input
                className="input"
                type="number"
                value={bookForm.pubYear}
                onChange={(e) => setBookForm({ ...bookForm, pubYear: parseInt(e.target.value) || 0 })}
                required={!editingBook}
                min="1000"
                max={new Date().getFullYear() + 1}
              />
            </div>

            <div className="form-group">
              <label>Price *</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                value={bookForm.Price}
                onChange={(e) => setBookForm({ ...bookForm, Price: parseFloat(e.target.value) || 0 })}
                required={!editingBook}
              />
            </div>

            <div className="form-group">
              <label>Stock Quantity *</label>
              <input
                className="input"
                type="number"
                min="0"
                value={bookForm.StockQuantity}
                onChange={(e) => setBookForm({ ...bookForm, StockQuantity: parseInt(e.target.value) || 0 })}
                required={!editingBook}
              />
            </div>

            <div className="form-group">
              <label>Threshold (Minimum Stock) *</label>
              <input
                className="input"
                type="number"
                min="0"
                value={bookForm.threshold}
                onChange={(e) => setBookForm({ ...bookForm, threshold: parseInt(e.target.value) || 0 })}
                required={!editingBook}
                placeholder="Minimum stock to maintain"
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                className="input"
                value={bookForm.category}
                onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                required={!editingBook}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Publisher *</label>
              <select
                className="input"
                value={bookForm.PubID}
                onChange={(e) => setBookForm({ ...bookForm, PubID: parseInt(e.target.value) })}
                required={!editingBook}
              >
                <option value="">Select Publisher</option>
                {publishers.map(pub => (
                  <option key={pub.PubID} value={pub.PubID}>{pub.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Author(s) *</label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="small">Select one or more authors</span>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={() => setShowAuthorForm(!showAuthorForm)}
                >
                  + Add New Author
                </button>
              </div>
              
              {showAuthorForm && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                  <form onSubmit={handleCreateAuthor} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="input"
                      type="text"
                      placeholder="Author name"
                      value={newAuthorName}
                      onChange={(e) => setNewAuthorName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="button button-primary">Add</button>
                    <button type="button" className="button button-secondary" onClick={() => setShowAuthorForm(false)}>Cancel</button>
                  </form>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                {authors.map(author => (
                  <label key={author.authorID} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={bookForm.authorIDs?.includes(author.authorID) || false}
                      onChange={() => handleAuthorToggle(author.authorID)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span>{author.author_name}</span>
                  </label>
                ))}
              </div>
              {bookForm.authorIDs && bookForm.authorIDs.length > 0 && (
                <p className="small" style={{ marginTop: '0.5rem', color: '#666' }}>
                  Selected: {bookForm.authorIDs.map(id => authors.find(a => a.authorID === id)?.author_name).filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="button button-primary" type="submit" disabled={loading}>
                {loading ? 'Saving...' : (editingBook ? 'Update Book' : 'Add Book')}
              </button>
              <button className="button button-secondary" type="button" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

