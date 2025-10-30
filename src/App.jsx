import { useMemo } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import Activities from './pages/Activities.jsx';
import Blog from './pages/Blog.jsx';
import Chat from './pages/Chat.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Admin from './pages/Admin.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import { useAuth } from './context/useAuth.js';
import { getInitials } from './utils/name.js';
import { isAdminAccount } from './utils/admin.js';
import './App.css';

export default function App() {
  const { currentAccount, logout } = useAuth();

  const userInitial = useMemo(
    () => getInitials(currentAccount?.name ?? ''),
    [currentAccount],
  );
  const isLoggedIn = Boolean(currentAccount);
  const profileName = currentAccount?.name?.trim() ?? '';
  const displayName = profileName || 'Your profile';
  const profileInitial = userInitial || displayName.charAt(0)?.toUpperCase() || '?';
  const profileAriaLabel = profileName ? `View profile for ${profileName}` : 'View profile';
  const isAdmin = isAdminAccount(currentAccount);

  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1 className="logo">SportConnect X</h1>
          <nav className="nav">
            <ul>
              <li>
                <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink to="/activities" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                  Activities
                </NavLink>
              </li>
              <li>
                <NavLink to="/blog" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                  Blog
                </NavLink>
              </li>
              <li>
                <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                  Profile
                </NavLink>
              </li>
              {isLoggedIn && (
                <li>
                  <NavLink to="/chat" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                    Chat
                  </NavLink>
                </li>
              )}
              {isAdmin && (
                <li>
                  <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                    Admin
                  </NavLink>
                </li>
              )}
              {!isLoggedIn && (
                <li>
                  <NavLink to="/login" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                    Log in
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>
          <div className="auth-cta">
            {isLoggedIn ? (
              <>
                <NavLink to="/profile" className="profile-chip is-logged-in" aria-label={profileAriaLabel}>
                  <span className="profile-initial" aria-hidden="true">{profileInitial}</span>
                  <span className="profile-name">{displayName}</span>
                </NavLink>
                <button type="button" className="button ghost" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="button ghost auth-link">
                  Log in
                </NavLink>
                <NavLink to="/signup" className="button primary auth-link">
                  Sign up
                </NavLink>
              </>
            )}
          </div>
        </header>

        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>Ready to bring SportConnect X to life? Prototype fast, test with real sporters, and celebrate the wins.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
