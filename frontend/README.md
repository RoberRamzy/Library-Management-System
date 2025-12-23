# Frontend (Vite + React)

A modern, responsive React frontend for the Library Management System with full authentication and API integration.

## Features

- 🔐 **Authentication System** - Complete login/signup with session management
- 📚 **Book Search** - Search books by title, category, or ISBN
- 🛒 **Shopping Cart** - Add/remove books from cart
- 💳 **Checkout** - Complete orders with payment information
- 👤 **User Profile** - Update personal information
- 📋 **Order History** - View past orders
- 📊 **Admin Reports** - View sales reports and analytics (Admin only)

## Requirements

- Node.js 18+ and npm

## Installation & Running

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173` by default.

## Configuration

Default API base is `http://localhost:8000`. To override the API URL, create a `.env` file:

```bash
VITE_API_URL=http://localhost:8000
```

Or set it when running:

```bash
# Linux / macOS
VITE_API_URL=http://localhost:8000 npm run dev
```

## Tech Stack

- **React 18** - UI library
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server
- **Context API** - Authentication state management

## Project Structure

```
src/
  ├── context/
  │   └── AuthContext.jsx    # Authentication context provider
  ├── pages/
  │   ├── Home.jsx           # Landing page
  │   ├── Login.jsx          # Login page
  │   ├── Signup.jsx         # Registration page
  │   ├── Search.jsx         # Book search
  │   ├── Cart.jsx           # Shopping cart
  │   ├── Checkout.jsx       # Checkout process
  │   ├── Profile.jsx        # User profile
  │   ├── Orders.jsx         # Order history
  │   └── AdminReports.jsx   # Admin dashboard
  ├── App.jsx                # Main app component with routing
  ├── main.jsx               # Entry point
  └── styles.css             # Global styles
```

## Authentication

The app uses a Context API-based authentication system that:
- Stores user session in localStorage
- Provides user information across all components
- Protects routes that require authentication
- Handles login, signup, and logout

## API Integration

All API calls are made to the FastAPI backend endpoints. The frontend handles:
- Error messages and validation
- Loading states
- Success feedback
- Data formatting and display
