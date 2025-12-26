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
  
  // Author States
  const [newAuthorName, setNewAuthorName] = useState('')
  const [showAuthorForm, setShowAuthorForm] = useState(false)

  // Publisher States
  const [showPublisherForm, setShowPublisherForm] = useState(false)
  const [newPub, setNewPub] = useState({ name: '', phone: '', address: '' })

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

  // Load everything on mount
  useEffect(() => {
    if (!user) {
      navigate('/login')
    } else if (user.Role !== 'Admin') {
      navigate('/')
    } else {
      loadInitialData()
    }
  }, [user])

  const loadInitialData = async () => {
    setLoading(true)
    await Promise.all([loadPublishers(), loadAuthors(), loadBooks()])
    setLoading(false)
  }

  const loadPublishers = async () => {
    try {
      const res = await fetch(`${apiBase}/admin/publishers`)
      if (!res.ok) throw new Error('Failed to load publishers')
      const data = await res.json()
      setPublishers(data)
      if (data.length > 0 && !bookForm.PubID) {
        setBookForm(prev => ({ ...prev, PubID: data[0].PubID }))
      }
    } catch (err) { setError('Failed to load publishers') }
  }

  const loadAuthors = async () => {
    try {
      const res = await fetch(`${apiBase}/admin/authors`)
      if (!res.ok) throw new Error('Failed to load authors')
      const data = await res.json()
      setAuthors(data)
    } catch (err) { console.error(err) }
  }

  const loadBooks = async () => {
    try {
      const res = await fetch(`${apiBase}/books/search`)
      if (!res.ok) throw new Error('Failed to load books')
      const data = await res.json()
      setBooks(data)
      setSearchResults(data) // Display all by default
    } catch (err) { setError('Failed to load books') }
  }

  const handleCreateAuthor = async (e) => {
    e.preventDefault()
    if (!newAuthorName.trim()) return setError('Author name required')
    try {
      const res = await fetch(`${apiBase}/admin/authors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_name: newAuthorName.trim() })
      })
      if (!res.ok) throw new Error('Failed to create author')
      setNewAuthorName(''); setShowAuthorForm(false); loadAuthors()
      setMessage('Author created!'); setTimeout(() => setMessage(''), 3000)
    } catch (err) { setError(err.message) }
  }

  // --- ADD PUBLISHER HANDLER ---
  const handleCreatePublisher = async (e) => {
    e.preventDefault()
    if (!newPub.name.trim()) return setError('Publisher name required')
    try {
      const res = await fetch(`${apiBase}/admin/publishers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPub)
      })
      if (!res.ok) throw new Error('Failed to create publisher')
      setNewPub({ name: '', phone: '', address: '' }); setShowPublisherForm(false); loadPublishers()
      setMessage('Publisher created!'); setTimeout(() => setMessage(''), 3000)
    } catch (err) { setError(err.message) }
  }

  const searchBook = async () => {
    if (!searchTerm.trim()) {
      setSearchResults(books) // Reset to full catalog if empty
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/books/search?title=${encodeURIComponent(searchTerm)}&isbn=${encodeURIComponent(searchTerm)}`)
      const data = await res.json()
      setSearchResults(data)
    } catch (err) { setError('Search failed') }
    finally { setLoading(false) }
  }

  const handleAddBook = async (e) => {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    if (!bookForm.authorIDs || bookForm.authorIDs.length === 0) {
      setError('Select at least one author'); setLoading(false); return
    }
    try {
      const res = await fetch(`${apiBase}/admin/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookForm)
      })
      if (!res.ok) throw new Error('Failed to add book')
      setMessage('Book added successfully!'); setShowAddForm(false); resetForm(); loadBooks()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleUpdateBook = async (e) => {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    try {
      const res = await fetch(`${apiBase}/admin/books/${editingBook.ISBN}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookForm)
      })
      if (!res.ok) throw new Error('Failed to update book')
      setMessage('Book updated!'); setEditingBook(null); resetForm(); loadBooks()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const startEdit = async (book) => {
    try {
      const res = await fetch(`${apiBase}/admin/books/${book.ISBN}`)
      const bookData = await res.json()
      setEditingBook(bookData)
      setBookForm({
        ...bookData,
        authorIDs: bookData.authors ? bookData.authors.map(a => a.authorID) : []
      })
      setShowAddForm(false)
      window.scrollTo(0, 0)
    } catch (err) { setError('Failed to load book details') }
  }

  const resetForm = () => {
    setBookForm({
      ISBN: '', Title: '', pubYear: new Date().getFullYear(),
      Price: 0, StockQuantity: 0, threshold: 0,
      category: 'Science', PubID: publishers[0]?.PubID || '', authorIDs: []
    })
  }

  const handleAuthorToggle = (authorID) => {
    setBookForm(prev => {
      const current = prev.authorIDs || []
      const updated = current.includes(authorID) ? current.filter(id => id !== authorID) : [...current, authorID]
      return { ...prev, authorIDs: updated }
    })
  }

  const cancelEdit = () => {
    setEditingBook(null); setShowAddForm(false); resetForm(); setError('')
  }

  if (!user || user.Role !== 'Admin') return null

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="page-title">Inventory Management</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="button button-secondary" onClick={() => setShowPublisherForm(!showPublisherForm)}>
            {showPublisherForm ? 'Cancel' : '+ Add Publisher'}
          </button>
          <button className="button button-primary" onClick={() => { cancelEdit(); setShowAddForm(!showAddForm) }}>
            {showAddForm ? 'Cancel' : '+ Add New Book'}
          </button>
        </div>
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* PUBLISHER FORM */}
      {showPublisherForm && (
        <div className="admin-section" style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <h3>New Publisher</h3>
          <form onSubmit={handleCreatePublisher} className="form-grid">
            <div className="form-group">
              <label>Name</label>
              <input className="input" type="text" value={newPub.name} onChange={e => setNewPub({...newPub, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="input" type="text" value={newPub.phone} onChange={e => setNewPub({...newPub, phone: e.target.value})} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              <input className="input" type="text" value={newPub.address} onChange={e => setNewPub({...newPub, address: e.target.value})} />
            </div>
            <button type="submit" className="button button-primary">Save Publisher</button>
          </form>
        </div>
      )}

      {/* ADD/EDIT BOOK FORM */}
      {(showAddForm || editingBook) && (
        <div className="admin-section">
          <h3>{editingBook ? 'Edit Book' : 'Add New Book'}</h3>
          <form onSubmit={editingBook ? handleUpdateBook : handleAddBook} className="form-grid">
            <div className="form-group">
              <label>ISBN *</label>
              <input className="input" type="text" value={bookForm.ISBN} onChange={e => setBookForm({ ...bookForm, ISBN: e.target.value })} disabled={!!editingBook} required />
            </div>
            <div className="form-group">
              <label>Title *</label>
              <input className="input" type="text" value={bookForm.Title} onChange={e => setBookForm({ ...bookForm, Title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Price *</label>
              <input className="input" type="number" step="0.01" value={bookForm.Price} onChange={e => setBookForm({ ...bookForm, Price: parseFloat(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label>Stock *</label>
              <input className="input" type="number" value={bookForm.StockQuantity} onChange={e => setBookForm({ ...bookForm, StockQuantity: parseInt(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label>Threshold *</label>
              <input className="input" type="number" value={bookForm.threshold} onChange={e => setBookForm({ ...bookForm, threshold: parseInt(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select className="input" value={bookForm.category} onChange={e => setBookForm({ ...bookForm, category: e.target.value })}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Publisher *</label>
              <select className="input" value={bookForm.PubID} onChange={e => setBookForm({ ...bookForm, PubID: parseInt(e.target.value) })} required>
                <option value="">Select Publisher</option>
                {publishers.map(pub => <option key={pub.PubID} value={pub.PubID}>{pub.name}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Author(s) *</label>
              <button type="button" className="button button-secondary button-small" onClick={() => setShowAuthorForm(!showAuthorForm)} style={{ marginLeft: '10px' }}>+ New Author</button>
              {showAuthorForm && (
                <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                  <input className="input" placeholder="Name" value={newAuthorName} onChange={e => setNewAuthorName(e.target.value)} />
                  <button type="button" className="button button-primary" onClick={handleCreateAuthor}>Add</button>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '5px', maxHeight: '120px', overflowY: 'auto', marginTop: '10px', border: '1px solid #ddd', padding: '10px' }}>
                {authors.map(author => (
                  <label key={author.authorID}><input type="checkbox" checked={bookForm.authorIDs?.includes(author.authorID)} onChange={() => handleAuthorToggle(author.authorID)} /> {author.author_name}</label>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '1rem' }}>
              <button className="button button-primary" type="submit">{editingBook ? 'Update' : 'Add'}</button>
              <button className="button button-secondary" type="button" onClick={cancelEdit}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* CATALOG / SEARCH RESULTS */}
      <div className="admin-section">
        <h3>Catalog Status</h3>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <input className="input" placeholder="Quick find ISBN or Title..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyPress={e => e.key === 'Enter' && searchBook()} style={{ flex: 1 }} />
          <button className="button button-primary" onClick={searchBook}>Search</button>
        </div>

        <div className="book-results">
          {searchResults.map(book => (
            <div key={book.ISBN} className="book-card" style={{ marginBottom: '1rem', borderLeft: book.StockQuantity <= book.threshold ? '5px solid #ff4444' : '5px solid #00C851' }}>
              <div className="book-info">
                <h4>{book.Title}</h4>
                <div className="book-details">
                  <span className="book-meta">ISBN: {book.ISBN} | Stock: <strong>{book.StockQuantity}</strong></span>
                </div>
              </div>
              <button className="button button-primary" onClick={() => startEdit(book)}>Edit</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}