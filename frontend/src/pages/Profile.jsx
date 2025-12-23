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
    password: ''
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

    setLoading(true)
    setError('')
    setMessage('')

    // Only send fields that have values
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

    const result = await updateProfile(user.userID, updates)
    setLoading(false)

    if (result.success) {
      setMessage('Profile updated successfully!')
      // Clear form except password field is cleared
      setForm({ ...form, password: '' })
      setTimeout(() => setMessage(''), 3000)
    } else {
      setError(result.error || 'Failed to update profile')
    }
  }

  const updateField = (field, value) => {
    setForm({ ...form, [field]: value })
  }

  if (!user) {
    return null
  }

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

          <div className="form-group">
            <label>New Password (leave blank to keep current)</label>
            <input
              className="input"
              type="password"
              placeholder="Enter new password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="user-info">
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Role:</strong> {user.Role}</p>
          </div>

          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
