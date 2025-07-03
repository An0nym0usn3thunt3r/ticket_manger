import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import axios from "axios";
import { motion } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PaymentElement, Elements, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

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

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
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
const Navbar = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Successfully logged out!");
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
        >
          <span className="logo-icon">🎫</span>
          <span className="logo-text">TicketVerse</span>
        </motion.div>
        
        <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
          <motion.button 
            className={`nav-btn ${activeView === 'home' ? 'active' : ''}`}
            onClick={() => setActiveView('home')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Home
          </motion.button>
          <motion.button 
            className={`nav-btn ${activeView === 'events' ? 'active' : ''}`}
            onClick={() => setActiveView('events')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Events
          </motion.button>
          {user && (
            <motion.button 
              className={`nav-btn ${activeView === 'tickets' ? 'active' : ''}`}
              onClick={() => setActiveView('tickets')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              My Tickets
            </motion.button>
          )}
          {user && (user.role === 'admin' || user.role === 'super_admin') && (
            <motion.button 
              className={`nav-btn ${activeView === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveView('admin')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Admin
            </motion.button>
          )}
          
          {user ? (
            <motion.button 
              className="auth-btn logout-btn"
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Logout
            </motion.button>
          ) : (
            <>
              <motion.button 
                className={`auth-btn login-btn ${activeView === 'login' ? 'active' : ''}`}
                onClick={() => setActiveView('login')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Login
              </motion.button>
              <motion.button 
                className={`auth-btn register-btn ${activeView === 'register' ? 'active' : ''}`}
                onClick={() => setActiveView('register')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Register
              </motion.button>
            </>
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

const Login = () => {
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
          {isLoading ? 'Loading...' : 'Login'}
        </motion.button>
      </form>
    </motion.div>
  );
};

const Register = () => {
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
          {isLoading ? 'Loading...' : 'Register'}
        </motion.button>
      </form>
    </motion.div>
  );
};

const EventCard = ({ event, onSelect }) => {
  return (
    <motion.div 
      className="event-card"
      whileHover={{ scale: 1.03 }}
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
      </div>
      <div className="event-details">
        <h3>{event.title}</h3>
        <p className="event-date">
          {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
        </p>
        <p className="event-location">{event.location}</p>
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
      </div>
    </motion.div>
  );
};

const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${API}/events`);
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

  if (loading) {
    return <div className="loading">Loading events...</div>;
  }

  return (
    <div className="events-container">
      {selectedEvent ? (
        <EventDetails event={selectedEvent} onBack={handleBackToEvents} />
      ) : (
        <>
          <h2>Upcoming Events</h2>
          <div className="events-grid">
            {events.length > 0 ? (
              events.map(event => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  onSelect={handleEventSelect} 
                />
              ))
            ) : (
              <p>No events available at the moment.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const EventDetails = ({ event, onBack }) => {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [ticketType, setTicketType] = useState('regular');
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

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
        toast.error('Invalid coupon code');
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
      return;
    }
    
    if (ticketType === 'ieee' && !user.ieee_member) {
      toast.error('You need to verify your IEEE membership to purchase IEEE member tickets');
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
      onBack(); // Return to events list
      
    } catch (error) {
      toast.error('Failed to process payment');
      console.error('Payment error:', error);
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <motion.div 
      className="event-details-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <button 
        className="back-button" 
        onClick={onBack}
      >
        ← Back to Events
      </button>
      
      <div className="event-details-content">
        <div className="event-details-image">
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} />
          ) : (
            <div className="placeholder-image-large">🎭</div>
          )}
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
                >
                  <option value="regular">Regular Ticket</option>
                  <option value="ieee" disabled={!user?.ieee_member}>
                    IEEE Member Ticket {!user?.ieee_member && '(Verification Required)'}
                  </option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Quantity</label>
                <input 
                  type="number" 
                  min="1" 
                  value={quantity}
                  onChange={handleQuantityChange}
                  disabled={!user}
                />
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
                    <button 
                      onClick={validateCoupon}
                      disabled={!user || !couponCode || isValidatingCoupon}
                      className="apply-coupon-btn"
                    >
                      {isValidatingCoupon ? 'Validating...' : 'Apply'}
                    </button>
                  </div>
                </div>
                
                {couponApplied && (
                  <div className="coupon-success">
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
                </div>
              </div>
              
              {paymentMethod === 'card' && (
                <div className="card-payment-form">
                  <div className="form-group">
                    <label>Card Number</label>
                    <input type="text" placeholder="1234 5678 9012 3456" />
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
                  <p>You will be redirected to PayPal to complete your purchase.</p>
                </div>
              )}
              
              {paymentMethod === 'applepay' && (
                <div className="external-payment-info">
                  <p>You will be prompted to use Apple Pay to complete your purchase.</p>
                </div>
              )}
              
              {paymentMethod === 'googlepay' && (
                <div className="external-payment-info">
                  <p>You will be prompted to use Google Pay to complete your purchase.</p>
                </div>
              )}
              
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
    </motion.div>
  );
};

const MyTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

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

  if (!user) {
    return (
      <div className="unauthorized-message">
        Please login to view your tickets.
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading tickets...</div>;
  }

  return (
    <div className="tickets-container">
      {selectedTicket ? (
        <TicketDetails ticket={selectedTicket} onBack={handleBackToTickets} />
      ) : (
        <>
          <h2>My Tickets</h2>
          <div className="tickets-list">
            {tickets.length > 0 ? (
              tickets.map(ticket => (
                <motion.div 
                  key={ticket.id} 
                  className="ticket-card"
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
                      <span>Location:</span>
                      <span>{ticket.event.location}</span>
                    </div>
                    <div className="ticket-detail">
                      <span>Quantity:</span>
                      <span>{ticket.quantity}</span>
                    </div>
                  </div>
                  <div className="ticket-footer">
                    <span className="ticket-id">ID: {ticket.id.substring(0, 8)}...</span>
                    <span className="view-ticket">View Details →</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="no-tickets-message">You don't have any tickets yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const TicketDetails = ({ ticket, onBack }) => {
  return (
    <motion.div 
      className="ticket-details-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <button 
        className="back-button" 
        onClick={onBack}
      >
        ← Back to My Tickets
      </button>
      
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
          </div>
          
          <div className="ticket-info-section">
            <div className="ticket-info-row">
              <div className="info-label">Event</div>
              <div className="info-value">{ticket.event.title}</div>
            </div>
            <div className="ticket-info-row">
              <div className="info-label">Date</div>
              <div className="info-value">
                {new Date(ticket.event.start_date).toLocaleDateString()} at {new Date(ticket.event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="ticket-info-row">
              <div className="info-label">Location</div>
              <div className="info-value">{ticket.event.location}</div>
            </div>
            <div className="ticket-info-row">
              <div className="info-label">Ticket Type</div>
              <div className="info-value">{ticket.ticket_type}</div>
            </div>
            <div className="ticket-info-row">
              <div className="info-label">Quantity</div>
              <div className="info-value">{ticket.quantity}</div>
            </div>
            <div className="ticket-info-row">
              <div className="info-label">Purchase Date</div>
              <div className="info-value">{new Date(ticket.created_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
        
        <div className="ticket-actions">
          <motion.button 
            className="ticket-action-btn download-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Download PDF
          </motion.button>
          <motion.button 
            className="ticket-action-btn email-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Email Ticket
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('events');
  
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="unauthorized-message">
        You don't have permission to access this page.
      </div>
    );
  }
  
  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          Tickets
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={`tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('coupons')}
        >
          Coupons
        </button>
      </div>
      
      <div className="admin-content">
        {activeTab === 'events' && <AdminEvents />}
        {activeTab === 'tickets' && <AdminTickets />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'coupons' && <AdminCoupons />}
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
    return <div className="loading">Loading events...</div>;
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
                <td className="actions">
                  <button 
                    className="edit-btn"
                    onClick={() => handleEditEvent(event)}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    Delete
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
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    start_date: event?.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
    end_date: event?.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
    price_regular: event?.price_regular || '',
    price_ieee_member: event?.price_ieee_member || '',
    status: event?.status || 'upcoming',
    image_url: event?.image_url || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
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
      toast.error(error.response?.data?.detail || 'An error occurred');
      console.error('Error submitting event form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="modal-content"
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
    </motion.div>
  );
};

const AdminTickets = () => {
  // Similar to AdminEvents but for ticket management
  return <div>Ticket Management Component</div>;
};

const AdminUsers = () => {
  // Similar to AdminEvents but for user management
  return <div>User Management Component</div>;
};

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await axios.get(`${API}/admin/coupons`);
        setCoupons(response.data);
      } catch (error) {
        toast.error('Failed to fetch coupons');
        console.error('Error fetching coupons:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCoupons();
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
    return <div className="loading">Loading coupons...</div>;
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
          Add Coupon
        </motion.button>
      </div>
      
      {showForm && (
        <CouponForm 
          coupon={editingCoupon} 
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
                <td>{coupon.code}</td>
                <td>{coupon.discount_percentage}%</td>
                <td>{coupon.event_id ? coupon.event?.title || coupon.event_id : 'All Events'}</td>
                <td>{new Date(coupon.valid_from).toLocaleDateString()}</td>
                <td>{coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : 'No Expiry'}</td>
                <td>{coupon.max_uses || 'Unlimited'}</td>
                <td>{coupon.remaining_uses || 'Unlimited'}</td>
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
                    Edit
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteCoupon(coupon.id)}
                  >
                    Delete
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

const CouponForm = ({ coupon, onClose }) => {
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState({
    code: coupon?.code || '',
    discount_percentage: coupon?.discount_percentage || '',
    event_id: coupon?.event_id || '',
    valid_from: coupon?.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    valid_until: coupon?.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 10) : '',
    max_uses: coupon?.max_uses || '',
    active: coupon ? coupon.active : true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${API}/admin/events`);
        setEvents(response.data);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoadingEvents(false);
      }
    };
    
    fetchEvents();
  }, []);

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
      toast.error(error.response?.data?.detail || 'An error occurred');
      console.error('Error submitting coupon form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="modal-content"
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
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              placeholder="e.g., SUMMER2025"
            />
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
              disabled={loadingEvents}
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
    </motion.div>
  );
};

const HomePage = () => {
  return (
    <motion.div 
      className="home-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="hero-section">
        <motion.h1 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Welcome to TicketVerse
        </motion.h1>
        <motion.p 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Your one-stop platform for event tickets
        </motion.p>
        <motion.button 
          className="cta-button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          Browse Events
        </motion.button>
      </div>
      
      <div className="features-section">
        <h2>Why Choose Us</h2>
        <div className="features-grid">
          <motion.div 
                        // Continuing from the homepage features-section
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
            <div className="feature-icon">🎟️</div>
            <h3>Easy Ticket Management</h3>
            <p>View, download, and share your tickets with just a few clicks.</p>
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
      
      <div className="upcoming-events-section">
        <h2>Featured Events</h2>
        <FeaturedEvents />
      </div>
      
      <div className="testimonials-section">
        <h2>What Our Users Say</h2>
        <div className="testimonials-slider">
          <Testimonials />
        </div>
      </div>
    </motion.div>
  );
};

const FeaturedEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  useEffect(() => {
    const fetchFeaturedEvents = async () => {
      try {
        const response = await axios.get(`${API}/events/featured`);
        setEvents(response.data.slice(0, 3)); // Get top 3 events
      } catch (error) {
        console.error('Error fetching featured events:', error);
        // Fallback to regular events if featured endpoint fails
        try {
          const fallbackResponse = await axios.get(`${API}/events`);
          setEvents(fallbackResponse.data.slice(0, 3));
        } catch (fallbackError) {
          console.error('Error fetching fallback events:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeaturedEvents();
    
    // Auto-rotate featured events
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % (events.length || 1));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [events.length]);
  
  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % events.length);
  };
  
  const prevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? events.length - 1 : prev - 1));
  };
  
  if (loading) {
    return <div className="loading-spinner"></div>;
  }
  
  if (events.length === 0) {
    return <p>No featured events available at the moment.</p>;
  }
  
  return (
    <div className="featured-events-carousel">
      <button className="carousel-btn prev" onClick={prevSlide}>❮</button>
      
      <div className="carousel-container">
        {events.map((event, index) => (
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
              </div>
              <div className="featured-event-content">
                <h3>{event.title}</h3>
                <p className="featured-event-date">
                  {new Date(event.start_date).toLocaleDateString()}
                </p>
                <p className="featured-event-location">{event.location}</p>
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
                <button className="view-event-btn">View Details</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      <button className="carousel-btn next" onClick={nextSlide}>❯</button>
      
      <div className="carousel-dots">
        {events.map((_, index) => (
          <span 
            key={index} 
            className={`dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
          ></span>
        ))}
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
      content: "The IEEE member discount is amazing! I saved 30% on my conference tickets. The verification process was simple and straightforward.",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Regular User",
      content: "I love how easy it is to find and purchase tickets. The interface is intuitive and the payment process is secure.",
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
    <AuthProvider>
      <div className="app-container">
        <Navbar />
        
        <main className="main-content">
          {activeView === 'home' && <HomePage />}
          {activeView === 'events' && <Events />}
          {activeView === 'login' && <Login />}
          {activeView === 'register' && <Register />}
          {activeView === 'tickets' && <MyTickets />}
          {activeView === 'admin' && <AdminDashboard />}
        </main>
        
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-section about">
              <h3>About TicketVerse</h3>
              <p>Your trusted platform for event ticketing with special pricing for IEEE members.</p>
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
                <li><a href="#">Home</a></li>
                <li><a href="#">Events</a></li>
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
            <p>&copy; 2025 TicketVerse. All rights reserved.</p>
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
        />
      </div>
    </AuthProvider>
  );
};

export default App;
