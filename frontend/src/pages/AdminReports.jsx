import React, { useState, useEffect } from 'react'
import { apiBase } from '../App'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminReports() {
  const [prevMonth, setPrevMonth] = useState(null)
  const [dailySales, setDailySales] = useState(null)
  const [topCustomers, setTopCustomers] = useState([])
  const [topBooks, setTopBooks] = useState([])
  const [replenishment, setReplenishment] = useState(null)
  const [isbn, setIsbn] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('reports') // 'reports' or 'users'
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
    } else if (user.Role !== 'Admin') {
      navigate('/')
    }
  }, [user, navigate])

  const loadPrevMonth = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/admin/reports/sales-prev-month`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      setPrevMonth(data)
    } catch (err) {
      setError('Failed to load previous month sales')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadDailySales = async () => {
    if (!dateInput) {
      setError('Please select a date')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/admin/reports/sales-daily?date_input=${dateInput}`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      setDailySales(data)
    } catch (err) {
      setError('Failed to load daily sales')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadTopReports = async () => {
    setLoading(true)
    setError('')
    try {
      const [customersRes, booksRes] = await Promise.all([
        fetch(`${apiBase}/admin/reports/top-customers`),
        fetch(`${apiBase}/admin/reports/top-selling-books`)
      ])

      if (!customersRes.ok || !booksRes.ok) throw new Error('Failed to load reports')

      const customers = await customersRes.json()
      const books = await booksRes.json()
      setTopCustomers(customers)
      setTopBooks(books)
    } catch (err) {
      setError('Failed to load top reports')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadReplenishment = async () => {
    if (!isbn.trim()) {
      setError('Please enter an ISBN')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/admin/reports/book-replenishments?isbn=${encodeURIComponent(isbn)}`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      setReplenishment(data)
    } catch (err) {
      setError('Failed to load replenishment report')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    setUsersLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/admin/users`)
      if (!res.ok) throw new Error('Failed to load users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setError('Failed to load users')
      console.error(err)
    } finally {
      setUsersLoading(false)
    }
  }

  const promoteUser = async (userID) => {
    if (!window.confirm(`Are you sure you want to promote user ID ${userID} to Admin?`)) {
      return
    }

    try {
      const res = await fetch(`${apiBase}/admin/users/${userID}/promote`, {
        method: 'PUT'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to promote user')
      }

      const data = await res.json()
      alert(data.message)
      loadUsers() // Refresh the user list
    } catch (err) {
      alert(err.message || 'Failed to promote user')
      console.error(err)
    }
  }

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
    }
  }, [activeTab])

  if (!user || user.Role !== 'Admin') {
    return null
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="page">
      <h2 className="page-title">Admin Dashboard</h2>
      <p className="page-subtitle">Manage system reports and users</p>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          <div className="reports-grid">
        {/* Previous Month Sales */}
        <div className="report-card">
          <h3>Previous Month Sales</h3>
          <button
            className="button button-primary"
            onClick={loadPrevMonth}
            disabled={loading}
          >
            Load Report
          </button>
          {prevMonth && (
            <div className="report-result">
              <div className="report-value">
                ${parseFloat(prevMonth.TotalSalesPrevMonth || 0).toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Daily Sales */}
        <div className="report-card">
          <h3>Daily Sales</h3>
          <div className="form-group">
            <input
              className="input"
              type="date"
              max={today}
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
            <button
              className="button button-primary"
              onClick={loadDailySales}
              disabled={loading}
            >
              Load Report
            </button>
          </div>
          {dailySales && (
            <div className="report-result">
              <div className="report-value">
                ${parseFloat(dailySales.DailyTotal || 0).toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Top Customers & Books */}
        <div className="report-card report-card-wide">
          <h3>Top 5 Customers & Top 10 Books (Last 3 Months)</h3>
          <button
            className="button button-primary"
            onClick={loadTopReports}
            disabled={loading}
          >
            Load Reports
          </button>

          {topCustomers.length > 0 && (
            <div className="report-section">
              <h4>Top Customers</h4>
              <div className="report-list">
                {topCustomers.map((customer, idx) => (
                  <div key={customer.username} className="report-item">
                    <span className="report-rank">#{idx + 1}</span>
                    <span className="report-name">{customer.username}</span>
                    <span className="report-amount">${parseFloat(customer.TotalSpent).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topBooks.length > 0 && (
            <div className="report-section">
              <h4>Top Selling Books</h4>
              <div className="report-list">
                {topBooks.map((book, idx) => (
                  <div key={book.Title} className="report-item">
                    <span className="report-rank">#{idx + 1}</span>
                    <span className="report-name">{book.Title}</span>
                    <span className="report-amount">{book.TotalCopiesSold} copies</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Book Replenishment */}
        <div className="report-card">
          <h3>Book Replenishment</h3>
          <div className="form-group">
            <input
              className="input"
              type="text"
              placeholder="Enter ISBN"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
            />
            <button
              className="button button-primary"
              onClick={loadReplenishment}
              disabled={loading}
            >
              Load Report
            </button>
          </div>
          {replenishment && (
            <div className="report-result">
              <div className="report-detail">
                <strong>Book:</strong> {replenishment.Title || 'N/A'}
              </div>
              <div className="report-detail">
                <strong>Orders:</strong> {replenishment.ReplenishmentOrderCount || 0}
              </div>
              <div className="report-detail">
                <strong>Total Restocked:</strong> {replenishment.TotalRestocked || 0}
              </div>
            </div>
          )}
        </div>
          </div>

          {loading && <div className="loading">Loading report...</div>}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="users-management">
          <h3>User Management</h3>
          <button className="button button-primary" onClick={loadUsers} disabled={usersLoading}>
            {usersLoading ? 'Loading...' : 'Refresh Users'}
          </button>

          {usersLoading ? (
            <div className="loading">Loading users...</div>
          ) : users.length === 0 ? (
            <p className="empty-state">No users found</p>
          ) : (
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.userID}>
                      <td>{u.userID}</td>
                      <td>{u.username}</td>
                      <td>{u.first_name} {u.last_name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge role-${u.Role.toLowerCase()}`}>
                          {u.Role}
                        </span>
                      </td>
                      <td>
                        {u.Role === 'Customer' ? (
                          <button
                            className="button button-primary button-small"
                            onClick={() => promoteUser(u.userID)}
                          >
                            Promote to Admin
                          </button>
                        ) : (
                          <span className="text-muted">Already Admin</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
