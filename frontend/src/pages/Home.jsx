import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="page">
      <div className="hero-section">
        <h1 className="hero-title">Welcome to Alexandria Library</h1>
        <p className="hero-subtitle">
          Discover a world of knowledge. Browse our extensive collection of books.
        </p>
        {user ? (
          <div className="hero-actions">
            <Link to="/search">
              <button className="button button-primary button-large">
                🔍 Search Books
              </button>
            </Link>
            <Link to="/orders">
              <button className="button button-secondary button-large">
                📋 My Orders
              </button>
            </Link>
          </div>
        ) : (
          <div className="hero-actions">
            <Link to="/search">
              <button className="button button-primary button-large">
                🔍 Browse Books
              </button>
            </Link>
            <Link to="/login">
              <button className="button button-secondary button-large">
                Sign In
              </button>
            </Link>
          </div>
        )}
      </div>

      <div className="features-section">
        <div className="feature-card">
          <div className="feature-icon">📚</div>
          <h3>Wide Selection</h3>
          <p>Browse thousands of books across multiple categories</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🛒</div>
          <h3>Easy Shopping</h3>
          <p>Add books to your cart and checkout seamlessly</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📦</div>
          <h3>Fast Delivery</h3>
          <p>Get your books delivered quickly and safely</p>
        </div>
      </div>
    </div>
  )
}
