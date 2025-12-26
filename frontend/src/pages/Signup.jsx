import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Basic validation
    if (!form.username || !form.password || !form.first_name || !form.last_name || !form.email) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    // Password match validation
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Password length validation
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    // Remove confirmPassword before sending to API
    const { confirmPassword, ...signupData } = form
    const result = await signup(signupData)
    setLoading(false)

    if (result.success) {
      alert(`Account created successfully! User ID: ${result.userID}`);
      navigate('/login');
    } else {
      // Clean translation of Database Integrity Errors
      const errorMsg = result.error || '';
      
      if (errorMsg.includes("Duplicate entry") && errorMsg.includes("email")) {
        setError("This email address is already registered. Please try logging in.");
      } else if (errorMsg.includes("Duplicate entry") && errorMsg.includes("username")) {
        setError("This username is taken. Please choose another one.");
      } else {
        setError(errorMsg || 'Signup failed. Please try again.');
      }
    }
  }

  const updateField = (field, value) => {
    setForm({ ...form, [field]: value })
  }

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-wide">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join Alexandria Library today</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Username *</label>
              <input
                className="input"
                type="text"
                placeholder="Choose a username"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password *</label>
              <input
                className="input"
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                disabled={loading}
                required
                minLength={6}
              />
            </div>
            
            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                className="input"
                type="password"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                disabled={loading}
                required
                minLength={6}
              />
            </div>
            
            <div className="form-group">
              <label>First Name *</label>
              <input
                className="input"
                type="text"
                placeholder="Your first name"
                value={form.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Last Name *</label>
              <input
                className="input"
                type="text"
                placeholder="Your last name"
                value={form.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Email *</label>
              <input
                className="input"
                type="email"
                placeholder="your.email@example.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Phone</label>
              <input
                className="input"
                type="tel"
                placeholder="Your phone number"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Address</label>
            <input
              className="input"
              type="text"
              placeholder="Your address"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              disabled={loading}
            />
          </div>
          
          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
