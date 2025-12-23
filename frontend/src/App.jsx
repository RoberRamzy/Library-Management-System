import React from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Home from './pages/Home'
import Search from './pages/Search'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import Orders from './pages/Orders'
import AdminReports from './pages/AdminReports'
import AdminBooks from './pages/AdminBooks'
import AdminOrders from './pages/AdminOrders'
import BookDetails from './pages/BookDetails'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiBase = API

export default function App(){
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="app">
      <header className="nav">
        <div className="nav-brand">
          <Link to="/" className="brand-link">
            <h1>📚 Alexandria Library</h1>
          </Link>
        </div>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/search">Search</Link>
          {user ? (
            <>
              <Link to="/cart">Cart</Link>
              <Link to="/orders">Orders</Link>
              <Link to="/profile">Profile</Link>
              {user.Role === 'Admin' && (
                <>
                  <Link to="/admin">Reports</Link>
                  <Link to="/admin/books">Books</Link>
                  <Link to="/admin/orders">Orders</Link>
                </>
              )}
              <button className="btn-link" onClick={handleLogout}>Logout</button>
              <span className="user-badge">{user.username}</span>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
            </>
          )}
        </nav>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/search" element={<Search/>} />
          <Route path="/cart" element={<Cart/>} />
          <Route path="/checkout" element={<Checkout/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/signup" element={<Signup/>} />
          <Route path="/profile" element={<Profile/>} />
          <Route path="/orders" element={<Orders/>} />
          <Route path="/admin" element={<AdminReports/>} />
          <Route path="/admin/books" element={<AdminBooks/>} />
          <Route path="/admin/orders" element={<AdminOrders/>} />
          <Route path="/books/:isbn" element={<BookDetails/>} />
        </Routes>
      </main>
    </div>
  )
}
