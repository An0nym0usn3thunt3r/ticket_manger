import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <span className="logo-icon">🎫</span>
          <span className="logo-text">TicketVerse</span>
        </div>
        
        <div className="nav-links">
          <button 
            className={`nav-btn ${activeView === 'home' ? 'active' : ''}`}
            onClick={() => setActiveView('home')}
          >
            Home
          </button>
          <button 
            className={`nav-btn ${activeView === 'events' ? 'active' : ''}`}
            onClick={() => setActiveView('events')}
          >
            Events
          </button>
          {user && (
            <button 
              className={`nav-btn ${activeView === 'tickets' ? 'active' : ''}`}
              onClick={() => setActiveView('tickets')}
            >
              My Tickets
            </button>
          )}
          {user && (user.role === 'admin' || user.role === 'super_admin') && (
            <button 
              className={`nav-btn ${activeView === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveView('admin')}
            >
              Admin Panel
            </button>
          )}
        </div>

        <div className="nav-auth">
          {user ? (
            <div className="user-menu">
              <span className="user-name">Hello, {user.first_name}</span>
              <button className="logout-btn" onClick={logout}>Logout</button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button 
                className="login-btn"
                onClick={() => setActiveView('login')}
              >
                Login
              </button>
              <button 
                className="signup-btn"
                onClick={() => setActiveView('register')}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
      <ViewRouter activeView={activeView} setActiveView={setActiveView} />
    </nav>
  );
};

const ViewRouter = ({ activeView, setActiveView }) => {
  const { user } = useAuth();

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomePage setActiveView={setActiveView} />;
      case 'events':
        return <EventsPage setActiveView={setActiveView} />;
      case 'login':
        return <LoginPage setActiveView={setActiveView} />;
      case 'register':
        return <RegisterPage setActiveView={setActiveView} />;
      case 'tickets':
        return user ? <TicketsPage /> : <LoginPage setActiveView={setActiveView} />;
      case 'admin':
        return (user && (user.role === 'admin' || user.role === 'super_admin')) 
          ? <AdminPanel /> 
          : <HomePage setActiveView={setActiveView} />;
      default:
        return <HomePage setActiveView={setActiveView} />;
    }
  };

  return <div className="view-container">{renderView()}</div>;
};

const HomePage = ({ setActiveView }) => {
  const [featuredEvents, setFeaturedEvents] = useState([]);

  useEffect(() => {
    fetchFeaturedEvents();
  }, []);

  const fetchFeaturedEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setFeaturedEvents(response.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Experience Amazing <span className="highlight">Events</span>
            </h1>
            <p className="hero-subtitle">
              Book tickets for concerts, festivals, and live events. 
              Get instant digital tickets with QR codes delivered to your email.
            </p>
            <button 
              className="cta-button"
              onClick={() => setActiveView('events')}
            >
              <span>Explore Events</span>
              <div className="button-shine"></div>
            </button>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose TicketVerse?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Booking</h3>
              <p>Book tickets instantly and get immediate confirmation</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Digital Tickets</h3>
              <p>Get QR code tickets delivered straight to your email</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Safe</h3>
              <p>Your payments and personal data are completely secure</p>
            </div>
          </div>
        </div>
      </section>

      {featuredEvents.length > 0 && (
        <section className="featured-events">
          <div className="container">
            <h2 className="section-title">Featured Events</h2>
            <div className="events-grid">
              {featuredEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const EventsPage = ({ setActiveView }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(events.map(event => event.category))];

  if (loading) {
    return <div className="loading">Loading events...</div>;
  }

  return (
    <div className="events-page">
      <div className="container">
        <div className="page-header">
          <h1>All Events</h1>
          <div className="search-filters">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="events-grid">
          {filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="no-events">
            <h3>No events found</h3>
            <p>Try adjusting your search or category filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

const EventCard = ({ event }) => {
  const [showBooking, setShowBooking] = useState(false);

  return (
    <>
      <div className="event-card" onClick={() => setShowBooking(true)}>
        <div className="event-image">
          {event.image_url ? (
            <img src={event.image_url} alt={event.name} />
          ) : (
            <div className="placeholder-image">
              <span className="event-icon">🎪</span>
            </div>
          )}
          <div className="event-price">${event.price}</div>
        </div>
        <div className="event-details">
          <h3 className="event-name">{event.name}</h3>
          <p className="event-date">
            📅 {new Date(event.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className="event-venue">📍 {event.venue}</p>
          <p className="event-tickets">
            🎫 {event.available_tickets} tickets available
          </p>
        </div>
      </div>
      
      {showBooking && (
        <BookingModal event={event} onClose={() => setShowBooking(false)} />
      )}
    </>
  );
};

const BookingModal = ({ event, onClose }) => {
  const { user } = useAuth();
  const [bookingData, setBookingData] = useState({
    customer_name: user ? `${user.first_name} ${user.last_name}` : '',
    customer_email: user ? user.email : '',
    customer_phone: '',
    n8n_webhook_url: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/tickets/book`, {
        event_id: event.id,
        ...bookingData
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 3000);
    } catch (error) {
      alert(error.response?.data?.detail || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal success-modal" onClick={e => e.stopPropagation()}>
          <div className="success-content">
            <div className="success-icon">✅</div>
            <h2>Booking Confirmed!</h2>
            <p>Your ticket has been booked successfully. You'll receive an email with your ticket details and QR code.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Book Ticket</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="event-summary">
            <h3>{event.name}</h3>
            <p>📅 {new Date(event.date).toLocaleDateString()}</p>
            <p>📍 {event.venue}</p>
            <p className="price">Price: ${event.price}</p>
          </div>

          <form onSubmit={handleSubmit} className="booking-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                required
                value={bookingData.customer_name}
                onChange={(e) => setBookingData({...bookingData, customer_name: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                required
                value={bookingData.customer_email}
                onChange={(e) => setBookingData({...bookingData, customer_email: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                required
                value={bookingData.customer_phone}
                onChange={(e) => setBookingData({...bookingData, customer_phone: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>N8N Webhook URL (Optional)</label>
              <input
                type="url"
                placeholder="https://your-n8n-instance.com/webhook/..."
                value={bookingData.n8n_webhook_url}
                onChange={(e) => setBookingData({...bookingData, n8n_webhook_url: e.target.value})}
              />
              <small>Enter your n8n webhook URL to receive ticket details</small>
            </div>

            <button type="submit" className="book-btn" disabled={loading}>
              {loading ? 'Booking...' : 'Book Ticket'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const LoginPage = ({ setActiveView }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(formData.email, formData.password);
    if (result.success) {
      setActiveView('home');
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h2>Welcome Back</h2>
          <p>Sign in to your account</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? 
            <button onClick={() => setActiveView('register')}>Sign up</button>
          </p>
        </div>
      </div>
    </div>
  );
};

const RegisterPage = ({ setActiveView }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await register(formData);
    if (result.success) {
      setActiveView('home');
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h2>Create Account</h2>
          <p>Join TicketVerse today</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? 
            <button onClick={() => setActiveView('login')}>Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
};

const TicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${API}/tickets`);
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading your tickets...</div>;
  }

  return (
    <div className="tickets-page">
      <div className="container">
        <h1>My Tickets</h1>
        
        {tickets.length === 0 ? (
          <div className="no-tickets">
            <h3>No tickets found</h3>
            <p>You haven't booked any tickets yet.</p>
          </div>
        ) : (
          <div className="tickets-grid">
            {tickets.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TicketCard = ({ ticket }) => {
  const [showQR, setShowQR] = useState(false);

  return (
    <>
      <div className="ticket-card">
        <div className="ticket-header">
          <h3>Ticket #{ticket.ticket_number}</h3>
          <span className={`status ${ticket.status}`}>{ticket.status}</span>
        </div>
        
        <div className="ticket-details">
          <p><strong>Customer:</strong> {ticket.customer_name}</p>
          <p><strong>Email:</strong> {ticket.customer_email}</p>
          <p><strong>Phone:</strong> {ticket.customer_phone}</p>
          <p><strong>Price:</strong> ${ticket.price_paid}</p>
          <p><strong>Booked:</strong> {new Date(ticket.booking_date).toLocaleDateString()}</p>
        </div>

        <button 
          className="qr-btn"
          onClick={() => setShowQR(true)}
        >
          Show QR Code
        </button>
      </div>

      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div className="modal qr-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Your Ticket QR Code</h2>
              <button className="close-btn" onClick={() => setShowQR(false)}>×</button>
            </div>
            <div className="qr-content">
              <img 
                src={`data:image/png;base64,${ticket.qr_code}`} 
                alt="Ticket QR Code"
                className="qr-code"
              />
              <p>Show this QR code at the event entrance</p>
              <p><strong>Ticket:</strong> {ticket.ticket_number}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div className="admin-panel">
      <div className="container">
        <h1>Admin Panel</h1>
        
        <div className="admin-tabs">
          <button 
            className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Manage Events
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          {user.role === 'super_admin' && (
            <button 
              className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Manage Users
            </button>
          )}
        </div>

        <div className="admin-content">
          {activeTab === 'events' && <EventManagement />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'users' && user.role === 'super_admin' && <UserManagement />}
        </div>
      </div>
    </div>
  );
};

const EventManagement = () => {
  const [events, setEvents] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const deleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await axios.delete(`${API}/events/${eventId}`);
        fetchEvents();
      } catch (error) {
        alert('Error deleting event');
      }
    }
  };

  return (
    <div className="event-management">
      <div className="section-header">
        <h2>Event Management</h2>
        <button 
          className="create-btn"
          onClick={() => setShowCreateForm(true)}
        >
          Create Event
        </button>
      </div>

      <div className="events-table">
        {events.map(event => (
          <div key={event.id} className="event-row">
            <div className="event-info">
              <h3>{event.name}</h3>
              <p>{new Date(event.date).toLocaleDateString()} - {event.venue}</p>
              <p>Available: {event.available_tickets}/{event.total_tickets}</p>
            </div>
            <div className="event-actions">
              <button className="edit-btn">Edit</button>
              <button 
                className="delete-btn"
                onClick={() => deleteEvent(event.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreateForm && (
        <CreateEventModal 
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
};

const CreateEventModal = ({ onClose, onSuccess }) => {
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    date: '',
    venue: '',
    address: '',
    price: '',
    total_tickets: '',
    category: '',
    image_url: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/events`, {
        ...eventData,
        price: parseFloat(eventData.price),
        total_tickets: parseInt(eventData.total_tickets),
        date: new Date(eventData.date).toISOString()
      });
      onSuccess();
    } catch (error) {
      alert('Error creating event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Event</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="create-event-form">
          <div className="form-group">
            <label>Event Name</label>
            <input
              type="text"
              required
              value={eventData.name}
              onChange={(e) => setEventData({...eventData, name: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              required
              value={eventData.description}
              onChange={(e) => setEventData({...eventData, description: e.target.value})}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Date & Time</label>
              <input
                type="datetime-local"
                required
                value={eventData.date}
                onChange={(e) => setEventData({...eventData, date: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={eventData.price}
                onChange={(e) => setEventData({...eventData, price: e.target.value})}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Venue</label>
            <input
              type="text"
              required
              value={eventData.venue}
              onChange={(e) => setEventData({...eventData, venue: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              required
              value={eventData.address}
              onChange={(e) => setEventData({...eventData, address: e.target.value})}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Total Tickets</label>
              <input
                type="number"
                required
                value={eventData.total_tickets}
                onChange={(e) => setEventData({...eventData, total_tickets: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Category</label>
              <select
                required
                value={eventData.category}
                onChange={(e) => setEventData({...eventData, category: e.target.value})}
              >
                <option value="">Select Category</option>
                <option value="concert">Concert</option>
                <option value="festival">Festival</option>
                <option value="theater">Theater</option>
                <option value="sports">Sports</option>
                <option value="conference">Conference</option>
                <option value="workshop">Workshop</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label>Image URL (Optional)</label>
            <input
              type="url"
              value={eventData.image_url}
              onChange={(e) => setEventData({...eventData, image_url: e.target.value})}
            />
          </div>

          <button type="submit" className="create-btn" disabled={loading}>
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/dashboard`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics">
      <h2>Dashboard Analytics</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Events</h3>
          <div className="stat-value">{analytics.total_events}</div>
        </div>
        <div className="stat-card">
          <h3>Total Tickets Sold</h3>
          <div className="stat-value">{analytics.total_tickets}</div>
        </div>
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <div className="stat-value">${analytics.total_revenue}</div>
        </div>
      </div>

      <div className="recent-bookings">
        <h3>Recent Bookings</h3>
        <div className="bookings-list">
          {analytics.recent_bookings.map(booking => (
            <div key={booking.id} className="booking-item">
              <div className="booking-info">
                <strong>{booking.customer_name}</strong>
                <span>{booking.ticket_number}</span>
              </div>
              <div className="booking-date">
                {new Date(booking.booking_date).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  return (
    <div className="user-management">
      <div className="section-header">
        <h2>User Management</h2>
        <button 
          className="create-btn"
          onClick={() => setShowCreateAdmin(true)}
        >
          Create Admin
        </button>
      </div>

      <div className="users-table">
        {users.map(user => (
          <div key={user.id} className="user-row">
            <div className="user-info">
              <h3>{user.first_name} {user.last_name}</h3>
              <p>{user.email}</p>
              <span className={`role ${user.role}`}>{user.role}</span>
            </div>
            <div className="user-status">
              <span className={`status ${user.is_active ? 'active' : 'inactive'}`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showCreateAdmin && (
        <CreateAdminModal 
          onClose={() => setShowCreateAdmin(false)}
          onSuccess={() => {
            setShowCreateAdmin(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
};

const CreateAdminModal = ({ onClose, onSuccess }) => {
  const [adminData, setAdminData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/admin/create`, adminData);
      onSuccess();
    } catch (error) {
      alert('Error creating admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Admin</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="create-admin-form">
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                required
                value={adminData.first_name}
                onChange={(e) => setAdminData({...adminData, first_name: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                required
                value={adminData.last_name}
                onChange={(e) => setAdminData({...adminData, last_name: e.target.value})}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              required
              value={adminData.email}
              onChange={(e) => setAdminData({...adminData, email: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              value={adminData.password}
              onChange={(e) => setAdminData({...adminData, password: e.target.value})}
            />
          </div>

          <button type="submit" className="create-btn" disabled={loading}>
            {loading ? 'Creating...' : 'Create Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Navbar />
      </div>
    </AuthProvider>
  );
}

export default App;