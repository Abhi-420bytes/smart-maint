import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import AuthPage from './pages/AuthPage.jsx'
import GitHubCallback from './pages/GitHubCallback.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Login / Sign-up page */}
        <Route path="/"                       element={<AuthPage />} />
        <Route path="/login"                  element={<AuthPage />} />

        {/* GitHub OAuth callback */}
        <Route path="/auth/github/callback"   element={<GitHubCallback />} />

        {/* Main dashboard */}
        <Route path="/dashboard"              element={<App />} />

        {/* Catch-all → login */}
        <Route path="*"                       element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
