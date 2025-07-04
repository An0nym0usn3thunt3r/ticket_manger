import React, { useState, useEffect } from "react";
// import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// import { PaymentElement, Elements, useStripe, useElements } from "@stripe/react-stripe-js";
// import { loadStripe } from "@stripe/stripe-js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// import TradingViewWidget, { Themes } from 'react-tradingview-widget';
// import { 
//   Events3DGrid, 
//   Hero3D, 
//   Scene3DBackground, 
//   Nav3DElements 
// } from './3DComponents';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BACKEND_URL}/api`;
// const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

// Dark mode context
const ThemeContext = React.createContext();

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Auth Context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { access_token, user: newUser } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(newUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(newUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUser = async (userData) => {
    try {
      const response = await axios.put(`${API}/user/update`, userData);
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      return { success: true, user: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Update failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Components
const Navbar = ({ setActiveView, activeView }) => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setActiveView('home');
    toast.success("Successfully logged out!");
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠', visibleTo: 'all' },
    { id: 'events', label: 'Events', icon: '🎭', visibleTo: 'all' },
    { id: 'tickets', label: 'My Tickets', icon: '🎟️', visibleTo: 'user' },
    { id: 'trading', label: 'Trading', icon: '📈', visibleTo: 'user' },
    { id: 'admin', label: 'Admin', icon: '⚙️', visibleTo: 'admin' }
  ];

  const handleNavClick = (view) => {
    setActiveView(view);
    setMenuOpen(false);
  };

  const isNavItemVisible = (item) => {
    if (item.visibleTo === 'all') return true;
    if (item.visibleTo === 'user' && user) return true;
    if (item.visibleTo === 'admin' && user && (user.role === 'admin' || user.role === 'super_admin')) return true;
    return false;
  };

  return (
    <motion.nav 
      className="navbar"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="nav-container">
        <motion.div 
          className="nav-logo"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleNavClick('home')}
        >
          <span className="logo-icon">🎫</span>
          <span className="logo-text">TicketVerse</span>
          <span className="trading-badge">Trading</span>
        </motion.div>
        
        <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
          {navItems.map(item => (
            isNavItemVisible(item) && (
              <motion.button 
                key={item.id}
                className={`nav-btn ${activeView === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </motion.button>
            )
          ))}
          
          <motion.button
            className="theme-toggle-btn"
            onClick={toggleDarkMode}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {darkMode ? '☀️' : '🌙'}
          </motion.button>
          
          {user ? (
            <div className="auth-buttons">
              <div className="user-info" onClick={() => handleNavClick('profile')}>
                <div className="user-avatar">
                  {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                </div>
                <span className="user-name">{user.first_name}</span>
              </div>
              <motion.button 
                className="auth-btn logout-btn"
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="btn-icon">🚪</span>
                Logout
              </motion.button>
            </div>
          ) : (
            <div className="auth-buttons">
              <motion.button 
                className={`auth-btn login-btn ${activeView === 'login' ? 'active' : ''}`}
                onClick={() => handleNavClick('login')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="btn-icon">🔐</span>
                Login
              </motion.button>
              <motion.button 
                className={`auth-btn register-btn ${activeView === 'register' ? 'active' : ''}`}
                onClick={() => handleNavClick('register')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="btn-icon">📝</span>
                Register
              </motion.button>
            </div>
          )}
        </div>
        
        <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <div className={`bar ${menuOpen ? 'active' : ''}`}></div>
          <div className={`bar ${menuOpen ? 'active' : ''}`}></div>
          <div className={`bar ${menuOpen ? 'active' : ''}`}></div>
        </div>
      </div>
    </motion.nav>
  );
};

const Login = ({ setActiveView }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const result = await login(email, password);
    
    if (result.success) {
      toast.success('Login successful!');
      setActiveView('home');
    } else {
      setError(result.error);
      toast.error(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <motion.div 
      className="auth-form-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <motion.button 
          type="submit" 
          className="submit-btn"
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </motion.button>
        <div className="form-footer">
          <p>
            Don't have an account? <span className="link" onClick={() => setActiveView('register')}>Register</span>
          </p>
        </div>
      </form>
    </motion.div>
  );
};

const Register = ({ setActiveView }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    ieee_member: false,
    ieee_member_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    const userData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      ieee_member: formData.ieee_member,
      ieee_member_id: formData.ieee_member ? formData.ieee_member_id : null
    };
    
    const result = await register(userData);
    
    if (result.success) {
      toast.success('Registration successful!');
      setActiveView('home');
    } else {
      setError(result.error);
      toast.error(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <motion.div 
      className="auth-form-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2>Register</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-row">
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            name="ieee_member"
            id="ieee_member"
            checked={formData.ieee_member}
            onChange={handleChange}
          />
          <label htmlFor="ieee_member">I am an IEEE member</label>
        </div>
        {formData.ieee_member && (
          <motion.div 
            className="form-group"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <label>IEEE Member ID</label>
            <input
              type="text"
              name="ieee_member_id"
              value={formData.ieee_member_id}
              onChange={handleChange}
              required={formData.ieee_member}
            />
            <div className="file-upload">
              <label>Upload IEEE Member ID Card</label>
              <input
                type="file"
                name="ieee_id_card"
                accept="image/*,.pdf"
              />
            </div>
          </motion.div>
        )}
        {error && <div className="error-message">{error}</div>}
        <motion.button 
          type="submit" 
          className="submit-btn"
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isLoading ? 'Registering...' : 'Register'}
        </motion.button>
        <div className="form-footer">
          <p>
            Already have an account? <span className="link" onClick={() => setActiveView('login')}>Login</span>
          </p>
        </div>
      </form>
    </motion.div>
  );
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    ieee_member: user?.ieee_member || false,
    ieee_member_id: user?.ieee_member_id || '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [apiKeys, setApiKeys] = useState({
    api_key: '',
    api_secret: '',
    exchange: 'binance'
  });
  const [savingApiKeys, setSavingApiKeys] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleApiKeyChange = (e) => {
    const { name, value } = e.target;
    setApiKeys(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    
    // Check if passwords match if changing password
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      setError('New passwords do not match');
      setIsLoading(false);
      return;
    }
    
    const updateData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
      ieee_member: formData.ieee_member,
      ieee_member_id: formData.ieee_member ? formData.ieee_member_id : null
    };
    
    // Add password only if changing it
    if (formData.current_password && formData.new_password) {
      updateData.current_password = formData.current_password;
      updateData.password = formData.new_password;
    }
    
    const result = await updateUser(updateData);
    
    if (result.success) {
      setMessage('Profile updated successfully');
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));
    } else {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  const handleApiKeySubmit = async (e) => {
    e.preventDefault();
    setSavingApiKeys(true);
    
    try {
            await axios.post(`${API}/trading/api-credentials`, apiKeys);
      toast.success('Trading API credentials saved successfully');
      setApiKeys(prev => ({
        ...prev,
        api_key: '',
        api_secret: ''
      }));
      user.has_trading_api = true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save API credentials');
    } finally {
      setSavingApiKeys(false);
    }
  };

  const verifyIEEEMembership = async () => {
    try {
      // This would handle the IEEE verification process
      // For demonstration, we'll assume it's successful
      await axios.post(`${API}/user/ieee-verify`, {
        member_id: formData.ieee_member_id,
        verification_file: "base64_string_here"
      });
      
      // Update user state with the updated user data
      await updateUser({});
      toast.success('IEEE membership verified successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verification failed');
    }
  };

  return (
    <motion.div 
      className="profile-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="profile-header">
        <h2>My Profile</h2>
        <div className="user-avatar large">
          {user?.first_name.charAt(0)}{user?.last_name.charAt(0)}
        </div>
      </div>
      
      <div className="profile-tabs">
        <div className="tab-container">
          <div className="tabs">
            <div className="tab active">Personal Info</div>
            <div className="tab">Trading API</div>
            <div className="tab">Security</div>
          </div>
          
          <div className="tab-content">
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="disabled-input"
                />
                <small>Email cannot be changed</small>
              </div>
              
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-divider"></div>
              
              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  name="ieee_member"
                  id="profile_ieee_member"
                  checked={formData.ieee_member}
                  onChange={handleChange}
                />
                <label htmlFor="profile_ieee_member">I am an IEEE member</label>
              </div>
              
              {formData.ieee_member && (
                <motion.div 
                  className="ieee-section"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="form-group">
                    <label>IEEE Member ID</label>
                    <input
                      type="text"
                      name="ieee_member_id"
                      value={formData.ieee_member_id}
                      onChange={handleChange}
                      required={formData.ieee_member}
                    />
                  </div>
                  
                  {!user?.ieee_verified && (
                    <div className="verification-section">
                      <div className="verification-status not-verified">
                        <span className="status-icon">⚠️</span>
                        IEEE membership not verified
                      </div>
                      <div className="file-upload">
                        <label>Upload IEEE Member ID Card</label>
                        <input
                          type="file"
                          name="ieee_id_card"
                          accept="image/*,.pdf"
                        />
                      </div>
                      <motion.button 
                        type="button"
                        className="verify-btn"
                        onClick={verifyIEEEMembership}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Verify Membership
                      </motion.button>
                    </div>
                  )}
                  
                  {user?.ieee_verified && (
                    <div className="verification-status verified">
                      <span className="status-icon">✅</span>
                      IEEE membership verified
                    </div>
                  )}
                </motion.div>
              )}
              
              <div className="form-divider"></div>
              
              <h3>Change Password</h3>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="current_password"
                  value={formData.current_password}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="new_password"
                    value={formData.new_password}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              {error && <div className="error-message">{error}</div>}
              {message && <div className="success-message">{message}</div>}
              
              <div className="form-actions">
                <motion.button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </motion.button>
              </div>
            </form>

            {/* Trading API Section */}
            <form onSubmit={handleApiKeySubmit} className="api-keys-form">
              <h3>Trading API Credentials</h3>
              <div className="api-status">
                <span className="status-label">Status:</span>
                {user?.has_trading_api ? (
                  <span className="status-value connected">Connected</span>
                ) : (
                  <span className="status-value not-connected">Not Connected</span>
                )}
              </div>
              
              <div className="form-group">
                <label>Exchange</label>
                <select 
                  name="exchange" 
                  value={apiKeys.exchange}
                  onChange={handleApiKeyChange}
                >
                  <option value="binance">Binance</option>
                  <option value="kucoin">KuCoin</option>
                  <option value="coinbase">Coinbase</option>
                  <option value="bybit">Bybit</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  name="api_key"
                  value={apiKeys.api_key}
                  onChange={handleApiKeyChange}
                  required
                  autoComplete="off"
                />
              </div>
              
              <div className="form-group">
                <label>API Secret</label>
                <input
                  type="password"
                  name="api_secret"
                  value={apiKeys.api_secret}
                  onChange={handleApiKeyChange}
                  required
                  autoComplete="off"
                />
              </div>
              
              <div className="api-security-note">
                <div className="note-header">
                  <span className="note-icon">🔒</span>
                  <span>Security Note</span>
                </div>
                <p>
                  Your API keys are encrypted and securely stored. For security, 
                  create API keys with read and trading permissions only, without withdrawal access.
                </p>
              </div>
              
              <div className="form-actions">
                <motion.button 
                  type="submit" 
                  className="submit-btn"
                  disabled={savingApiKeys}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {savingApiKeys ? 'Saving...' : (user?.has_trading_api ? 'Update API Keys' : 'Connect API')}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const EventCard = ({ event, onSelect }) => {
  const { darkMode } = useTheme();
  
  return (
    <motion.div 
      className={`event-card ${darkMode ? 'dark' : ''}`}
      whileHover={{ scale: 1.03, boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.1)" }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(event)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="event-image">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} />
        ) : (
          <div className="placeholder-image">🎭</div>
        )}
        {event.featured && <div className="featured-badge">Featured</div>}
      </div>
      <div className="event-details">
        <h3>{event.title}</h3>
        <p className="event-date">
          <span className="icon">📅</span>
          {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
        </p>
        <p className="event-location">
          <span className="icon">📍</span>
          {event.location}
        </p>
        <div className="event-price">
          <span className="price-tag">
            From ${event.price_regular}
          </span>
          {event.price_ieee_member && (
            <span className="ieee-price-tag">
              IEEE: ${event.price_ieee_member}
            </span>
          )}
        </div>
        <motion.button 
          className="view-details-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(event);
          }}
        >
          View Details
        </motion.button>
      </div>
    </motion.div>
  );
};

const Events = ({ setActiveView }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filter, setFilter] = useState('all'); // all, upcoming, ongoing, completed
  const [searchTerm, setSearchTerm] = useState('');
  const [view3D, setView3D] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log('Fetching events from:', `${API}/events`);
        const response = await axios.get(`${API}/events`);
        console.log('Events response:', response.data);
        setEvents(response.data);
      } catch (error) {
        toast.error('Failed to fetch events');
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
  };

  const handleBackToEvents = () => {
    setSelectedEvent(null);
  };

  const filteredEvents = events
    .filter(event => {
      // Apply status filter
      if (filter !== 'all' && event.status !== filter) return false;
      
      // Apply search filter
      if (searchTerm && !event.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !event.location.toLowerCase().includes(searchTerm.toLowerCase())) return false;
          
      return true;
    });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  return (
    <div className="events-container">
      {selectedEvent ? (
        <EventDetails 
          event={selectedEvent} 
          onBack={handleBackToEvents}
          setActiveView={setActiveView} 
        />
      ) : (
        <>
          <div className="events-header">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Discover Events
            </motion.h2>
            <div className="events-actions">
              <div className="search-bar glassmorphism">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="search-icon">🔍</button>
              </div>
              <div className="filter-buttons">
                <button 
                  className={filter === 'all' ? 'active' : ''} 
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                <button 
                  className={filter === 'upcoming' ? 'active' : ''} 
                  onClick={() => setFilter('upcoming')}
                >
                  Upcoming
                </button>
                <button 
                  className={filter === 'ongoing' ? 'active' : ''} 
                  onClick={() => setFilter('ongoing')}
                >
                  Ongoing
                </button>
              </div>
              <div className="view-toggle">
                <button 
                  className={!view3D ? 'active' : ''} 
                  onClick={() => setView3D(false)}
                  title="Grid View"
                >
                  📋
                </button>
                <button 
                  className={view3D ? 'active' : ''} 
                  onClick={() => setView3D(true)}
                  title="3D View"
                >
                  🌐
                </button>
              </div>
            </div>
          </div>

          {/* view3D && filteredEvents.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <Events3DGrid 
                events={filteredEvents} 
                onEventSelect={handleEventSelect}
              />
            </motion.div>
          ) : */ filteredEvents.length > 0 ? (
            <motion.div 
              className="events-grid interactive-3d"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="card-3d"
                >
                  <EventCard 
                    event={event} 
                    onSelect={handleEventSelect} 
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              className="no-events glassmorphism"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="no-events-icon floating-element">🔍</div>
              <p>No events found matching your criteria.</p>
              <motion.button 
                onClick={() => {
                  setFilter('all');
                  setSearchTerm('');
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="neon-glow"
              >
                Clear Filters
              </motion.button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

const EventDetails = ({ event, onBack, setActiveView }) => {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [quantity, setQuantity] = useState(1);
  const [ticketType, setTicketType] = useState('regular');
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);

  // Calculate the base price based on ticket type and IEEE membership
  const getBasePrice = () => {
    if (ticketType === 'ieee' && user?.ieee_member) {
      return event.price_ieee_member || event.price_regular;
    }
    return event.price_regular;
  };

  // Calculate the total price
  const calculateTotal = () => {
    const basePrice = getBasePrice();
    const subtotal = basePrice * quantity;
    const discountAmount = couponApplied ? subtotal * (discount / 100) : 0;
    return subtotal - discountAmount;
  };

  const handleQuantityChange = (e) => {
    setQuantity(Math.max(1, parseInt(e.target.value) || 1));
  };

  const handleTicketTypeChange = (e) => {
    setTicketType(e.target.value);
  };

  const handleCouponChange = (e) => {
    setCouponCode(e.target.value);
    if (couponApplied) {
      setCouponApplied(false);
      setDiscount(0);
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setIsValidatingCoupon(true);
    
    try {
      const response = await axios.post(`${API}/validate-coupon`, {
        coupon_code: couponCode,
        event_id: event.id
      });
      
      if (response.data.valid) {
        setCouponApplied(true);
        setDiscount(response.data.discount_percentage);
        toast.success(`Coupon applied! ${response.data.discount_percentage}% discount`);
      } else {
        toast.error(response.data.message || 'Invalid coupon code');
        setCouponApplied(false);
        setDiscount(0);
      }
    } catch (error) {
      toast.error('Error validating coupon');
      console.error('Error validating coupon:', error);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  const proceedToCheckout = () => {
    if (!user) {
      toast.error('Please login to purchase tickets');
      setActiveView('login');
      return;
    }
    
    if (ticketType === 'ieee' && !user.ieee_verified) {
      toast.error('You need to verify your IEEE membership to purchase IEEE member tickets');
      setActiveView('profile');
      return;
    }
    
    setShowPaymentForm(true);
  };

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please login to purchase tickets');
      return;
    }
    
    setProcessingPayment(true);
    
    try {
      // If crypto payment, show crypto payment modal
      if (paymentMethod === 'crypto') {
        setShowCryptoModal(true);
        setProcessingPayment(false);
        return;
      }
      
      // This would be integrated with your actual payment processing
      const purchaseData = {
        event_id: event.id,
        quantity,
        ticket_type: ticketType,
        payment_method: paymentMethod,
        total_amount: calculateTotal(),
        coupon_code: couponApplied ? couponCode : null
      };
      
      const response = await axios.post(`${API}/purchase-tickets`, purchaseData);
      
      toast.success('Tickets purchased successfully!');
      setShowPaymentForm(false);
      setActiveView('tickets');
      
    } catch (error) {
      toast.error('Failed to process payment');
      console.error('Payment error:', error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const completeCryptoPayment = async () => {
    setProcessingPayment(true);
    setShowCryptoModal(false);
    
    try {
      const purchaseData = {
        event_id: event.id,
        quantity,
        ticket_type: ticketType,
        payment_method: 'crypto',
        total_amount: calculateTotal(),
        coupon_code: couponApplied ? couponCode : null
      };
      
      const response = await axios.post(`${API}/purchase-tickets`, purchaseData);
      
      toast.success('Crypto payment successful! Tickets purchased successfully!');
      setShowPaymentForm(false);
      setActiveView('tickets');
    } catch (error) {
      toast.error('Failed to process crypto payment');
      console.error('Payment error:', error);
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <motion.div 
      className={`event-details-container ${darkMode ? 'dark' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button 
        className="back-button" 
        onClick={onBack}
        whileHover={{ x: -5 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="back-icon">←</span> Back to Events
      </motion.button>
      
      <div className="event-details-content">
        <div className="event-details-image">
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} />
          ) : (
            <div className="placeholder-image-large">🎭</div>
          )}
          <div className={`event-status-badge ${event.status}`}>
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </div>
        </div>
        
        <div className="event-details-info">
          <h1>{event.title}</h1>
          
          <div className="event-meta">
            <div className="meta-item">
              <span className="meta-icon">📅</span>
              <span>
                {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">🕒</span>
              <span>
                {new Date(event.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">📍</span>
              <span>{event.location}</span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">💰</span>
              <span>
                ${event.price_regular}
                {event.price_ieee_member && (
                  <span className="ieee-price"> (IEEE: ${event.price_ieee_member})</span>
                )}
              </span>
            </div>
          </div>
          
          <div className="event-description">
            <h3>Description</h3>
            <p>{event.description}</p>
          </div>
          
          {!showPaymentForm ? (
            <div className="ticket-purchase-form">
              <h3>Purchase Tickets</h3>
              
              <div className="form-group">
                <label>Ticket Type</label>
                <select 
                  value={ticketType} 
                  onChange={handleTicketTypeChange}
                  disabled={!user}
                  className="ticket-select"
                >
                  <option value="regular">Regular Ticket</option>
                  <option value="ieee" disabled={!user?.ieee_verified}>
                    IEEE Member Ticket {!user?.ieee_verified && '(Verification Required)'}
                  </option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Quantity</label>
                <div className="quantity-control">
                  <button 
                    className="quantity-btn" 
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  >-</button>
                  <input 
                    type="number" 
                    min="1" 
                    value={quantity}
                    onChange={handleQuantityChange}
                    disabled={!user}
                  />
                  <button 
                    className="quantity-btn" 
                    onClick={() => setQuantity(prev => prev + 1)}
                  >+</button>
                </div>
              </div>
              
              <div className="coupon-form">
                <div className="form-group">
                  <label>Coupon Code</label>
                  <div className="coupon-input-group">
                    <input 
                      type="text" 
                      value={couponCode}
                      onChange={handleCouponChange}
                      disabled={!user || isValidatingCoupon}
                      placeholder="Enter coupon code"
                    />
                    <motion.button 
                      onClick={validateCoupon}
                      disabled={!user || !couponCode || isValidatingCoupon}
                      className="apply-coupon-btn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isValidatingCoupon ? 'Validating...' : 'Apply'}
                    </motion.button>
                  </div>
                </div>
                
                {couponApplied && (
                  <div className="coupon-success">
                    <span className="success-icon">✅</span>
                    Coupon applied: {discount}% discount
                  </div>
                )}
              </div>
              
              <div className="price-summary">
                <div className="price-row">
                  <span>Base Price:</span>
                  <span>${getBasePrice()}</span>
                </div>
                <div className="price-row">
                  <span>Quantity:</span>
                  <span>x {quantity}</span>
                </div>
                <div className="price-row subtotal">
                  <span>Subtotal:</span>
                  <span>${getBasePrice() * quantity}</span>
                </div>
                {couponApplied && (
                  <div className="price-row discount">
                    <span>Discount ({discount}%):</span>
                    <span>-${(getBasePrice() * quantity * (discount / 100)).toFixed(2)}</span>
                  </div>
                )}
                <div className="price-row total">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
              
              <motion.button 
                className="purchase-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={proceedToCheckout}
                disabled={!user}
              >
                {user ? 'Proceed to Payment' : 'Login to Purchase Tickets'}
              </motion.button>
            </div>
          ) : (
            <div className="payment-form">
              <h3>Payment Information</h3>
              
              <div className="form-group">
                <label>Payment Method</label>
                <div className="payment-methods">
                  <div className="payment-method">
                    <input 
                      type="radio" 
                      id="card" 
                      name="paymentMethod" 
                      value="card"
                      checked={paymentMethod === 'card'} 
                      onChange={handlePaymentMethodChange}
                    />
                    <label htmlFor="card">
                      <span className="payment-icon">💳</span>
                      Credit/Debit Card
                    </label>
                  </div>
                  <div className="payment-method">
                    <input 
                      type="radio" 
                      id="paypal" 
                      name="paymentMethod" 
                      value="paypal"
                      checked={paymentMethod === 'paypal'} 
                      onChange={handlePaymentMethodChange}
                    />
                    <label htmlFor="paypal">
                      <span className="payment-icon">🅿️</span>
                      PayPal
                    </label>
                  </div>
                  <div className="payment-method">
                    <input 
                      type="radio" 
                      id="applepay" 
                      name="paymentMethod" 
                      value="applepay"
                      checked={paymentMethod === 'applepay'} 
                      onChange={handlePaymentMethodChange}
                    />
                    <label htmlFor="applepay">
                      <span className="payment-icon">🍎</span>
                      Apple Pay
                    </label>
                  </div>
                  <div className="payment-method">
                    <input 
                      type="radio" 
                      id="googlepay" 
                      name="paymentMethod" 
                      value="googlepay"
                      checked={paymentMethod === 'googlepay'} 
                      onChange={handlePaymentMethodChange}
                    />
                    <label htmlFor="googlepay">
                      <span className="payment-icon">🔍</span>
                      Google Pay
                    </label>
                  </div>
                  <div className="payment-method">
                    <input 
                      type="radio" 
                      id="crypto" 
                      name="paymentMethod" 
                      value="crypto"
                      checked={paymentMethod === 'crypto'} 
                      onChange={handlePaymentMethodChange}
                    />
                    <label htmlFor="crypto">
                      <span className="payment-icon">₿</span>
                      Cryptocurrency
                    </label>
                  </div>
                </div>
              </div>
              
              {paymentMethod === 'card' && (
                <div className="card-payment-form">
                  <div className="form-group">
                    <label>Card Number</label>
                    <input 
                      type="text" 
                      placeholder="1234 5678 9012 3456" 
                      className="card-input"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input type="text" placeholder="MM/YY" />
                    </div>
                    <div className="form-group">
                      <label>CVC</label>
                      <input type="text" placeholder="123" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Cardholder Name</label>
                    <input type="text" placeholder="John Doe" />
                  </div>
                </div>
              )}
              
              {paymentMethod === 'paypal' && (
                <div className="external-payment-info">
                  <div className="payment-logo paypal-logo">
                    <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg" alt="PayPal" />
                  </div>
                  <p>You will be redirected to PayPal to complete your purchase.</p>
                </div>
              )}
              
              {paymentMethod === 'applepay' && (
                <div className="external-payment-info">
                  <div className="payment-logo apple-pay-logo">
                    <img src="https://developer.apple.com/apple-pay/marketing/images/logo_apple_pay.svg" alt="Apple Pay" />
                  </div>
                  <p>You will be prompted to use Apple Pay to complete your purchase.</p>
                </div>
              )}
              
              {paymentMethod === 'googlepay' && (
                <div className="external-payment-info">
                  <div className="payment-logo google-pay-logo">
                    <img src="https://developers.google.com/pay/api/images/brand-guidelines/google-pay-mark.png" alt="Google Pay" />
                  </div>
                  <p>You will be prompted to use Google Pay to complete your purchase.</p>
                </div>
              )}
              
              {paymentMethod === 'crypto' && (
                <div className="external-payment-info">
                  <div className="crypto-options">
                    <div className="crypto-option">
                      <input type="radio" id="btc" name="cryptoType" value="bitcoin" defaultChecked />
                      <label htmlFor="btc">
                        <span className="crypto-icon">₿</span>
                        Bitcoin
                      </label>
                    </div>
                    <div className="crypto-option">
                      <input type="radio" id="eth" name="cryptoType" value="ethereum" />
                      <label htmlFor="eth">
                        <span className="crypto-icon">Ξ</span>
                        Ethereum
                      </label>
                    </div>
                    <div className="crypto-option">
                      <input type="radio" id="usdt" name="cryptoType" value="usdt" />
                      <label htmlFor="usdt">
                        <span className="crypto-icon">₮</span>
                        USDT
                      </label>
                    </div>
                  </div>
                  <p>Payment details will be provided on the next screen.</p>
                </div>
              )}
              
              <div className="order-summary">
                <h4>Order Summary</h4>
                <div className="summary-item">
                  <span>Event:</span>
                  <span>{event.title}</span>
                </div>
                <div className="summary-item">
                  <span>Date:</span>
                  <span>{new Date(event.start_date).toLocaleDateString()}</span>
                </div>
                <div className="summary-item">
                  <span>Ticket Type:</span>
                  <span>{ticketType === 'ieee' ? 'IEEE Member' : 'Regular'}</span>
                </div>
                <div className="summary-item">
                  <span>Quantity:</span>
                  <span>{quantity}</span>
                </div>
                {couponApplied && (
                  <div className="summary-item discount">
                    <span>Discount:</span>
                    <span>{discount}% off</span>
                  </div>
                )}
                <div className="summary-item total">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
              
              <div className="payment-actions">
                <motion.button 
                  className="cancel-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowPaymentForm(false)}
                  disabled={processingPayment}
                >
                  Back
                </motion.button>
                <motion.button 
                  className="confirm-payment-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePurchase}
                  disabled={processingPayment}
                >
                  {processingPayment ? 'Processing...' : `Pay $${calculateTotal().toFixed(2)}`}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Crypto Payment Modal */}
      {showCryptoModal && (
        <div className="modal-overlay">
          <motion.div 
            className="modal-content crypto-modal"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="modal-header">
              <h3>Crypto Payment</h3>
              <button className="close-modal" onClick={() => setShowCryptoModal(false)}>×</button>
            </div>
            
            <div className="crypto-payment-details">
              <div className="qr-code-container">
                <div className="qr-code">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=bitcoin:ADDRESS_HERE?amount=0.01" alt="QR Code" />
                </div>
              </div>
              
              <div className="payment-instructions">
                <h4>Payment Instructions</h4>
                <div className="payment-detail">
                  <span>Amount:</span>
                  <span>0.01 BTC</span>
                </div>
                <div className="payment-detail">
                  <span>Address:</span>
                  <div className="address-copy">
                    <span className="address">bc1q.....a9s8d7f</span>
                    <button className="copy-btn">Copy</button>
                  </div>
                </div>
                <div className="time-remaining">
                  <span>Time Remaining:</span>
                  <span className="timer">14:59</span>
                </div>
                <div className="confirmation-note">
                  <p>
                    <strong>Note:</strong> Payment will be confirmed after 1 blockchain confirmation.
                    This may take 10-30 minutes.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowCryptoModal(false)}>Cancel</button>
              <button className="confirm-btn" onClick={completeCryptoPayment}>
                I've Completed Payment
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

const MyTickets = ({ setActiveView }) => {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, used, expired

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await axios.get(`${API}/user/tickets`);
        setTickets(response.data);
      } catch (error) {
        toast.error('Failed to fetch tickets');
        console.error('Error fetching tickets:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const handleTicketSelect = (ticket) => {
    setSelectedTicket(ticket);
  };

  const handleBackToTickets = () => {
    setSelectedTicket(null);
  };
  
  const filteredTickets = tickets.filter(ticket => {
    return filter === 'all' || ticket.status === filter;
  });

  if (!user) {
    return (
      <div className="unauthorized-message">
        <div className="unauthorized-icon">🔒</div>
        <h2>Authentication Required</h2>
        <p>Please login to view your tickets.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading tickets...</p>
      </div>
    );
  }

  return (
    <div className={`tickets-container ${darkMode ? 'dark' : ''}`}>
      {selectedTicket ? (
        <TicketDetails ticket={selectedTicket} onBack={handleBackToTickets} />
      ) : (
        <>
          <div className="tickets-header">
            <h2>My Tickets</h2>
            <div className="filter-buttons">
              <button 
                className={filter === 'all' ? 'active' : ''} 
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button 
                className={filter === 'active' ? 'active' : ''} 
                onClick={() => setFilter('active')}
              >
                Active
              </button>
              <button 
                className={filter === 'used' ? 'active' : ''} 
                onClick={() => setFilter('used')}
              >
                Used
              </button>
              <button 
                className={filter === 'expired' ? 'active' : ''} 
                onClick={() => setFilter('expired')}
              >
                Expired
              </button>
            </div>
          </div>
          
          <div className="tickets-list">
            {filteredTickets.length > 0 ? (
              filteredTickets.map(ticket => (
                <motion.div 
                  key={ticket.id} 
                  className={`ticket-card ${ticket.status}`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTicketSelect(ticket)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="ticket-header">
                    <h3>{ticket.event.title}</h3>
                    <span className={`ticket-status ${ticket.status}`}>{ticket.status}</span>
                  </div>
                  <div className="ticket-body">
                    <div className="ticket-detail">
                      <span>Date:</span>
                      <span>{new Date(ticket.event.start_date).toLocaleDateString()}</span>
                    </div>
                    <div className="ticket-detail">
                      <span>Time:</span>
                      <span>{new Date(ticket.event.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="ticket-detail">
                      <span>Location:</span>
                      <span>{ticket.event.location}</span>
                    </div>
                    <div className="ticket-detail">
                      <span>Quantity:</span>
                      <span>{ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''}</span>
                    </div>
                    <div className="ticket-detail">
                      <span>Type:</span>
                      <span>{ticket.ticket_type === 'ieee' ? 'IEEE Member' : 'Regular'}</span>
                    </div>
                  </div>
                  <div className="ticket-footer">
                    <span className="ticket-id">ID: {ticket.id.substring(0, 8)}...</span>
                    <span className="view-ticket">View Details →</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="no-tickets-message">
                <div className="no-tickets-icon">🎟️</div>
                <p>You don't have any tickets yet.</p>
                <button onClick={() => setActiveView('events')}>Browse Events</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const TicketDetails = ({ ticket, onBack }) => {
  const { darkMode } = useTheme();
  const [showAddToWallet, setShowAddToWallet] = useState(false);
  
  useEffect(() => {
    // Check if device supports Apple/Google Wallet
    const isAppleDevice = /iPhone|iPad|iPod|Mac/.test(navigator.userAgent);
    const isAndroidDevice = /Android/.test(navigator.userAgent);
    
    setShowAddToWallet(isAppleDevice || isAndroidDevice);
  }, []);
  
  const downloadTicketPDF = () => {
    toast.info('Downloading ticket as PDF...');
    // In a real app, this would trigger a PDF download
    setTimeout(() => {
      toast.success('Ticket downloaded successfully');
    }, 1500);
  };
  
  const emailTicket = () => {
    toast.info('Sending ticket to your email...');
    // In a real app, this would send the ticket to the user's email
    setTimeout(() => {
      toast.success('Ticket sent to your email');
    }, 1500);
  };
  
  const addToWallet = () => {
    toast.info('Adding ticket to digital wallet...');
    // In a real app, this would add the ticket to Apple/Google Wallet
    setTimeout(() => {
      toast.success('Ticket added to wallet');
    }, 1500);
  };

  return (
    <motion.div 
      className={`ticket-details-container ${darkMode ? 'dark' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button 
        className="back-button" 
        onClick={onBack}
        whileHover={{ x: -5 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="back-icon">←</span> Back to My Tickets
      </motion.button>
      
      <div className="ticket-details-content">
        <div className="ticket-header-detail">
          <h1>{ticket.event.title}</h1>
          <span className={`ticket-status ${ticket.status}`}>{ticket.status}</span>
        </div>
        
        <div className="ticket-details-card">
          <div className="ticket-qr-section">
            <div className="ticket-qr-code">
              <img src={`data:image/png;base64,${ticket.qr_code}`} alt="Ticket QR Code" />
            </div>
            <div className="ticket-id-detail">
              <span>Ticket ID</span>
              <span>{ticket.id}</span>
            </div>
            <div className="validity-tag">
              {ticket.status === 'active' ? 'Valid' : 'Invalid'}
            </div>
          </div>
          
          <div className="ticket-info-section">
            <div className="ticket-info-row">
              <div className="info-label">Event</div>
              <div className="info-value">{ticket.event.title}</div>
            </div>
            <div className="ticket-info-row">
              <div className="info-label">Date</div>
              <div className="info-value">
                {new Date(ticket.event.start_date).toLocaleDateString()}
              </div>
            </div>
            <div className="ticket-info-row">
              <div className="info-label">Time</div>
              <div className="info-value">
                {new Date(ticket.event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="ticket-info-row">
              <div className="info-label">Location</div>
              <div className="info-value">{ticket.event.location}</div>
            </div>
            <div className="ticket-info-row">
              <div className="info-label">Ticket Type</div>
              <div className="info-value">{ticket.ticket_type === 'ieee' ? 'IEEE Member' : 'Regular'}</div>
            </div>
            <div className="ticket-info-row">
              <div className="info-label">Quantity</div>
              <div className="info-value">{ticket.quantity}</div>
            </div>
            <div className="ticket-info-row">
              <div className="info-label">Purchase Date</div>
              <div className="info-value">{new Date(ticket.created_at).toLocaleString()}</div>
            </div>
            <div className="ticket-info-row">
              <div className="info-label">Payment Method</div>
              <div className="info-value">{ticket.payment_method}</div>
            </div>
            {ticket.coupon_code && (
              <div className="ticket-info-row">
                <div className="info-label">Coupon Applied</div>
                <div className="info-value">{ticket.coupon_code}</div>
              </div>
            )}
            <div className="ticket-info-row">
              <div className="info-label">Total Paid</div>
              <div className="info-value">${ticket.total_amount}</div>
            </div>
          </div>
        </div>
        
        <div className="ticket-actions">
          <motion.button 
            className="ticket-action-btn download-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadTicketPDF}
          >
            <span className="action-icon">📄</span>
            Download PDF
          </motion.button>
          <motion.button 
            className="ticket-action-btn email-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={emailTicket}
          >
            <span className="action-icon">📧</span>
            Email Ticket
          </motion.button>
          {showAddToWallet && (
            <motion.button 
              className="ticket-action-btn wallet-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={addToWallet}
            >
              <span className="action-icon">👝</span>
              Add to Wallet
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('events');
  
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="unauthorized-message">
        <div className="unauthorized-icon">🔒</div>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }
  
  return (
    <div className={`admin-dashboard ${darkMode ? 'dark' : ''}`}>
      <div className="admin-header-main">
        <h2>Admin Dashboard</h2>
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-icon">🎟️</div>
            <div className="stat-value">152</div>
            <div className="stat-label">Tickets Sold</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-value">$4,320</div>
            <div className="stat-label">Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-value">89</div>
            <div className="stat-label">Active Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎭</div>
            <div className="stat-value">12</div>
            <div className="stat-label">Events</div>
          </div>
        </div>
      </div>
      
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <span className="tab-icon">🎭</span>
          Events
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          <span className="tab-icon">🎟️</span>
          Tickets
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span className="tab-icon">👥</span>
          Users
        </button>
        <button 
          className={`tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('coupons')}
        >
          <span className="tab-icon">🏷️</span>
          Coupons
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <span className="tab-icon">📊</span>
          Analytics
        </button>
      </div>
      
      <div className="admin-content">
        {activeTab === 'events' && <AdminEvents />}
        {activeTab === 'tickets' && <AdminTickets />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'coupons' && <AdminCoupons />}
        {activeTab === 'analytics' && <AdminAnalytics />}
      </div>
    </div>
  );
};

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${API}/admin/events`);
        setEvents(response.data);
      } catch (error) {
        toast.error('Failed to fetch events');
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  const handleAddEvent = () => {
    setEditingEvent(null);
    setShowForm(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await axios.delete(`${API}/admin/events/${eventId}`);
        setEvents(events.filter(event => event.id !== eventId));
        toast.success('Event deleted successfully');
      } catch (error) {
        toast.error('Failed to delete event');
        console.error('Error deleting event:', error);
      }
    }
  };

  const handleFormClose = (refreshData = false) => {
    setShowForm(false);
    setEditingEvent(null);
    
    if (refreshData) {
      setLoading(true);
      const fetchEvents = async () => {
        try {
          const response = await axios.get(`${API}/admin/events`);
          setEvents(response.data);
        } catch (error) {
          toast.error('Failed to refresh events');
        } finally {
          setLoading(false);
        }
      };
      
      fetchEvents();
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  return (
    <div className="admin-events">
      <div className="admin-header">
        <h3>Events Management</h3>
        <motion.button 
          className="admin-add-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddEvent}
        >
          <span className="btn-icon">➕</span>
          Add Event
        </motion.button>
      </div>
      
      {showForm && (
        <EventForm 
          event={editingEvent} 
          onClose={handleFormClose} 
        />
      )}
      
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Location</th>
              <th>Regular Price</th>
              <th>IEEE Price</th>
              <th>Status</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event.id}>
                <td>{event.title}</td>
                <td>
                  {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                </td>
                <td>{event.location}</td>
                <td>${event.price_regular}</td>
                <td>${event.price_ieee_member || '-'}</td>
                <td>
                  <span className={`status ${event.status}`}>{event.status}</span>
                </td>
                <td>
                  <span className={`featured-status ${event.featured ? 'featured' : 'not-featured'}`}>
                    {event.featured ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="actions">
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditEvent(event)}
                  >
                    ✏️
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EventForm = ({ event, onClose }) => {
  const { darkMode } = useTheme();
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    start_date: event?.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
    end_date: event?.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
    price_regular: event?.price_regular || '',
    price_ieee_member: event?.price_ieee_member || '',
    status: event?.status || 'upcoming',
    featured: event?.featured || false,
    image_url: event?.image_url || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      if (event) {
        // Update existing event
        await axios.put(`${API}/admin/events/${event.id}`, formData);
        toast.success('Event updated successfully');
      } else {
        // Create new event
        await axios.post(`${API}/admin/events`, formData);
        toast.success('Event created successfully');
      }
      
      onClose(true); // Close form and refresh data
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'An error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <motion.div 
        className={`modal-content ${darkMode ? 'dark' : ''}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="modal-header">
          <h2>{event ? 'Edit Event' : 'Add New Event'}</h2>
          <button 
            className="close-btn"
            onClick={() => onClose()}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
            ></textarea>
          </div>
          
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Start Date & Time</label>
              <input
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>End Date & Time</label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Regular Price ($)</label>
              <input
                type="number"
                name="price_regular"
                value={formData.price_regular}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>IEEE Member Price ($)</label>
              <input 
                                type="number"
                name="price_ieee_member"
                value={formData.price_ieee_member}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="Optional"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                name="featured"
                id="featured"
                checked={formData.featured}
                onChange={handleChange}
              />
              <label htmlFor="featured">Featured Event</label>
            </div>
          </div>
          
          <div className="form-group">
            <label>Image URL</label>
            <input
              type="text"
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              placeholder="Optional"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => onClose()}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await axios.get(`${API}/admin/tickets`);
        setTickets(response.data);
      } catch (error) {
        toast.error('Failed to fetch tickets');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTickets();
  }, []);
  
  const updateTicketStatus = async (ticketId, status) => {
    try {
      await axios.put(`${API}/admin/tickets/${ticketId}/status`, { status });
      
      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status } : ticket
      ));
      
      toast.success(`Ticket status updated to ${status}`);
    } catch (error) {
      toast.error('Failed to update ticket status');
    }
  };
  
  const filteredTickets = tickets.filter(ticket => {
    // Apply status filter
    if (filter !== 'all' && ticket.status !== filter) return false;
    
    // Apply search filter to event title or user email
    if (searchTerm && !ticket.event?.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !ticket.user?.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  });
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading tickets...</p>
      </div>
    );
  }
  
  return (
    <div className="admin-tickets">
      <div className="admin-header">
        <h3>Tickets Management</h3>
        <div className="admin-filters">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search events or users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="used">Used</option>
            <option value="expired">Expired</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>
      
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Event</th>
              <th>User</th>
              <th>Quantity</th>
              <th>Type</th>
              <th>Purchase Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map(ticket => (
              <tr key={ticket.id}>
                <td>{ticket.id.substring(0, 8)}...</td>
                <td>{ticket.event?.title || 'N/A'}</td>
                <td>{ticket.user?.email || 'N/A'}</td>
                <td>{ticket.quantity}</td>
                <td>{ticket.ticket_type === 'ieee' ? 'IEEE' : 'Regular'}</td>
                <td>{new Date(ticket.created_at).toLocaleString()}</td>
                <td>${ticket.total_amount}</td>
                <td>
                  <span className={`status ${ticket.status}`}>{ticket.status}</span>
                </td>
                <td className="actions">
                  <select 
                    value="" 
                    onChange={(e) => {
                      if (e.target.value) {
                        updateTicketStatus(ticket.id, e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">Change Status</option>
                    <option value="active">Active</option>
                    <option value="used">Used</option>
                    <option value="expired">Expired</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API}/admin/users`);
        setUsers(response.data);
      } catch (error) {
        toast.error('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  const updateUserRole = async (userId, role) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/role`, { role });
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role } : user
      ));
      
      toast.success(`User role updated to ${role}`);
    } catch (error) {
      toast.error('Failed to update user role');
    }
  };
  
  const verifyIEEE = async (userId) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/verify-ieee`, { ieee_verified: true });
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, ieee_verified: true } : user
      ));
      
      toast.success('IEEE membership verified');
    } catch (error) {
      toast.error('Failed to verify IEEE membership');
    }
  };
  
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    
    return (
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }
  
  return (
    <div className="admin-users">
      <div className="admin-header">
        <h3>Users Management</h3>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Role</th>
              <th>IEEE Member</th>
              <th>Trading API</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <span className={`role ${user.role}`}>{user.role}</span>
                </td>
                <td>
                  {user.ieee_member ? (
                    <span className={`ieee-status ${user.ieee_verified ? 'verified' : 'unverified'}`}>
                      {user.ieee_verified ? 'Verified' : 'Unverified'}
                    </span>
                  ) : (
                    <span>No</span>
                  )}
                </td>
                <td>
                  <span className={`api-status ${user.has_trading_api ? 'connected' : 'not-connected'}`}>
                    {user.has_trading_api ? 'Connected' : 'Not Connected'}
                  </span>
                </td>
                <td className="actions">
                  <button 
                    className="view-btn"
                    onClick={() => setSelectedUser(user)}
                  >
                    👁️
                  </button>
                  <select 
                    value="" 
                    onChange={(e) => {
                      if (e.target.value) {
                        updateUserRole(user.id, e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="role-select"
                  >
                    <option value="">Change Role</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  {user.ieee_member && !user.ieee_verified && (
                    <button 
                      className="verify-btn"
                      onClick={() => verifyIEEE(user.id)}
                    >
                      ✓ Verify IEEE
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {selectedUser && (
        <div className="modal-overlay">
          <motion.div 
            className="modal-content user-detail-modal"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="modal-header">
              <h3>User Details</h3>
              <button className="close-btn" onClick={() => setSelectedUser(null)}>×</button>
            </div>
            
            <div className="user-details">
              <div className="user-profile-header">
                <div className="user-avatar large">
                  {selectedUser.first_name.charAt(0)}{selectedUser.last_name.charAt(0)}
                </div>
                <div>
                  <h3>{selectedUser.first_name} {selectedUser.last_name}</h3>
                  <p>{selectedUser.email}</p>
                  <span className={`role ${selectedUser.role}`}>{selectedUser.role}</span>
                </div>
              </div>
              
              <div className="user-info-grid">
                <div className="info-item">
                  <span className="label">Phone:</span>
                  <span>{selectedUser.phone || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Member since:</span>
                  <span>{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                </div>
                <div className="info-item">
                  <span className="label">IEEE Member:</span>
                  <span>{selectedUser.ieee_member ? 'Yes' : 'No'}</span>
                </div>
                {selectedUser.ieee_member && (
                  <div className="info-item">
                    <span className="label">IEEE ID:</span>
                    <span>{selectedUser.ieee_member_id || 'Not provided'}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="label">IEEE Verified:</span>
                  <span className={selectedUser.ieee_verified ? 'verified' : 'not-verified'}>
                    {selectedUser.ieee_verified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Trading API:</span>
                  <span>{selectedUser.has_trading_api ? 'Connected' : 'Not connected'}</span>
                </div>
              </div>
              
              <div className="user-actions">
                <button className="action-btn email-btn">
                  📧 Email User
                </button>
                <button className="action-btn reset-btn">
                  🔄 Reset Password
                </button>
                {selectedUser.ieee_member && !selectedUser.ieee_verified && (
                  <button 
                    className="action-btn verify-btn"
                    onClick={() => {
                      verifyIEEE(selectedUser.id);
                      setSelectedUser({...selectedUser, ieee_verified: true});
                    }}
                  >
                    ✓ Verify IEEE
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch coupons
        const couponsResponse = await axios.get(`${API}/admin/coupons`);
        setCoupons(couponsResponse.data);
        
        // Fetch events for the dropdown
        const eventsResponse = await axios.get(`${API}/admin/events`);
        setEvents(eventsResponse.data);
      } catch (error) {
        toast.error('Failed to fetch data');
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleAddCoupon = () => {
    setEditingCoupon(null);
    setShowForm(true);
  };

  const handleEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    setShowForm(true);
  };

  const handleDeleteCoupon = async (couponId) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      try {
        await axios.delete(`${API}/admin/coupons/${couponId}`);
        setCoupons(coupons.filter(coupon => coupon.id !== couponId));
        toast.success('Coupon deleted successfully');
      } catch (error) {
        toast.error('Failed to delete coupon');
        console.error('Error deleting coupon:', error);
      }
    }
  };

  const handleFormClose = (refreshData = false) => {
    setShowForm(false);
    setEditingCoupon(null);
    
    if (refreshData) {
      setLoading(true);
      const fetchCoupons = async () => {
        try {
          const response = await axios.get(`${API}/admin/coupons`);
          setCoupons(response.data);
        } catch (error) {
          toast.error('Failed to refresh coupons');
        } finally {
          setLoading(false);
        }
      };
      
      fetchCoupons();
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading coupons...</p>
      </div>
    );
  }

  return (
    <div className="admin-coupons">
      <div className="admin-header">
        <h3>Coupon Management</h3>
        <motion.button 
          className="admin-add-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddCoupon}
        >
          <span className="btn-icon">➕</span>
          Add Coupon
        </motion.button>
      </div>
      
      {showForm && (
        <CouponForm 
          coupon={editingCoupon}
          events={events}
          onClose={handleFormClose}
        />
      )}
      
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Event</th>
              <th>Valid From</th>
              <th>Valid Until</th>
              <th>Max Uses</th>
              <th>Uses Left</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map(coupon => (
              <tr key={coupon.id}>
                <td className="coupon-code">{coupon.code}</td>
                <td>{coupon.discount_percentage}%</td>
                <td>{coupon.event_id ? (coupon.event?.title || coupon.event_id) : 'All Events'}</td>
                <td>{new Date(coupon.valid_from).toLocaleDateString()}</td>
                <td>{coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : 'No Expiry'}</td>
                <td>{coupon.max_uses || 'Unlimited'}</td>
                <td>
                  {coupon.max_uses ? 
                    (coupon.max_uses - coupon.used_count) : 
                    'Unlimited'}
                </td>
                <td>
                  <span className={`status ${coupon.active ? 'active' : 'inactive'}`}>
                    {coupon.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="actions">
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditCoupon(coupon)}
                  >
                    ✏️
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteCoupon(coupon.id)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CouponForm = ({ coupon, events, onClose }) => {
  const { darkMode } = useTheme();
  const [formData, setFormData] = useState({
    code: coupon?.code || generateCouponCode(),
    discount_percentage: coupon?.discount_percentage || 10,
    event_id: coupon?.event_id || '',
    valid_from: coupon?.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    valid_until: coupon?.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 10) : '',
    max_uses: coupon?.max_uses || '',
    active: coupon ? coupon.active : true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Function to generate random coupon code
  function generateCouponCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const generateNewCode = () => {
    setFormData({
      ...formData,
      code: generateCouponCode()
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      if (coupon) {
        // Update existing coupon
        await axios.put(`${API}/admin/coupons/${coupon.id}`, formData);
        toast.success('Coupon updated successfully');
      } else {
        // Create new coupon
        await axios.post(`${API}/admin/coupons`, formData);
        toast.success('Coupon created successfully');
      }
      
      onClose(true); // Close form and refresh data
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'An error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <motion.div 
        className={`modal-content ${darkMode ? 'dark' : ''}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="modal-header">
          <h2>{coupon ? 'Edit Coupon' : 'Add New Coupon'}</h2>
          <button 
            className="close-btn"
            onClick={() => onClose()}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="coupon-form">
          <div className="form-group">
            <label>Coupon Code</label>
            <div className="code-input-group">
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                placeholder="e.g., SUMMER2025"
              />
              <button 
                type="button" 
                className="generate-code-btn"
                onClick={generateNewCode}
              >
                Generate
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label>Discount Percentage</label>
            <input
              type="number"
              name="discount_percentage"
              value={formData.discount_percentage}
              onChange={handleChange}
              required
              min="0"
              max="100"
              placeholder="e.g., 25 for 25%"
            />
          </div>
          
          <div className="form-group">
            <label>Apply to Event (Optional)</label>
            <select
              name="event_id"
              value={formData.event_id}
              onChange={handleChange}
            >
              <option value="">All Events</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Valid From</label>
              <input
                type="date"
                name="valid_from"
                value={formData.valid_from}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Valid Until (Optional)</label>
              <input
                type="date"
                name="valid_until"
                value={formData.valid_until}
                onChange={handleChange}
                min={formData.valid_from}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Maximum Uses (Optional)</label>
            <input
              type="number"
              name="max_uses"
              value={formData.max_uses}
              onChange={handleChange}
              min="0"
              placeholder="Leave blank for unlimited"
            />
          </div>
          
          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              name="active"
              id="coupon_active"
              checked={formData.active}
              onChange={handleChange}
            />
            <label htmlFor="coupon_active">Active</label>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => onClose()}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (coupon ? 'Update Coupon' : 'Create Coupon')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const AdminAnalytics = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [analyticsData, setAnalyticsData] = useState({
    sales: {
      data: [],
      total: 0
    },
    tickets: {
      data: [],
      total: 0
    },
    users: {
      data: [],
      total: 0,
      newUsers: 0
    },
    events: {
      total: 0,
      upcoming: 0,
      ongoing: 0
    }
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // In a real app, this would fetch real analytics data
    const fetchAnalyticsData = async () => {
      try {
        // For demo purposes, generate random data
        const dates = generateDateRange(timeRange);
        
        const salesData = dates.map(date => ({
          date,
          value: Math.floor(Math.random() * 500) + 100
        }));
        
        const ticketsData = dates.map(date => ({
          date,
          value: Math.floor(Math.random() * 30) + 5
        }));
        
        const usersData = dates.map(date => ({
          date,
          value: Math.floor(Math.random() * 10) + 1
        }));
        
        setAnalyticsData({
          sales: {
            data: salesData,
            total: salesData.reduce((sum, item) => sum + item.value, 0)
          },
          tickets: {
            data: ticketsData,
            total: ticketsData.reduce((sum, item) => sum + item.value, 0)
          },
          users: {
            data: usersData,
            total: 245,
            newUsers: usersData.reduce((sum, item) => sum + item.value, 0)
          },
          events: {
            total: 15,
            upcoming: 8,
            ongoing: 2
          }
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [timeRange]);
  
  // Helper function to generate date range
  const generateDateRange = (range) => {
    const dates = [];
    const today = new Date();
    let daysToInclude = 30;
    
    if (range === 'week') daysToInclude = 7;
    if (range === 'year') daysToInclude = 12; // Monthly for year view
    
    for (let i = 0; i < daysToInclude; i++) {
      const date = new Date();
      if (range === 'year') {
        // For year view, go back by months
        date.setMonth(today.getMonth() - i);
        dates.unshift(date.toLocaleDateString('en-US', { month: 'short' }));
      } else {
        // For week and month views, go back by days
        date.setDate(today.getDate() - i);
        dates.unshift(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      }
    }
    
    return dates;
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }
  
  return (
    <div className="admin-analytics">
      <div className="analytics-header">
        <h3>Analytics Dashboard</h3>
        <div className="time-range-selector">
          <button 
            className={timeRange === 'week' ? 'active' : ''}
            onClick={() => setTimeRange('week')}
          >
            Week
          </button>
          <button 
            className={timeRange === 'month' ? 'active' : ''}
            onClick={() => setTimeRange('month')}
          >
            Month
          </button>
          <button 
            className={timeRange === 'year' ? 'active' : ''}
            onClick={() => setTimeRange('year')}
          >
            Year
          </button>
        </div>
      </div>
      
      <div className="analytics-summary">
        <div className="summary-card">
          <div className="summary-icon sales-icon">💰</div>
          <div className="summary-details">
            <h4>Revenue</h4>
            <div className="summary-value">${analyticsData.sales.total.toLocaleString()}</div>
            <div className="summary-trend positive">
              <span className="trend-icon">↑</span>
              <span>12.5% from last {timeRange}</span>
            </div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon tickets-icon">🎟️</div>
          <div className="summary-details">
            <h4>Tickets Sold</h4>
            <div className="summary-value">{analyticsData.tickets.total.toLocaleString()}</div>
            <div className="summary-trend positive">
              <span className="trend-icon">↑</span>
              <span>8.3% from last {timeRange}</span>
            </div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon users-icon">👥</div>
          <div className="summary-details">
            <h4>Total Users</h4>
            <div className="summary-value">{analyticsData.users.total.toLocaleString()}</div>
            <div className="summary-trend">
              <span>+{analyticsData.users.newUsers} new this {timeRange}</span>
            </div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon events-icon">🎭</div>
          <div className="summary-details">
            <h4>Active Events</h4>
            <div className="summary-value">{analyticsData.events.upcoming + analyticsData.events.ongoing}</div>
            <div className="summary-trend">
              <span>{analyticsData.events.upcoming} upcoming, {analyticsData.events.ongoing} ongoing</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="analytics-charts">
        <div className="chart-container">
          <h4>Revenue Over Time</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.sales.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                label={{ value: 'Date', position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis 
                label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
              <Legend />
              <Line type="monotone" dataKey="value" name="Revenue" stroke="#3a86ff" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container">
          <h4>Tickets Sold</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.tickets.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                label={{ value: 'Date', position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis 
                label={{ value: 'Tickets', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(value) => [`${value} tickets`, 'Sales']} />
              <Legend />
              <Line type="monotone" dataKey="value" name="Tickets" stroke="#ff006e" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="analytics-charts">
        <div className="chart-container">
          <h4>New User Registrations</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.users.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                label={{ value: 'Date', position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis 
                label={{ value: 'Users', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip formatter={(value) => [`${value} users`, 'New Users']} />
              <Legend />
              <Line type="monotone" dataKey="value" name="Users" stroke="#00b894" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container">
          <h4>Event Statistics</h4>
          <div className="event-stats">
            <div className="event-stat-item">
              <div className="stat-circle total">
                {analyticsData.events.total}
              </div>
              <div className="stat-label">Total Events</div>
            </div>
            <div className="event-stat-item">
              <div className="stat-circle upcoming">
                {analyticsData.events.upcoming}
              </div>
              <div className="stat-label">Upcoming</div>
            </div>
            <div className="event-stat-item">
              <div className="stat-circle ongoing">
                {analyticsData.events.ongoing}
              </div>
              <div className="stat-label">Ongoing</div>
            </div>
            <div className="event-stat-item">
              <div className="stat-circle completed">
                {analyticsData.events.total - analyticsData.events.upcoming - analyticsData.events.ongoing}
              </div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Trading Components
const TradingDashboard = () => {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [tradingBots, setTradingBots] = useState([]);
  const [botStats, setBotStats] = useState({
    active: 0,
    totalProfit: 0,
    totalTrades: 0,
    winRate: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTradingData = async () => {
      try {
        if (user && user.has_trading_api) {
          // Fetch user's trading bots
          const botsResponse = await axios.get(`${API}/trading/bots`);
          setTradingBots(botsResponse.data);
          
          // Calculate bot statistics
          const activeBotsCount = botsResponse.data.filter(bot => bot.active).length;
          
          // In a real app, these would be actual values from the API
          const totalProfit = botsResponse.data.reduce((sum, bot) => sum + (bot.total_profit || 0), 0);
          const totalTrades = botsResponse.data.reduce((sum, bot) => sum + (bot.total_trades || 0), 100);
          const winRate = totalTrades > 0 ? 
            botsResponse.data.reduce((sum, bot) => sum + (bot.winning_trades || 0), 60) / totalTrades * 100 : 
            0;
          
          setBotStats({
            active: activeBotsCount,
            totalProfit,
            totalTrades,
            winRate
          });
        }
      } catch (error) {
        console.error('Error fetching trading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTradingData();
  }, [user]);
  
  if (!user) {
    return (
      <div className="unauthorized-message">
        <div className="unauthorized-icon">🔒</div>
        <h2>Authentication Required</h2>
        <p>Please login to access trading features.</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading trading dashboard...</p>
      </div>
    );
  }
  
  if (!user.has_trading_api) {
    return (
      <div className="trading-setup-required">
        <div className="setup-icon">🔗</div>
        <h2>Trading API Connection Required</h2>
        <p>Please connect your trading API keys to access the trading features.</p>
        <p>Go to your profile settings to set up your trading API connection.</p>
      </div>
    );
  }
  
  return (
    <div className={`trading-dashboard ${darkMode ? 'dark' : ''}`}>
      <div className="trading-header">
        <h2>Trading Dashboard</h2>
        <div className="trading-stats">
          <div className="trading-stat-card">
            <div className="stat-title">Active Bots</div>
            <div className="stat-value">{botStats.active}</div>
          </div>
          <div className="trading-stat-card">
            <div className="stat-title">Total Profit</div>
            <div className={`stat-value ${botStats.totalProfit >= 0 ? 'profit' : 'loss'}`}>
              {botStats.totalProfit >= 0 ? '+' : '-'}${Math.abs(botStats.totalProfit).toFixed(2)}
            </div>
          </div>
          <div className="trading-stat-card">
            <div className="stat-title">Total Trades</div>
            <div className="stat-value">{botStats.totalTrades}</div>
          </div>
          <div className="trading-stat-card">
            <div className="stat-title">Win Rate</div>
            <div className="stat-value">{botStats.winRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>
      
      <div className="trading-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="tab-icon">📊</span>
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bots' ? 'active' : ''}`}
          onClick={() => setActiveTab('bots')}
        >
          <span className="tab-icon">🤖</span>
          Trading Bots
        </button>
        <button 
          className={`tab-btn ${activeTab === 'signals' ? 'active' : ''}`}
          onClick={() => setActiveTab('signals')}
        >
          <span className="tab-icon">📈</span>
          Signals
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="tab-icon">📜</span>
          Trade History
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="tab-icon">⚙️</span>
          Settings
        </button>
      </div>
      
      <div className="trading-content">
        {activeTab === 'overview' && <TradingOverview />}
        {activeTab === 'bots' && <TradingBots tradingBots={tradingBots} setTradingBots={setTradingBots} />}
        {activeTab === 'signals' && <TradingSignals />}
        {activeTab === 'history' && <TradeHistory />}
        {activeTab === 'settings' && <TradingSettings />}
      </div>
    </div>
  );
};

const TradingOverview = () => {
  const [marketOverview, setMarketOverview] = useState({
    bitcoin: { price: 67524.32, change: 2.34 },
    ethereum: { price: 3245.67, change: -1.45 },
    bnb: { price: 532.18, change: 0.87 },
    solana: { price: 143.56, change: 5.21 }
  });
  const [latestSignals, setLatestSignals] = useState([
    { id: 1, symbol: 'BTC/USDT', signal: 'BUY', strength: 'STRONG', indicator: 'RSI', time: '10 min ago' },
    { id: 2, symbol: 'ETH/USDT', signal: 'SELL', strength: 'MEDIUM', indicator: 'MACD', time: '25 min ago' },
    { id: 3, symbol: 'SOL/USDT', signal: 'BUY', strength: 'WEAK', indicator: 'BOLLINGER', time: '1 hour ago' }
  ]);
  const [portfolioValue, setPortfolioValue] = useState({
    current: 12750.43,
    change: 320.56,
    changePercent: 2.58,
    data: [
      { date: 'Mon', value: 12400 },
      { date: 'Tue', value: 12300 },
      { date: 'Wed', value: 12500 },
      { date: 'Thu', value: 12200 },
      { date: 'Fri', value: 12600 },
      { date: 'Sat', value: 12500 },
      { date: 'Sun', value: 12750 }
    ]
  });
  
  return (
    <div className="trading-overview">
      <div className="overview-section">
        <h3>Market Overview</h3>
        <div className="market-cards">
          {Object.entries(marketOverview).map(([coin, data]) => (
            <div key={coin} className="market-card">
              <div className="coin-icon">{coin === 'bitcoin' ? '₿' : coin === 'ethereum' ? 'Ξ' : coin === 'bnb' ? 'BNB' : 'SOL'}</div>
              <div className="coin-details">
                <div className="coin-name">{coin.charAt(0).toUpperCase() + coin.slice(1)}</div>
                <div className="coin-price">${data.price.toLocaleString()}</div>
                <div className={`coin-change ${data.change >= 0 ? 'positive' : 'negative'}`}>
                  {data.change >= 0 ? '↑' : '↓'} {Math.abs(data.change)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="overview-row">
        <div className="overview-section portfolio-section">
          <h3>Portfolio Value</h3>
          <div className="portfolio-value">
            <div className="current-value">${portfolioValue.current.toLocaleString()}</div>
            <div className={`value-change ${portfolioValue.change >= 0 ? 'positive' : 'negative'}`}>
              {portfolioValue.change >= 0 ? '+' : '-'}${Math.abs(portfolioValue.change).toLocaleString()} ({Math.abs(portfolioValue.changePercent)}%)
            </div>
          </div>
          <div className="portfolio-chart">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={portfolioValue.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip formatter={(value) => [`$${value}`, 'Value']} />
                <Line type="monotone" dataKey="value" stroke="#3a86ff" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="overview-section signals-section">
          <h3>Latest Signals</h3>
          <div className="signals-list">
            {latestSignals.map(signal => (
              <div key={signal.id} className="signal-item">
                <div className="signal-pair">{signal.symbol}</div>
                <div className={`signal-type ${signal.signal.toLowerCase()}`}>
                  {signal.signal === 'BUY' ? '⬆️' : '⬇️'} {signal.signal}
                </div>
                <div className={`signal-strength ${signal.strength.toLowerCase()}`}>
                  {signal.strength}
                </div>
                <div className="signal-indicator">{signal.indicator}</div>
                <div className="signal-time">{signal.time}</div>
              </div>
            ))}
          </div>
          <button className="view-all-btn">View All Signals</button>
        </div>
      </div>
      
      <div className="overview-section chart-section">
        <h3>Bitcoin/USDT Chart</h3>
        <div className="trading-view-chart">
          <div className="chart-placeholder">
            <div className="placeholder-content">
              <h4>📈 Trading Chart</h4>
              <p>Advanced trading chart will be available here</p>
              <small>Bitcoin/USDT - Real-time data</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TradingBots = ({ tradingBots, setTradingBots }) => {
  const [showNewBotForm, setShowNewBotForm] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);
  
  const handleToggleBot = async (botId, currentState) => {
    try {
      const response = await axios.put(`${API}/trading/bots/${botId}/toggle`);
      
      if (response.data.success) {
        // Update bot status in the list
        setTradingBots(prev => 
          prev.map(bot => bot.id === botId ? { ...bot, active: response.data.active } : bot)
        );
        
        const status = response.data.active ? 'activated' : 'deactivated';
        toast.success(`Bot ${status} successfully`);
      }
    } catch (error) {
      toast.error('Failed to update bot status');
    }
  };
  
  return (
    <div className="trading-bots">
      <div className="bots-header">
        <h3>Your Trading Bots</h3>
        <motion.button 
          className="new-bot-btn"
          onClick={() => setShowNewBotForm(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="btn-icon">➕</span>
          Create New Bot
        </motion.button>
      </div>
      
      {tradingBots.length === 0 ? (
        <div className="no-bots-message">
          <div className="no-bots-icon">🤖</div>
          <p>You don't have any trading bots yet.</p>
          <motion.button 
            onClick={() => setShowNewBotForm(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Create Your First Bot
          </motion.button>
        </div>
      ) : (
        <div className="bots-grid">
          {tradingBots.map(bot => (
            <motion.div 
              key={bot.id}
              className={`bot-card ${bot.active ? 'active' : 'inactive'}`}
              whileHover={{ scale: 1.02 }}
            >
              <div className="bot-header">
                <div className={`bot-status ${bot.active ? 'active' : 'inactive'}`}>
                  <span className="status-dot"></span>
                  {bot.active ? 'Active' : 'Inactive'}
                </div>
                <div className="bot-actions">
                  <button 
                    className="edit-bot-btn"
                    onClick={() => setSelectedBot(bot)}
                  >
                    ⚙️
                  </button>
                </div>
              </div>
              
              <div className="bot-name">{bot.symbol}</div>
              <div className="bot-strategy">Strategy: {bot.strategy.toUpperCase()}</div>
              
              <div className="bot-stats">
                <div className="bot-stat">
                  <div className="stat-label">Risk Level</div>
                  <div className={`stat-value risk-${bot.risk_level}`}>
                    {bot.risk_level.charAt(0).toUpperCase() + bot.risk_level.slice(1)}
                  </div>
                </div>
                <div className="bot-stat">
                  <div className="stat-label">Trade Amount</div>
                  <div className="stat-value">{bot.trade_amount_percentage}%</div>
                </div>
              </div>
              
              <div className="bot-stats">
                <div className="bot-stat">
                  <div className="stat-label">Take Profit</div>
                  <div className="stat-value">{bot.take_profit_percentage}%</div>
                </div>
                <div className="bot-stat">
                  <div className="stat-label">Stop Loss</div>
                  <div className="stat-value">{bot.stop_loss_percentage}%</div>
                </div>
              </div>
              
              <div className="bot-performance">
                <div className="performance-item">
                  <div className="item-label">Profit/Loss</div>
                  <div className={`item-value ${(bot.total_profit || 0) >= 0 ? 'profit' : 'loss'}`}>
                    {(bot.total_profit || 0) >= 0 ? '+' : '-'}${Math.abs(bot.total_profit || 0).toFixed(2)}
                  </div>
                </div>
                <div className="performance-item">
                  <div className="item-label">Win Rate</div>
                  <div className="item-value">{bot.win_rate || 0}%</div>
                </div>
              </div>
              
              <div className="bot-footer">
                <div className="toggle-container">
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={bot.active}
                      onChange={() => handleToggleBot(bot.id, bot.active)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <button className="view-trades-btn">
                  View Trades
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {showNewBotForm && (
        <TradingBotForm 
          onClose={() => setShowNewBotForm(false)}
          setTradingBots={setTradingBots}
        />
      )}
      
      {selectedBot && (
        <TradingBotForm 
          bot={selectedBot}
          onClose={() => setSelectedBot(null)}
          setTradingBots={setTradingBots}
        />
      )}
    </div>
  );
};

const TradingBotForm = ({ bot, onClose, setTradingBots }) => {
  const { darkMode } = useTheme();
  const [formData, setFormData] = useState({
    symbol: bot?.symbol || 'BTCUSDT',
    strategy: bot?.strategy || 'combined',
    risk_level: bot?.risk_level || 'medium',
    trade_amount_percentage: bot?.trade_amount_percentage || 5,
    max_trades_per_day: bot?.max_trades_per_day || 5,
    take_profit_percentage: bot?.take_profit_percentage || 2,
    stop_loss_percentage: bot?.stop_loss_percentage || 1,
    base_asset: bot?.base_asset || 'BTC',
    quote_asset: bot?.quote_asset || 'USDT',
    active: bot?.active || false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Available trading pairs
  const tradingPairs = [
    { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT' },
    { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT' },
    { symbol: 'BNBUSDT', base: 'BNB', quote: 'USDT' },
    { symbol: 'ADAUSDT', base: 'ADA', quote: 'USDT' },
    { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT' },
    { symbol: 'DOGEUSDT', base: 'DOGE', quote: 'USDT' },
    { symbol: 'XRPUSDT', base: 'XRP', quote: 'USDT' },
    { symbol: 'DOTUSDT', base: 'DOT', quote: 'USDT' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // If symbol changes, update base and quote assets
    if (name === 'symbol') {
      const pair = tradingPairs.find(p => p.symbol === value);
      if (pair) {
        setFormData(prev => ({
          ...prev,
          symbol: value,
          base_asset: pair.base,
          quote_asset: pair.quote
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      if (bot) {
        // Update existing bot
        await axios.put(`${API}/trading/bots/${bot.id}`, formData);
        toast.success('Trading bot updated successfully');
        
        // Update bot in the list
        setTradingBots(prev => 
          prev.map(b => b.id === bot.id ? { ...b, ...formData } : b)
        );
      } else {
        // Create new bot
        const response = await axios.post(`${API}/trading/bots`, formData);
        toast.success('Trading bot created successfully');
        
        // Add new bot to the list
        setTradingBots(prev => [...prev, { ...formData, id: response.data.bot_id }]);
      }
      
      onClose();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'An error occurred';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <motion.div 
        className={`modal-content trading-bot-form ${darkMode ? 'dark' : ''}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="modal-header">
          <h2>{bot ? 'Edit Trading Bot' : 'Create Trading Bot'}</h2>
          <button 
            className="close-btn"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Trading Pair</label>
            <select
              name="symbol"
              value={formData.symbol}
              onChange={handleChange}
              required
            >
              {tradingPairs.map(pair => (
                <option key={pair.symbol} value={pair.symbol}>
                  {pair.symbol}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Trading Strategy</label>
            <select
              name="strategy"
              value={formData.strategy}
              onChange={handleChange}
              required
            >
              <option value="rsi">RSI Strategy</option>
              <option value="macd">MACD Strategy</option>
              <option value="bollinger">Bollinger Bands Strategy</option>
              <option value="combined">Combined Strategy</option>
            </select>
            <div className="strategy-info">
              {formData.strategy === 'rsi' && (
                <p>RSI strategy buys when RSI is below 30 and sells when above 70.</p>
              )}
              {formData.strategy === 'macd' && (
                <p>MACD strategy buys on bullish crossovers and sells on bearish crossovers.</p>
              )}
              {formData.strategy === 'bollinger' && (
                <p>Bollinger Bands strategy buys when price touches lower band and sells when it touches upper band.</p>
              )}
              {formData.strategy === 'combined' && (
                <p>Combined strategy uses multiple indicators for stronger signals.</p>
              )}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Risk Level</label>
              <select
                name="risk_level"
                value={formData.risk_level}
                onChange={handleChange}
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="form-group">
              <label>Trade Amount (% of balance)</label>
              <input
                type="number"
                name="trade_amount_percentage"
                value={formData.trade_amount_percentage}
                onChange={handleChange}
                required
                min="1"
                max="100"
              />
                      </div>
        </div>
          
        <div className="form-row">
          <div className="form-group">
            <label>Max Trades per Day</label>
            <input
              type="number"
              name="max_trades_per_day"
              value={formData.max_trades_per_day}
              onChange={handleChange}
              required
              min="1"
              max="50"
            />
          </div>
          <div className="form-group">
            <label>Take Profit (%)</label>
            <input
              type="number"
              name="take_profit_percentage"
              value={formData.take_profit_percentage}
              onChange={handleChange}
              required
              min="0.1"
              step="0.1"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Stop Loss (%)</label>
          <input
            type="number"
            name="stop_loss_percentage"
            value={formData.stop_loss_percentage}
            onChange={handleChange}
            required
            min="0.1"
            step="0.1"
          />
        </div>
        
        <div className="risk-display">
          <h4>Risk Profile</h4>
          <div className="risk-meter">
            <div className="risk-meter-bar">
              <div 
                className={`risk-level ${formData.risk_level}`} 
                style={{
                  width: 
                    formData.risk_level === 'low' ? '33.3%' : 
                    formData.risk_level === 'medium' ? '66.6%' : '100%'
                }}
              ></div>
            </div>
            <div className="risk-labels">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
          <div className="risk-explanation">
            {formData.risk_level === 'low' && (
              <p>Low risk means smaller position sizes, tighter stop-losses and smaller but more consistent profits.</p>
            )}
            {formData.risk_level === 'medium' && (
              <p>Medium risk balances position sizes and stop-losses for moderate growth while maintaining reasonable safety.</p>
            )}
            {formData.risk_level === 'high' && (
              <p>High risk uses larger position sizes with wider stop-losses for potentially higher returns but increased downside.</p>
            )}
          </div>
        </div>
        
        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            name="active"
            id="bot_active"
            checked={formData.active}
            onChange={handleChange}
          />
          <label htmlFor="bot_active">Activate bot immediately after {bot ? 'updating' : 'creation'}</label>
        </div>
        
        <div className="advanced-settings-toggle">
          <details>
            <summary>Advanced Settings</summary>
            <div className="advanced-settings">
              <div className="form-row">
                <div className="form-group">
                  <label>Backtesting Period (Days)</label>
                  <input type="number" defaultValue="30" min="7" max="365" />
                </div>
                <div className="form-group">
                  <label>Margin Type</label>
                  <select defaultValue="isolated">
                    <option value="isolated">Isolated</option>
                    <option value="cross">Cross</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Maximum Leverage</label>
                  <select defaultValue="1">
                    <option value="1">1x (No Leverage)</option>
                    <option value="2">2x</option>
                    <option value="5">5x</option>
                    <option value="10">10x</option>
                    <option value="20">20x</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Trailing Stop (%)</label>
                  <input type="number" defaultValue="0" min="0" step="0.1" />
                </div>
              </div>
              
              <div className="form-group">
                <label>Custom Strategy Parameters</label>
                <textarea 
                  placeholder='{"rsi_oversold": 30, "rsi_overbought": 70, "macd_fast": 12, "macd_slow": 26}'
                  rows="3"
                ></textarea>
              </div>
              
              <div className="form-group checkbox-group">
                <input type="checkbox" id="notify_trades" defaultChecked />
                <label htmlFor="notify_trades">Notify on all trades</label>
              </div>
              
              <div className="form-group checkbox-group">
                <input type="checkbox" id="limit_orders" defaultChecked />
                <label htmlFor="limit_orders">Use limit orders (instead of market orders)</label>
              </div>
            </div>
          </details>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (bot ? 'Update Bot' : 'Create Bot')}
          </button>
        </div>
      </form>
    </motion.div>
  </div>
  );
};

const TradingSignals = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [signals, setSignals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [chartData, setChartData] = useState(null);
  
  // Trading pairs
  const tradingPairs = [
    { symbol: 'BTCUSDT', name: 'Bitcoin' },
    { symbol: 'ETHUSDT', name: 'Ethereum' },
    { symbol: 'BNBUSDT', name: 'Binance Coin' },
    { symbol: 'ADAUSDT', name: 'Cardano' },
    { symbol: 'SOLUSDT', name: 'Solana' },
    { symbol: 'DOGEUSDT', name: 'Dogecoin' },
    { symbol: 'XRPUSDT', name: 'Ripple' },
    { symbol: 'DOTUSDT', name: 'Polkadot' }
  ];
  
  // Time intervals
  const timeIntervals = [
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '30m', label: '30 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' }
  ];
  
  useEffect(() => {
    fetchSignals();
  }, [symbol, interval]);
  
  const fetchSignals = async () => {
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/trading/signals`, {
        symbol,
        interval,
        limit: 100
      });
      
      setSignals(response.data.signals);
      setChartData(response.data.chart);
    } catch (error) {
      toast.error('Failed to fetch trading signals');
      console.error('Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSymbolChange = (e) => {
    setSymbol(e.target.value);
  };
  
  const handleIntervalChange = (e) => {
    setInterval(e.target.value);
  };
  
  const handleAdvancedToggle = () => {
    setShowAdvanced(!showAdvanced);
  };
  
  const applyAdvancedSettings = (e) => {
    e.preventDefault();
    // In a real app, this would apply custom indicator settings
    toast.info('Advanced settings applied');
    fetchSignals();
  };
  
  // Calculate the overall trading signal based on all indicators
  const calculateOverallSignal = () => {
    if (!signals || signals.length === 0) return null;
    
    let buySignals = 0;
    let sellSignals = 0;
    let strongBuy = 0;
    let strongSell = 0;
    
    signals.forEach(signal => {
      if (signal.signal === 'BUY') {
        buySignals++;
        if (signal.strength === 'STRONG') strongBuy++;
      } else if (signal.signal === 'SELL') {
        sellSignals++;
        if (signal.strength === 'STRONG') strongSell++;
      }
    });
    
    if (strongBuy >= 2) return { signal: 'STRONG BUY', class: 'strong-buy' };
    if (strongSell >= 2) return { signal: 'STRONG SELL', class: 'strong-sell' };
    if (buySignals > sellSignals) return { signal: 'BUY', class: 'buy' };
    if (sellSignals > buySignals) return { signal: 'SELL', class: 'sell' };
    return { signal: 'NEUTRAL', class: 'neutral' };
  };
  
  const overallSignal = calculateOverallSignal();
  
  return (
    <div className="trading-signals-container">
      <div className="signals-controls">
        <div className="control-group">
          <label>Trading Pair</label>
          <select value={symbol} onChange={handleSymbolChange}>
            {tradingPairs.map(pair => (
              <option key={pair.symbol} value={pair.symbol}>
                {pair.name} ({pair.symbol})
              </option>
            ))}
          </select>
        </div>
        
        <div className="control-group">
          <label>Time Interval</label>
          <select value={interval} onChange={handleIntervalChange}>
            {timeIntervals.map(interval => (
              <option key={interval.value} value={interval.value}>
                {interval.label}
              </option>
            ))}
          </select>
        </div>
        
        <button 
          className="refresh-btn"
          onClick={fetchSignals}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        
        <button 
          className="advanced-btn"
          onClick={handleAdvancedToggle}
        >
          Advanced {showAdvanced ? '▲' : '▼'}
        </button>
      </div>
      
      {showAdvanced && (
        <motion.div 
          className="advanced-settings-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={applyAdvancedSettings}>
            <div className="settings-row">
              <div className="settings-group">
                <label>RSI Period</label>
                <input type="number" defaultValue="14" min="1" max="50" />
              </div>
              
              <div className="settings-group">
                <label>RSI Overbought</label>
                <input type="number" defaultValue="70" min="50" max="90" />
              </div>
              
              <div className="settings-group">
                <label>RSI Oversold</label>
                <input type="number" defaultValue="30" min="10" max="50" />
              </div>
            </div>
            
            <div className="settings-row">
              <div className="settings-group">
                <label>MACD Fast</label>
                <input type="number" defaultValue="12" min="5" max="20" />
              </div>
              
              <div className="settings-group">
                <label>MACD Slow</label>
                <input type="number" defaultValue="26" min="10" max="50" />
              </div>
              
              <div className="settings-group">
                <label>MACD Signal</label>
                <input type="number" defaultValue="9" min="5" max="20" />
              </div>
            </div>
            
            <div className="settings-row">
              <div className="settings-group">
                <label>BB Period</label>
                <input type="number" defaultValue="20" min="5" max="50" />
              </div>
              
              <div className="settings-group">
                <label>BB Deviation</label>
                <input type="number" defaultValue="2" min="1" max="5" step="0.1" />
              </div>
              
              <div className="settings-group">
                <label>Signal Strength Threshold</label>
                <select defaultValue="medium">
                  <option value="weak">Weak</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </select>
              </div>
            </div>
            
            <div className="settings-actions">
              <button type="reset">Reset</button>
              <button type="submit">Apply</button>
            </div>
          </form>
        </motion.div>
      )}
      
      {loading ? (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Analyzing market data...</p>
        </div>
      ) : (
        <div className="signals-results">
          <div className="signals-header">
            <h3>Trading Signals for {symbol} ({interval})</h3>
            {overallSignal && (
              <div className={`overall-signal ${overallSignal.class}`}>
                {overallSignal.signal}
              </div>
            )}
          </div>
          
          <div className="signals-content">
            <div className="signals-list">
              <table className="signals-table">
                <thead>
                  <tr>
                    <th>Indicator</th>
                    <th>Signal</th>
                    <th>Strength</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {signals && signals.map((signal, index) => (
                    <tr key={index}>
                      <td>{signal.indicator}</td>
                      <td className={signal.signal.toLowerCase()}>
                        {signal.signal}
                      </td>
                      <td className={signal.strength.toLowerCase()}>
                        {signal.strength}
                      </td>
                      <td>{signal.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="signals-explanation">
                <h4>Signal Explanation</h4>
                <ul>
                  <li><span className="indicator">RSI (Relative Strength Index)</span>: Measures overbought and oversold conditions. Values above 70 indicate overbought (sell signal) and below 30 indicate oversold (buy signal).</li>
                  <li><span className="indicator">MACD (Moving Average Convergence Divergence)</span>: Trend-following momentum indicator showing relationship between two moving averages. MACD crossing above signal line is bullish, below is bearish.</li>
                  <li><span className="indicator">Bollinger Bands</span>: Volatility indicator consisting of a middle band with two standard deviation bands. Price near upper band can indicate overbought conditions, while price near lower band can indicate oversold.</li>
                </ul>
                
                <div className="signal-actions">
                  <button className="action-btn create-bot-btn">
                    <span className="btn-icon">🤖</span>
                    Create Bot with These Settings
                  </button>
                  <button className="action-btn place-trade-btn">
                    <span className="btn-icon">📈</span>
                    Place Manual Trade
                  </button>
                </div>
              </div>
            </div>
            
            <div className="signal-chart">
              {chartData && (
                <img 
                  src={`data:image/png;base64,${chartData}`} 
                  alt="Technical Analysis Chart" 
                  className="analysis-chart" 
                />
              )}
            </div>
          </div>
          
          <div className="signal-strategies">
            <h4>Recommended Strategies</h4>
            <div className="strategy-cards">
              {overallSignal && (
                <>
                  {(overallSignal.signal.includes('BUY')) && (
                    <div className="strategy-card buy">
                      <div className="strategy-header">
                        <h5>Long Strategy</h5>
                        <span className="strategy-type">Buy</span>
                      </div>
                      <div className="strategy-body">
                        <p><strong>Entry Point:</strong> Current price or on dip to next support level</p>
                        <p><strong>Take Profit:</strong> 3-5% above entry or at next resistance level</p>
                        <p><strong>Stop Loss:</strong> 1.5-2% below entry</p>
                        <p><strong>Risk/Reward:</strong> 1:2 to 1:3</p>
                      </div>
                      <button className="execute-strategy-btn">Execute Strategy</button>
                    </div>
                  )}
                  
                  {(overallSignal.signal.includes('SELL')) && (
                    <div className="strategy-card sell">
                      <div className="strategy-header">
                        <h5>Short Strategy</h5>
                        <span className="strategy-type">Sell</span>
                      </div>
                      <div className="strategy-body">
                        <p><strong>Entry Point:</strong> Current price or on rally to next resistance level</p>
                        <p><strong>Take Profit:</strong> 3-5% below entry or at next support level</p>
                        <p><strong>Stop Loss:</strong> 1.5-2% above entry</p>
                        <p><strong>Risk/Reward:</strong> 1:2 to 1:3</p>
                      </div>
                      <button className="execute-strategy-btn">Execute Strategy</button>
                    </div>
                  )}
                  
                  {overallSignal.signal === 'NEUTRAL' && (
                    <div className="strategy-card neutral">
                      <div className="strategy-header">
                        <h5>Range Strategy</h5>
                        <span className="strategy-type">Neutral</span>
                      </div>
                      <div className="strategy-body">
                        <p><strong>Recommendation:</strong> Wait for clearer signals or trade the range</p>
                        <p><strong>Buy near support:</strong> Lower Bollinger Band</p>
                        <p><strong>Sell near resistance:</strong> Upper Bollinger Band</p>
                        <p><strong>Stop Loss:</strong> Below support for longs, above resistance for shorts</p>
                      </div>
                      <button className="execute-strategy-btn">Execute Strategy</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TradeHistory = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, buy, sell
  const [sortBy, setSortBy] = useState('date'); // date, symbol, profit
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfit: 0,
    winRate: 0
  });
  
  useEffect(() => {
    fetchTrades();
  }, [filter, sortBy, sortOrder, page]);
  
  const fetchTrades = async () => {
    setLoading(true);
    
    try {
      // In a real app, this would fetch from the API
      // Simulate API call with mock data for demo
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate mock trade data
      const mockTrades = generateMockTrades(50);
      
      // Filter trades
      let filteredTrades = [...mockTrades];
      if (filter !== 'all') {
        filteredTrades = mockTrades.filter(trade => trade.action === filter);
      }
      
      // Sort trades
      filteredTrades.sort((a, b) => {
        if (sortBy === 'date') {
          return sortOrder === 'asc' 
            ? new Date(a.created_at) - new Date(b.created_at)
            : new Date(b.created_at) - new Date(a.created_at);
        } else if (sortBy === 'symbol') {
          return sortOrder === 'asc'
            ? a.symbol.localeCompare(b.symbol)
            : b.symbol.localeCompare(a.symbol);
        } else if (sortBy === 'profit') {
          const profitA = a.action === 'buy' ? -a.total : a.total;
          const profitB = b.action === 'buy' ? -b.total : b.total;
          return sortOrder === 'asc' ? profitA - profitB : profitB - profitA;
        }
        return 0;
      });
      
      // Paginate
      const itemsPerPage = 10;
      const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
      setTotalPages(totalPages);
      
      const startIndex = (page - 1) * itemsPerPage;
      const paginatedTrades = filteredTrades.slice(startIndex, startIndex + itemsPerPage);
      
      setTrades(paginatedTrades);
      
      // Calculate stats
      const totalTrades = mockTrades.length;
      const winningTrades = mockTrades.filter(trade => trade.profit > 0).length;
      const losingTrades = mockTrades.filter(trade => trade.profit < 0).length;
      const totalProfit = mockTrades.reduce((sum, trade) => sum + trade.profit, 0);
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      
      setStats({
        totalTrades,
        winningTrades,
        losingTrades,
        totalProfit,
        winRate
      });
    } catch (error) {
      toast.error('Failed to fetch trade history');
      console.error('Error fetching trade history:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const generateMockTrades = (count) => {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 'DOGEUSDT'];
    const bots = ['RSI Bot', 'MACD Bot', 'BB Bot', 'Combined Bot'];
    const trades = [];
    
    for (let i = 0; i < count; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const action = Math.random() > 0.5 ? 'buy' : 'sell';
      const price = Math.random() * (action === 'buy' ? 1000 : 2000) + 10000;
      const quantity = Math.random() * 2 + 0.1;
      const total = price * quantity;
      const now = new Date();
      const pastDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const bot = bots[Math.floor(Math.random() * bots.length)];
      const profit = (Math.random() * 200 - 100); // Between -100 and 100
      
      trades.push({
        id: `trade-${i}`,
        symbol,
        action,
        price,
        quantity,
        total,
        created_at: pastDate.toISOString(),
        bot,
        profit,
        status: Math.random() > 0.1 ? 'completed' : 'failed'
      });
    }
    
    return trades;
  };
  
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setPage(1);
  };
  
  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };
  
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };
  
  return (
    <div className="trade-history">
      <div className="history-header">
        <h3>Trade History</h3>
        <div className="history-filters">
          <div className="filter-group">
            <label>Filter</label>
            <select value={filter} onChange={handleFilterChange}>
              <option value="all">All Trades</option>
              <option value="buy">Buy Orders</option>
              <option value="sell">Sell Orders</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Period</label>
            <select defaultValue="all">
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <button className="export-btn">
            <span className="btn-icon">📊</span>
            Export CSV
          </button>
        </div>
      </div>
      
      <div className="history-stats">
        <div className="stat-card">
          <div className="stat-title">Total Trades</div>
          <div className="stat-value">{stats.totalTrades}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Win / Loss</div>
          <div className="stat-value">{stats.winningTrades} / {stats.losingTrades}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Win Rate</div>
          <div className="stat-value">{stats.winRate.toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Total Profit</div>
          <div className={`stat-value ${stats.totalProfit >= 0 ? 'profit' : 'loss'}`}>
            {stats.totalProfit >= 0 ? '+' : '-'}${Math.abs(stats.totalProfit).toFixed(2)}
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading trade history...</p>
        </div>
      ) : (
        <>
          <div className="trades-table-container">
            <table className="trades-table">
              <thead>
                <tr>
                  <th onClick={() => handleSortChange('date')} className={sortBy === 'date' ? 'sorted' : ''}>
                    Date/Time {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSortChange('symbol')} className={sortBy === 'symbol' ? 'sorted' : ''}>
                    Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Bot</th>
                  <th onClick={() => handleSortChange('profit')} className={sortBy === 'profit' ? 'sorted' : ''}>
                    Profit/Loss {sortBy === 'profit' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(trade => (
                  <tr key={trade.id}>
                    <td>{new Date(trade.created_at).toLocaleString()}</td>
                    <td>{trade.symbol}</td>
                    <td className={trade.action}>
                      {trade.action.toUpperCase()}
                    </td>
                    <td>${trade.price.toFixed(2)}</td>
                    <td>{trade.quantity.toFixed(4)}</td>
                    <td>${trade.total.toFixed(2)}</td>
                    <td>{trade.bot}</td>
                    <td className={trade.profit >= 0 ? 'profit' : 'loss'}>
                      {trade.profit >= 0 ? '+' : '-'}${Math.abs(trade.profit).toFixed(2)}
                    </td>
                    <td>
                      <span className={`status ${trade.status}`}>
                        {trade.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="pagination">
            <button 
              className="page-btn"
              onClick={() => handlePageChange(1)}
              disabled={page === 1}
            >
              &laquo;
            </button>
            <button 
              className="page-btn"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              &lsaquo;
            </button>
            
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            
            <button 
              className="page-btn"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              &rsaquo;
            </button>
            <button 
              className="page-btn"
              onClick={() => handlePageChange(totalPages)}
              disabled={page === totalPages}
            >
              &raquo;
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const TradingSettings = () => {
  const [apiSettings, setApiSettings] = useState({
    exchange: 'binance',
    api_key: '•••••••••••••••••',
    api_secret: '•••••••••••••••••',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    trades: true,
    signals: true,
    profitLoss: true,
    dailySummary: true
  });
  const [riskSettings, setRiskSettings] = useState({
    maxDailyLoss: 5,
    maxPositionSize: 10,
    defaultLeverage: 1
  });
  const [saving, setSaving] = useState(false);
  
  const handleApiChange = (e) => {
    const { name, value } = e.target;
    setApiSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotifications(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  const handleRiskChange = (e) => {
    const { name, value } = e.target;
    setRiskSettings(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };
  
  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // In a real app, this would save to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  const regenerateAPIKeys = () => {
    const confirmed = window.confirm('Are you sure you want to regenerate API keys? This will invalidate your current keys.');
    if (confirmed) {
      toast.info('API key regeneration requested. New keys will be sent to your email.');
    }
  };
  
  return (
    <div className="trading-settings">
      <div className="settings-section">
        <h3>API Settings</h3>
        <form className="api-form">
          <div className="form-group">
            <label>Exchange</label>
            <select 
              name="exchange" 
              value={apiSettings.exchange}
              onChange={handleApiChange}
            >
              <option value="binance">Binance</option>
              <option value="kucoin">KuCoin</option>
              <option value="coinbase">Coinbase</option>
              <option value="bybit">Bybit</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>API Key</label>
            <input
              type="password"
              name="api_key"
              value={apiSettings.api_key}
              onChange={handleApiChange}
              disabled
            />
          </div>
          
          <div className="form-group">
            <label>API Secret</label>
            <input
              type="password"
              name="api_secret"
              value={apiSettings.api_secret}
              onChange={handleApiChange}
              disabled
            />
          </div>
          
          <div className="api-actions">
            <button
              type="button"
              className="regenerate-btn"
              onClick={regenerateAPIKeys}
            >
              Regenerate API Keys
            </button>
          </div>
          
          <div className="security-note">
            <div className="note-icon">🔐</div>
            <p>
              For security, ensure your API keys have only the necessary permissions for trading.
              Disable withdrawal permissions to protect your funds.
            </p>
          </div>
        </form>
      </div>
      
      <div className="settings-section">
        <h3>Notification Settings</h3>
        <form className="notifications-form">
          <div className="toggle-group">
            <div className="toggle-item">
              <label className="switch">
                <input 
                  type="checkbox"
                  name="email"
                  checked={notifications.email}
                  onChange={handleNotificationChange}
                />
                <span className="slider round"></span>
              </label>
              <span>Email Notifications</span>
            </div>
            
            <div className="toggle-item">
              <label className="switch">
                <input 
                  type="checkbox"
                  name="push"
                  checked={notifications.push}
                  onChange={handleNotificationChange}
                />
                <span className="slider round"></span>
              </label>
              <span>Push Notifications</span>
            </div>
          </div>
          
          <div className="notification-types">
            <h4>Notify me about:</h4>
            
            <div className="toggle-group">
              <div className="toggle-item">
                <label className="switch">
                  <input 
                    type="checkbox"
                    name="trades"
                    checked={notifications.trades}
                    onChange={handleNotificationChange}
                  />
                  <span className="slider round"></span>
                </label>
                <span>All Trades</span>
              </div>
              
              <div className="toggle-item">
                <label className="switch">
                  <input 
                    type="checkbox"
                    name="signals"
                    checked={notifications.signals}
                    onChange={handleNotificationChange}
                  />
                  <span className="slider round"></span>
                </label>
                <span>Trading Signals</span>
              </div>
              
              <div className="toggle-item">
                <label className="switch">
                  <input 
                    type="checkbox"
                    name="profitLoss"
                    checked={notifications.profitLoss}
                    onChange={handleNotificationChange}
                  />
                  <span className="slider round"></span>
                </label>
                <span>Profit/Loss Alerts</span>
              </div>
              
              <div className="toggle-item">
                <label className="switch">
                  <input 
                    type="checkbox"
                    name="dailySummary"
                    checked={notifications.dailySummary}
                    onChange={handleNotificationChange}
                  />
                  <span className="slider round"></span>
                </label>
                <span>Daily Summary</span>
              </div>
            </div>
          </div>
        </form>
      </div>
      
      <div className="settings-section">
        <h3>Risk Management</h3>
        <form className="risk-form">
          <div className="form-group">
            <label>Maximum Daily Loss (%)</label>
            <div className="slider-container">
              <input
                type="range"
                name="maxDailyLoss"
                min="1"
                max="20"
                step="0.5"
                value={riskSettings.maxDailyLoss}
                onChange={handleRiskChange}
              />
              <div className="slider-value">{riskSettings.maxDailyLoss}%</div>
            </div>
            <div className="slider-description">
              Stop all bots if daily loss exceeds this percentage of account balance
            </div>
          </div>
          
          <div className="form-group">
            <label>Maximum Position Size (%)</label>
            <div className="slider-container">
              <input
                type="range"
                name="maxPositionSize"
                min="1"
                max="50"
                step="1"
                value={riskSettings.maxPositionSize}
                onChange={handleRiskChange}
              />
              <div className="slider-value">{riskSettings.maxPositionSize}%</div>
            </div>
            <div className="slider-description">
              Maximum percentage of account balance for any single position
            </div>
          </div>
          
          <div className="form-group">
            <label>Default Leverage</label>
            <div className="slider-container">
              <input
                type="range"
                name="defaultLeverage"
                min="1"
                max="20"
                step="1"
                value={riskSettings.defaultLeverage}
                onChange={handleRiskChange}
              />
              <div className="slider-value">{riskSettings.defaultLeverage}x</div>
            </div>
            <div className="slider-description">
              Default leverage for new trading positions
            </div>
          </div>
        </form>
      </div>
      
      <div className="settings-section advanced-trading">
        <h3>Advanced Trading Settings</h3>
        <details>
          <summary>Advanced Settings</summary>
          <div className="advanced-content">
            <div className="form-group">
              <label>Order Type Preference</label>
              <select defaultValue="limit">
                <option value="market">Market Orders</option>
                <option value="limit">Limit Orders</option>
                <option value="stop_limit">Stop Limit Orders</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Time-in-Force</label>
              <select defaultValue="GTC">
                <option value="GTC">Good Till Cancelled (GTC)</option>
                <option value="IOC">Immediate or Cancel (IOC)</option>
                <option value="FOK">Fill or Kill (FOK)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Default Slippage Tolerance (%)</label>
              <input type="number" defaultValue="0.5" min="0.1" step="0.1" max="5" />
            </div>
            
            <div className="form-group checkbox-group">
              <input type="checkbox" id="enable_trailing_stop" defaultChecked />
              <label htmlFor="enable_trailing_stop">Enable Trailing Stops</label>
            </div>
            
            <div className="form-group checkbox-group">
              <input type="checkbox" id="allow_partial_fills" defaultChecked />
              <label htmlFor="allow_partial_fills">Allow Partial Fills</label>
            </div>
          </div>
        </details>
      </div>
      
      <div className="settings-actions">
        <button 
          className="save-settings-btn"
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
        <button className="reset-defaults-btn">
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

const HomePage = ({ setActiveView }) => {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch featured events
        const eventsResponse = await axios.get(`${API}/events/featured`);
        setFeaturedEvents(eventsResponse.data.slice(0, 3)); // Get top 3 events
        
        // Mock market data for demo
        setMarketData([
          { symbol: 'BTC/USDT', price: '67,524.32', change: '+2.34%', direction: 'up' },
          { symbol: 'ETH/USDT', price: '3,245.67', change: '-1.45%', direction: 'down' },
          { symbol: 'BNB/USDT', price: '532.18', change: '+0.87%', direction: 'up' },
          { symbol: 'SOL/USDT', price: '143.56', change: '+5.21%', direction: 'up' }
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Auto-rotate featured events
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % Math.max(1, featuredEvents.length));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [featuredEvents.length]);
  
  const navigateToEvents = () => {
    setActiveView('events');
  };
  
  const navigateToTrading = () => {
    setActiveView('trading');
  };
  
  const navigateToLogin = () => {
    setActiveView('login');
  };
  
  const goToEvent = (event) => {
    setActiveView('events');
    // In a more complex app, you would also need to select the specific event
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading content...</p>
      </div>
    );
  }
  
  return (
    <div className={`home-container ${darkMode ? 'dark' : ''}`}>
      <div className="hero-section">
        {/* <Hero3D /> */}
        <div className="hero-placeholder" style={{ 
          height: '60vh', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center'
        }}>
          <div>
            <h1>Welcome to TicketVerse & Trading 3D</h1>
            <p>Experience the future of event ticketing and algorithmic trading</p>
          </div>
        </div>
        <div className="hero-overlay-content">
          <motion.div 
            className="hero-content"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <div className="hero-buttons">
              <motion.button 
                className="cta-button tickets-btn glassmorphism"
                whileHover={{ scale: 1.05, rotateY: 5 }}
                whileTap={{ scale: 0.95 }}
                onClick={navigateToEvents}
              >
                <span className="btn-icon">🎭</span>
                Browse Events
              </motion.button>
              <motion.button 
                className="cta-button trading-btn glassmorphism"
                whileHover={{ scale: 1.05, rotateY: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={navigateToTrading}
              >
                <span className="btn-icon">📈</span>
                Start Trading
              </motion.button>
            </div>
            {!user && (
              <motion.div 
                className="hero-signup"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
              >
                <p>New here? <span className="signup-link" onClick={navigateToLogin}>Sign up</span> and get your first ticket discount!</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
      
      {featuredEvents.length > 0 && (
        <div className="featured-section">
          <h2>Featured Events</h2>
          <div className="featured-events-carousel">
            <button className="carousel-btn prev" onClick={() => setCurrentSlide(prev => prev === 0 ? featuredEvents.length - 1 : prev - 1)}>❮</button>
            
            <div className="carousel-container">
              {featuredEvents.map((event, index) => (
                <motion.div 
                  key={event.id}
                  className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ 
                    opacity: index === currentSlide ? 1 : 0,
                    x: index === currentSlide ? 0 : 100
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="featured-event-card">
                    <div className="featured-event-image">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} />
                      ) : (
                        <div className="featured-placeholder-image">🎭</div>
                      )}
                      <div className="featured-badge">Featured</div>
                    </div>
                    <div className="featured-event-content">
                      <h3>{event.title}</h3>
                      <p className="featured-event-date">
                        <span className="date-icon">📅</span>
                        {new Date(event.start_date).toLocaleDateString()}
                      </p>
                      <p className="featured-event-location">
                        <span className="location-icon">📍</span>
                        {event.location}
                      </p>
                      <p className="featured-event-description">
                        {event.description.substring(0, 150)}
                        {event.description.length > 150 ? '...' : ''}
                      </p>
                      <div className="featured-event-price">
                        <span className="price-tag">
                          From ${event.price_regular}
                        </span>
                        {event.price_ieee_member && (
                          <span className="ieee-price-tag">
                            IEEE: ${event.price_ieee_member}
                          </span>
                        )}
                      </div>
                      <motion.button 
                        className="view-event-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => goToEvent(event)}
                      >
                        View Details
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <button className="carousel-btn next" onClick={() => setCurrentSlide(prev => (prev + 1) % featuredEvents.length)}>❯</button>
            
            <div className="carousel-dots">
              {featuredEvents.map((_, index) => (
                <span 
                  key={index} 
                  className={`dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                ></span>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="dual-platform-section">
        <div className="section-header">
          <h2>Two Platforms in One</h2>
          <p>Seamlessly switch between event ticketing and algorithmic trading</p>
        </div>
        
        <div className="platform-cards">
          <motion.div 
            className="platform-card tickets-card"
            whileHover={{ scale: 1.03, boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)" }}
          >
            <div className="platform-icon">🎫</div>
            <h3>Event Ticketing</h3>
            <ul className="platform-features">
              <li>Browse and purchase event tickets</li>
              <li>Special IEEE member pricing</li>
              <li>Apply discount coupons</li>
              <li>Digital ticket delivery</li>
              <li>QR code scanning for entry</li>
            </ul>
            <motion.button 
              className="platform-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={navigateToEvents}
            >
              Explore Events
            </motion.button>
          </motion.div>
          
          <motion.div 
            className="platform-card trading-card"
            whileHover={{ scale: 1.03, boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)" }}
          >
            <div className="platform-icon">📈</div>
            <h3>Algorithmic Trading</h3>
            <ul className="platform-features">
              <li>Create custom trading bots</li>
              <li>Real-time technical analysis</li>
              <li>Multiple trading strategies</li>
              <li>Risk management tools</li>
              <li>Performance tracking</li>
            </ul>
            <motion.button 
              className="platform-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={navigateToTrading}
            >
              Start Trading
            </motion.button>
          </motion.div>
        </div>
      </div>
      
      <div className="market-ticker-section">
        <div className="ticker-header">
          <h3>Cryptocurrency Market</h3>
          <span className="live-indicator">LIVE</span>
        </div>
        <div className="ticker-container">
          <div className="ticker-scroll">
            {marketData.concat(marketData).map((item, index) => (
              <div key={index} className="ticker-item">
                <div className="ticker-symbol">{item.symbol}</div>
                <div className="ticker-price">{item.price}</div>
                <div className={`ticker-change ${item.direction}`}>{item.change}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="features-section">
        <h2>Why Choose TicketVerse & Trading</h2>
        <div className="features-grid">
          <motion.div 
            className="feature-card"
            whileHover={{ y: -10 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="feature-icon">🔒</div>
            <h3>Secure Payments</h3>
            <p>Multiple payment options with top-notch security for all your transactions.</p>
          </motion.div>
          
          <motion.div 
            className="feature-card"
            whileHover={{ y: -10 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="feature-icon">💼</div>
            <h3>Special IEEE Pricing</h3>
            <p>Exclusive discounts for IEEE members with verified membership.</p>
          </motion.div>
          
          <motion.div 
            className="feature-card"
            whileHover={{ y: -10 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="feature-icon">🤖</div>
            <h3>Advanced Trading Bots</h3>
            <p>Create custom algorithmic trading bots with multiple strategies and indicators.</p>
          </motion.div>
          
          <motion.div 
            className="feature-card"
            whileHover={{ y: -10 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="feature-icon">🏷️</div>
            <h3>Coupon Discounts</h3>
            <p>Apply coupon codes for additional savings on your tickets.</p>
          </motion.div>
        </div>
      </div>
      
      <div className="testimonials-section">
        <h2>What Our Users Say</h2>
        <div className="testimonials-slider">
          <Testimonials />
        </div>
      </div>
    </div>
  );
};

const Testimonials = () => {
  const testimonials = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "IEEE Member",
      content: "The IEEE member discount is amazing! I saved 30% on my conference tickets. The trading bot features are also incredibly powerful.",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Crypto Trader",
      content: "I've been using the algorithmic trading platform for 3 months and have seen consistent returns. The technical analysis tools are best-in-class.",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      id: 3,
      name: "Emma Rodriguez",
      role: "Event Organizer",
      content: "As an organizer, TicketVerse has simplified our ticketing process and improved attendance tracking. Highly recommended!",
      avatar: "https://randomuser.me/api/portraits/women/63.jpg"
    }
  ];
  
  const [current, setCurrent] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % testimonials.length);
    }, 6000);
    
    return () => clearInterval(interval);
  }, [testimonials.length]);
  
  return (
    <div className="testimonials-container">
      {testimonials.map((testimonial, index) => (
        <motion.div 
          key={testimonial.id}
          className={`testimonial-card ${index === current ? 'active' : ''}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: index === current ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="testimonial-content">
            <div className="quote-mark">"</div>
            <p>{testimonial.content}</p>
          </div>
          <div className="testimonial-author">
            <div className="author-avatar">
              <img src={testimonial.avatar} alt={testimonial.name} />
            </div>
            <div className="author-info">
              <h4>{testimonial.name}</h4>
              <p>{testimonial.role}</p>
            </div>
          </div>
        </motion.div>
      ))}
      
      <div className="testimonial-dots">
        {testimonials.map((_, index) => (
          <span 
            key={index} 
            className={`dot ${index === current ? 'active' : ''}`}
            onClick={() => setCurrent(index)}
          ></span>
        ))}
      </div>
    </div>
  );
};

const App = () => {
  const [activeView, setActiveView] = useState('home');
  
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="app-container">
          {/* <Nav3DElements /> */}
          <Navbar setActiveView={setActiveView} activeView={activeView} />
          
          <main className="main-content">
            <AnimatePresence mode="wait">
              {activeView === 'home' && <HomePage setActiveView={setActiveView} />}
              {activeView === 'events' && <Events setActiveView={setActiveView} />}
              {activeView === 'login' && <Login setActiveView={setActiveView} />}
              {activeView === 'register' && <Register setActiveView={setActiveView} />}
              {activeView === 'tickets' && <MyTickets setActiveView={setActiveView} />}
              {activeView === 'trading' && <TradingDashboard />}
              {activeView === 'admin' && <AdminDashboard />}
              {activeView === 'profile' && <Profile />}
            </AnimatePresence>
          </main>
          
          <footer className="footer">
            <div className="footer-content">
              <div className="footer-section about">
                <h3>About TicketVerse & Trading</h3>
                <p>Your trusted platform for event ticketing and algorithmic trading with special pricing for IEEE members.</p>
                <div className="social-links">
                  <a href="#" className="social-icon">📘</a>
                  <a href="#" className="social-icon">🐦</a>
                  <a href="#" className="social-icon">📸</a>
                  <a href="#" className="social-icon">📱</a>
                </div>
              </div>
              
              <div className="footer-section links">
                <h3>Quick Links</h3>
                <ul>
                  <li><a href="#" onClick={() => setActiveView('home')}>Home</a></li>
                  <li><a href="#" onClick={() => setActiveView('events')}>Events</a></li>
                  <li><a href="#" onClick={() => setActiveView('trading')}>Trading</a></li>
                  <li><a href="#">About Us</a></li>
                  <li><a href="#">Contact</a></li>
                  <li><a href="#">Privacy Policy</a></li>
                  <li><a href="#">Terms of Service</a></li>
                </ul>
              </div>
              
              <div className="footer-section contact">
                <h3>Contact Us</h3>
                <p><span>Email:</span> support@ticketverse.com</p>
                <p><span>Phone:</span> +1 (555) 123-4567</p>
                <p><span>Address:</span> 123 Event Street, Cityville, ST 12345</p>
              </div>
            </div>
            
            <div className="footer-bottom">
              <p>&copy; 2025 TicketVerse & Trading. All rights reserved.</p>
              <div className="footer-tech">
                <span>Powered by React, FastAPI, and AI</span>
                <span className="built-by">Built by <strong>An0nym0usn3thunt3r</strong></span>
              </div>
            </div>
          </footer>
          
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
          
