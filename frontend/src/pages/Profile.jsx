import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '' // Added for verification
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return

    setError('')
    setMessage('')

    // 1. Password Verification Check
    if (form.password) {
      if (form.password.length < 6) {
        setError('New password must be at least 6 characters long')
        return
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setLoading(true)

    // 2. Prepare only modified fields
    const updates = {}
    if (form.first_name) updates.first_name = form.first_name
    if (form.last_name) updates.last_name = form.last_name
    if (form.email) updates.email = form.email
    if (form.phone) updates.phone = form.phone
    if (form.address) updates.address = form.address
    if (form.password) updates.password = form.password

    if (Object.keys(updates).length === 0) {
      setError('Please fill in at least one field to update')
      setLoading(false)
      return
    }

    // 3. Call Auth Context update function
    const result = await updateProfile(user.userID, updates)
    setLoading(false)

    if (result.success) {
      setMessage('Profile updated successfully!')
      // Clear password fields after success
      setForm(prev => ({ ...prev, password: '', confirmPassword: '' }))
      setTimeout(() => setMessage(''), 3000)
    } else {
      // Handle Duplicate Entry errors from MySQL via FastAPI
      const errorMsg = result.error || '';
      if (errorMsg.includes("Duplicate entry") && errorMsg.includes("email")) {
        setError("This email address is already in use by another account.");
      } else if (errorMsg.includes("Duplicate entry") && errorMsg.includes("username")) {
        setError("This username is already taken.");
      } else {
        setError(errorMsg || 'Failed to update profile');
      }
    }
  }

  const updateField = (field, value) => {
    setForm({ ...form, [field]: value })
  }

  if (!user) return null

  return (
    <div className="page">
      <h2 className="page-title">My Profile</h2>
      <p className="page-subtitle">Update your personal information</p>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="profile-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>First Name</label>
              <input
                className="input"
                type="text"
                placeholder="Enter first name"
                value={form.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input
                className="input"
                type="text"
                placeholder="Enter last name"
                value={form.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                className="input"
                type="email"
                placeholder="Enter email address"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                className="input"
                type="tel"
                placeholder="Enter phone number"
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
              placeholder="Enter address"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>New Password</label>
              <input
                className="input"
                type="password"
                placeholder="Leave blank to keep current"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                className="input"
                type="password"
                placeholder="Repeat new password"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="user-info" style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
            <p style={{ margin: '5px 0' }}><strong>Username:</strong> {user.username}</p>
            <p style={{ margin: '5px 0' }}><strong>Role:</strong> {user.Role}</p>
          </div>

          <button 
            className="button button-primary" 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '20px', width: '100%' }}
          >
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}