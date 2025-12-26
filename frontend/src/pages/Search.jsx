import React, { useState, useEffect } from 'react'
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
  const [quantities, setQuantities] = useState({})
  
  // NEW: State for the Book Details Modal
  const [selectedBook, setSelectedBook] = useState(null)
  
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      doSearch()
    }, 500)
    return () => clearTimeout(delaySearch)
  }, [title, category, isbn, user])

  const doSearch = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (title.trim()) params.append('title', title.trim())
      if (category) params.append('category', category)
      if (isbn.trim()) params.append('isbn', isbn.trim())
      if (user) params.append('userID', user.userID)
      
      const res = await fetch(`${apiBase}/books/search?${params.toString()}`)
      const data = await res.json()
      setResults(data)
      
      const initialQtys = {}
      data.forEach(book => { initialQtys[book.ISBN] = 1 })
      setQuantities(initialQtys)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async (book) => {
    if (!user) { alert('Please login'); navigate('/login'); return }
    const orderQty = quantities[book.ISBN] || 1
    try {
      const res = await fetch(`${apiBase}/cart/add?userID=${user.userID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ISBN: book.ISBN, Quantity: orderQty })
      })
      if (!res.ok) throw new Error('Failed to add')
      
      setResults(prev => prev.map(b => b.ISBN === book.ISBN ? 
        { ...b, AvailableStock: (b.AvailableStock ?? b.StockQuantity) - orderQty } : b
      ))
      setMessage(`Added ${orderQty} items to cart!`)
      setTimeout(() => setMessage(''), 3000)
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="page">
      <h2 className="page-title">Book Search</h2>
      
      {/* Search Form */}
      <form className="search-form">
        <div className="search-inputs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input className="input" placeholder="Title..." value={title} onChange={e => setTitle(e.target.value)} />
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <input className="input" placeholder="ISBN..." value={isbn} onChange={e => setIsbn(e.target.value)} />
        </div>
      </form>

      {message && <div className="success-message">{message}</div>}

      <div className="results-container">
        {results.map(book => {
          const displayStock = book.AvailableStock !== undefined ? book.AvailableStock : book.StockQuantity
          return (
            <div key={book.ISBN} className="book-card" style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
              <div className="book-info">
                <h3 className="book-title">{book.Title}</h3>
                <p><strong>Price:</strong> ${book.Price.toFixed(2)} | <strong>Stock:</strong> {displayStock}</p>
              </div>
              
              <div className="book-actions" style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="button" 
                  style={{ backgroundColor: '#6c757d', color: 'white' }}
                  onClick={() => setSelectedBook(book)}
                >
                  View Details
                </button>

                {displayStock > 0 ? (
                  <>
                    <input 
                      type="number" className="input" style={{ width: '60px' }} 
                      min="1" max={displayStock} value={quantities[book.ISBN] || 1}
                      onChange={e => setQuantities({...quantities, [book.ISBN]: parseInt(e.target.value)})}
                    />
                    <button className="button button-primary" onClick={() => addToCart(book)}>Add to Cart</button>
                  </>
                ) : <span style={{ color: 'red' }}>Out of Stock</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* --- BOOK DETAILS MODAL --- */}
      {selectedBook && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content" style={{
            background: 'white', padding: '30px', borderRadius: '15px', maxWidth: '550px', width: '90%', 
            position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <button 
              onClick={() => setSelectedBook(null)}
              style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: '#eee', 
                       borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}
            >
              &times;
            </button>
            
            <h2 style={{ color: '#2c3e50', marginBottom: '5px' }}>{selectedBook.Title}</h2>
            <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>Category: {selectedBook.category}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'left' }}>
              {/* Book Info Section */}
              <div>
                <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Book Details</h4>
                <p><strong>ISBN:</strong> {selectedBook.ISBN}</p>
                <p><strong>Year:</strong> {selectedBook.pubYear}</p>
                <p><strong>Price:</strong> ${selectedBook.Price.toFixed(2)}</p>
                <p><strong>Authors:</strong><br/>
                  {selectedBook.authors && selectedBook.authors.length > 0 
                    ? selectedBook.authors.map(a => a.author_name).join(', ') 
                    : 'Not specified'}
                </p>
              </div>

              {/* Publisher Info Section */}
              <div style={{ backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Publisher Info</h4>
                <p><strong>Name:</strong><br/> {selectedBook.publisher_name || 'N/A'}</p>
                <p><strong>Phone:</strong><br/> {selectedBook.publisher_phone || 'N/A'}</p>
                <p><strong>Address:</strong><br/> {selectedBook.publisher_address || 'N/A'}</p>
              </div>
            </div>

            <button 
              className="button button-primary" 
              style={{ width: '100%', marginTop: '25px', padding: '12px' }}
              onClick={() => setSelectedBook(null)}
            >
              Back to Search
            </button>
          </div>
        </div>
      )}
    </div>
  )
}