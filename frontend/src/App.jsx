import { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState('');

  // Navigation redirect state
  const [redirectAfterLoginService, setRedirectAfterLoginService] = useState(null);

  // Lists & State data
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState(null);

  const [selectedService, setSelectedService] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState(null);

  // Admin Dashboard States
  const [adminSubTab, setAdminSubTab] = useState('bookings');
  const [adminBookings, setAdminBookings] = useState([]);
  const [loadingAdminBookings, setLoadingAdminBookings] = useState(false);
  const [adminBookingsError, setAdminBookingsError] = useState(null);
  
  // Admin Filter States
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Admin Services States
  const [adminServices, setAdminServices] = useState([]);
  const [loadingAdminServices, setLoadingAdminServices] = useState(false);
  const [adminServicesError, setAdminServicesError] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Service Form States
  const [formServiceName, setFormServiceName] = useState('');
  const [formServiceDesc, setFormServiceDesc] = useState('');
  const [formServiceDuration, setFormServiceDuration] = useState('');
  const [formServicePrice, setFormServicePrice] = useState('');

  // Admin Slots Management States
  const [managingSlotsService, setManagingSlotsService] = useState(null);
  const [adminSlots, setAdminSlots] = useState([]);
  const [loadingAdminSlots, setLoadingAdminSlots] = useState(false);
  const [adminSlotsError, setAdminSlotsError] = useState(null);

  // Slot Form States
  const [slotFormDate, setSlotFormDate] = useState('');
  const [slotFormStart, setSlotFormStart] = useState('');
  const [slotFormEnd, setSlotFormEnd] = useState('');

  // Analytics States
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  // Forms Login/Register
  const [isLoginView, setIsLoginView] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authSuccess, setAuthSuccess] = useState(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Contact Form
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submittingContact, setSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(null);
  const [contactError, setContactError] = useState(null);

  const [bookingSuccessMsg, setBookingSuccessMsg] = useState(null);
  const [bookingErrorMsg, setBookingErrorMsg] = useState(null);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState(null);
  const [paymentCancelMsg, setPaymentCancelMsg] = useState(null);

  // New Confirmation & Rescheduling States
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [loadingConfirmed, setLoadingConfirmed] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState(null);

  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Cold-start & slow request detector state (~3 seconds timeout)
  const [isSlowResponse, setIsSlowResponse] = useState(false);
  const activeRequestsRef = useRef(0);
  const slowTimerRef = useRef(null);

  const startRequestTracking = () => {
    activeRequestsRef.current += 1;
    if (!slowTimerRef.current) {
      slowTimerRef.current = setTimeout(() => {
        setIsSlowResponse(true);
      }, 3000);
    }
  };

  const endRequestTracking = () => {
    activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
    if (activeRequestsRef.current === 0) {
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      setIsSlowResponse(false);
    }
  };

  const trackedFetch = async (url, options = {}) => {
    startRequestTracking();
    try {
      const res = await fetch(url, options);
      return res;
    } finally {
      endRequestTracking();
    }
  };

  // Read Stripe callback redirection parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('booking_id');
    if (params.get('payment') === 'success' && bookingId) {
      setPaymentSuccessMsg('Payment succeeded! Your slot booking is now confirmed.');
      setCurrentView('confirmation');
      setLoadingConfirmed(true);
      
      // Fetch details of the newly paid booking
      const storedToken = localStorage.getItem('token') || token;
      trackedFetch(`${BACKEND_URL}/api/bookings/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      })
        .then((res) => res.json())
        .then((data) => {
          setConfirmedBooking(data);
          setLoadingConfirmed(false);
        })
        .catch((err) => {
          console.error(err);
          setLoadingConfirmed(false);
        });

      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('payment') === 'cancel') {
      setPaymentCancelMsg('Payment checkout was cancelled. You can retry paying from your dashboard.');
      setCurrentView('dashboard');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [token]);

  // Central fetch wrapper to capture 401 Unauthorized token expirations
  const apiFetch = async (path, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await trackedFetch(`${BACKEND_URL}${path}`, { ...options, headers });
      if (res.status === 401 && token) {
        // Clear auth details
        setToken('');
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setSessionExpiredMsg('Session expired. Please log in again.');
        setCurrentView('auth');
        throw new Error('Session expired.');
      }
      return res;
    } catch (err) {
      if (err.message !== 'Session expired.') {
        throw err;
      }
    }
  };

  // Fetch active services
  const fetchServices = () => {
    setLoadingServices(true);
    setServicesError(null);
    trackedFetch(`${BACKEND_URL}/api/services`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load services.');
        return res.json();
      })
      .then((data) => {
        setServices(data);
        setLoadingServices(false);
      })
      .catch((err) => {
        console.error(err);
        setServicesError('Unable to load services. Please check server connection.');
        setLoadingServices(false);
      });
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Fetch admin bookings with filters
  const fetchAdminBookings = () => {
    if (!token || !user || user.role !== 'admin') return;
    setLoadingAdminBookings(true);
    setAdminBookingsError(null);

    const params = new URLSearchParams();
    if (filterStatus) params.append('status', filterStatus);
    if (filterStartDate) params.append('start_date', filterStartDate);
    if (filterEndDate) params.append('end_date', filterEndDate);
    if (filterSearch) params.append('search', filterSearch);

    apiFetch(`/api/bookings?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to retrieve bookings.');
        return res.json();
      })
      .then((data) => {
        setAdminBookings(data || []);
        setLoadingAdminBookings(false);
      })
      .catch((err) => {
        console.error(err);
        setAdminBookingsError('Error loading bookings database.');
        setLoadingAdminBookings(false);
      });
  };

  useEffect(() => {
    if (currentView === 'admin-dashboard' && adminSubTab === 'bookings') {
      fetchAdminBookings();
    }
  }, [currentView, adminSubTab, filterStatus, filterStartDate, filterEndDate, filterSearch, token]);

  // Admin UI Route Guard
  useEffect(() => {
    if (currentView === 'admin-dashboard') {
      if (!user || user.role !== 'admin') {
        alert('Access Denied: Admin privileges required.');
        setCurrentView('home');
      }
    }
  }, [currentView, user]);

  // Mark Completed action (PUT request)
  const handleCompleteBooking = (bookingId) => {
    if (!window.confirm('Are you sure you want to mark this booking as completed?')) return;

    apiFetch(`/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed' })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to complete.');
        return data;
      })
      .then(() => {
        fetchAdminBookings();
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  // Admin Cancel action (reusing CancelBooking POST API)
  const handleAdminCancelBooking = (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? (This will release the slot)')) return;

    apiFetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST'
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to cancel.');
        return data;
      })
      .then(() => {
        fetchAdminBookings();
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  // Fetch admin services (including inactive ones)
  const fetchAdminServices = () => {
    if (!token || !user || user.role !== 'admin') return;
    setLoadingAdminServices(true);
    setAdminServicesError(null);

    apiFetch('/api/services?includeInactive=true')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load services.');
        return res.json();
      })
      .then((data) => {
        setAdminServices(data || []);
        setLoadingAdminServices(false);
      })
      .catch((err) => {
        console.error(err);
        setAdminServicesError('Error fetching services database.');
        setLoadingAdminServices(false);
      });
  };

  useEffect(() => {
    if (currentView === 'admin-dashboard' && adminSubTab === 'services') {
      fetchAdminServices();
    }
  }, [currentView, adminSubTab, token]);

  // Create/Update Service Submission
  const handleSaveServiceSubmit = (e) => {
    e.preventDefault();

    const url = editingService 
      ? `/api/services/${editingService.id}`
      : '/api/services';
    const method = editingService ? 'PUT' : 'POST';

    apiFetch(url, {
      method,
      body: JSON.stringify({
        name: formServiceName,
        description: formServiceDesc,
        duration_minutes: parseInt(formServiceDuration, 10),
        price: parseFloat(formServicePrice),
      })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (data.errors) {
            throw new Error(Object.values(data.errors).join(' '));
          }
          throw new Error(data.error || 'Failed to save service.');
        }
        return data;
      })
      .then(() => {
        fetchAdminServices();
        setShowServiceModal(false);
        setEditingService(null);
        setFormServiceName('');
        setFormServiceDesc('');
        setFormServiceDuration('');
        setFormServicePrice('');
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  // Edit Button Trigger
  const handleEditServiceClick = (service) => {
    setEditingService(service);
    setFormServiceName(service.name);
    setFormServiceDesc(service.description || '');
    setFormServiceDuration(service.duration_minutes.toString());
    setFormServicePrice(service.price.toString());
    setShowServiceModal(true);
  };

  // Soft-Delete Service Action (is_active = false)
  const handleDeleteService = (serviceId) => {
    if (!window.confirm('Are you sure you want to deactivate this service?')) return;

    apiFetch(`/api/services/${serviceId}`, { method: 'DELETE' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Deactivation failed.');
        return data;
      })
      .then(() => {
        fetchAdminServices();
        fetchServices(); // Sync active public list
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  // Reactivate Service Action (is_active = true)
  const handleReactivateService = (serviceId) => {
    apiFetch(`/api/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: true })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reactivation failed.');
        return data;
      })
      .then(() => {
        fetchAdminServices();
        fetchServices();
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  // Fetch slots list specifically for slot manager
  const fetchAdminSlots = (serviceId) => {
    setLoadingAdminSlots(true);
    setAdminSlotsError(null);

    // Admins query gets all slots (available, booked, blocked)
    apiFetch(`/api/slots?service_id=${serviceId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load slots.');
        return res.json();
      })
      .then((data) => {
        setAdminSlots(data || []);
        setLoadingAdminSlots(false);
      })
      .catch((err) => {
        console.error(err);
        setAdminSlotsError('Error retrieving slots.');
        setLoadingAdminSlots(false);
      });
  };

  // Open Slots Manager Dialog
  const handleManageSlotsClick = (service) => {
    setManagingSlotsService(service);
    fetchAdminSlots(service.id);
  };

  // Add availability slot
  const handleAddSlotSubmit = (e) => {
    e.preventDefault();
    if (!managingSlotsService || !slotFormDate || !slotFormStart || !slotFormEnd) return;

    // Build ISO strings
    const startTimeISO = new Date(`${slotFormDate}T${slotFormStart}:00`).toISOString();
    const endTimeISO = new Date(`${slotFormDate}T${slotFormEnd}:00`).toISOString();

    apiFetch('/api/slots', {
      method: 'POST',
      body: JSON.stringify({
        service_id: managingSlotsService.id,
        start_time: startTimeISO,
        end_time: endTimeISO,
        status: 'available'
      })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (data.errors) throw new Error(Object.values(data.errors).join(' '));
          throw new Error(data.error || 'Failed to create slot.');
        }
        return data;
      })
      .then(() => {
        fetchAdminSlots(managingSlotsService.id);
        setSlotFormDate('');
        setSlotFormStart('');
        setSlotFormEnd('');
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  // Delete slot
  const handleDeleteSlot = (slotId) => {
    if (!window.confirm('Are you sure you want to delete this availability slot?')) return;

    apiFetch(`/api/slots/${slotId}`, { method: 'DELETE' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete slot.');
        return data;
      })
      .then(() => {
        fetchAdminSlots(managingSlotsService.id);
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  // Fetch Analytics stats (Admin only)
  const fetchAnalytics = () => {
    if (!token || !user || user.role !== 'admin') return;
    setLoadingAnalytics(true);
    setAnalyticsError(null);

    apiFetch('/api/analytics')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load analytics.');
        return res.json();
      })
      .then((data) => {
        setAnalyticsData(data);
        setLoadingAnalytics(false);
      })
      .catch((err) => {
        console.error(err);
        setAnalyticsError('Error loading analytics. Permissions checked.');
        setLoadingAnalytics(false);
      });
  };

  useEffect(() => {
    if (currentView === 'admin-dashboard' && adminSubTab === 'analytics') {
      fetchAnalytics();
    }
  }, [currentView, adminSubTab, token]);

  // Fetch slots for a selected service
  const fetchSlotsForService = (service) => {
    setLoadingSlots(true);
    setSlotsError(null);
    setSelectedSlot(null);
    setSelectedService(service);
    
    // Public fetch for available slots only
    trackedFetch(`${BACKEND_URL}/api/slots?service_id=${service.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load slots.');
        return res.json();
      })
      .then((data) => {
        setSlots(data);
        setLoadingSlots(false);
      })
      .catch((err) => {
        console.error(err);
        setSlotsError('Could not retrieve available time slots.');
        setLoadingSlots(false);
      });
  };

  // Fetch customer bookings list
  const fetchMyBookings = () => {
    if (!token) return;
    setLoadingBookings(true);
    setBookingsError(null);

    apiFetch('/api/bookings')
      .then((res) => {
        if (!res.ok) throw new Error('Could not retrieve bookings.');
        return res.json();
      })
      .then((data) => {
        if (data) setBookings(data);
        setLoadingBookings(false);
      })
      .catch((err) => {
        console.error(err);
        setBookingsError('Error retrieving booking history.');
        setLoadingBookings(false);
      });
  };

  useEffect(() => {
    if (currentView === 'dashboard') {
      fetchMyBookings();
    }
  }, [currentView, token]);

  // Auth form submissions
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setSessionExpiredMsg('');
    setAuthSubmitting(true);

    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/signup';
    const body = isLoginView 
      ? { email: authEmail, password: authPassword }
      : { email: authEmail, password: authPassword, first_name: authFirstName, last_name: authLastName };

    trackedFetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (data.errors) {
            const errorMsg = Object.values(data.errors).join(' ');
            throw new Error(errorMsg);
          }
          throw new Error(data.error || 'Authentication failed.');
        }
        return data;
      })
      .then((data) => {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setAuthEmail('');
        setAuthPassword('');
        setAuthFirstName('');
        setAuthLastName('');

        // Redirect logic
        if (redirectAfterLoginService) {
          fetchSlotsForService(redirectAfterLoginService);
          setRedirectAfterLoginService(null);
          setCurrentView('slot-picker');
        } else {
          setCurrentView('dashboard');
        }
      })
      .catch((err) => {
        setAuthError(err.message);
      })
      .finally(() => {
        setAuthSubmitting(false);
      });
  };

  // Initiate Booking reservation flow
  const handleBookSlotClick = (service) => {
    if (!token) {
      setRedirectAfterLoginService(service);
      setSessionExpiredMsg('Please log in or sign up to book a slot.');
      setCurrentView('auth');
    } else {
      fetchSlotsForService(service);
      setCurrentView('slot-picker');
    }
  };

  // Confirm booking
  const handleConfirmBooking = () => {
    if (!selectedSlot || !selectedService) return;
    setBookingSuccessMsg(null);
    setBookingErrorMsg(null);

    apiFetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        service_id: selectedService.id,
        slot_id: selectedSlot.id
      })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Booking reservation failed.');
        }
        return data;
      })
      .then((data) => {
        setBookingSuccessMsg('Slot reserved successfully! Status is pending payment.');
        setCurrentView('dashboard');
        setSelectedSlot(null);
        setSelectedService(null);
      })
      .catch((err) => {
        setBookingErrorMsg(err.message);
      });
  };

  // Cancel booking
  const handleCancelBooking = (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    apiFetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST'
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to cancel.');
        return data;
      })
      .then(() => {
        fetchMyBookings();
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  // Pay booking (Trigger Stripe Checkout Redirect)
  const handlePayBooking = (bookingId) => {
    setBookingErrorMsg(null);
    setBookingSuccessMsg(null);
    setPaymentSuccessMsg(null);
    setPaymentCancelMsg(null);

    apiFetch('/api/payments/checkout-session', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout.');
        return data;
      })
      .then((data) => {
        if (data.url) {
          window.location.href = data.url;
        }
      })
      .catch((err) => {
        setBookingErrorMsg(err.message);
      });
  };

  // Reschedule Trigger (Fetch slots for booking service)
  const handleRescheduleClick = (booking) => {
    setReschedulingBooking(booking);
    setLoadingRescheduleSlots(true);
    setSelectedRescheduleSlot(null);
    setRescheduleSlots([]);

    fetch(`${BACKEND_URL}/api/slots?service_id=${booking.service_id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load slots.');
        return res.json();
      })
      .then((data) => {
        setRescheduleSlots(data);
        setLoadingRescheduleSlots(false);
      })
      .catch((err) => {
        console.error(err);
        alert('Could not retrieve available reschedule time slots.');
        setLoadingRescheduleSlots(false);
      });
  };

  // Confirm Reschedule (POST submission)
  const handleConfirmReschedule = () => {
    if (!reschedulingBooking || !selectedRescheduleSlot) return;

    setBookingErrorMsg(null);
    setBookingSuccessMsg(null);

    apiFetch(`/api/bookings/${reschedulingBooking.id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ new_slot_id: selectedRescheduleSlot.id })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Reschedule failed.');
        }
        return data;
      })
      .then((data) => {
        setBookingSuccessMsg(data.message || 'Rescheduled successfully!');
        setReschedulingBooking(null);
        setSelectedRescheduleSlot(null);
        fetchMyBookings();
      })
      .catch((err) => {
        alert(err.message);
      });
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentView('home');
  };

  // Contact form submission
  const handleContactSubmit = (e) => {
    e.preventDefault();
    setSubmittingContact(true);
    setContactSuccess(null);
    setContactError(null);

    trackedFetch(`${BACKEND_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMessage }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error('Too many requests. Please try again in 15 minutes.');
          }
          if (data.errors) {
            const errorMsg = Object.values(data.errors).join(' ');
            throw new Error(errorMsg);
          }
          throw new Error(data.error || 'Failed to submit form.');
        }
        return data;
      })
      .then((data) => {
        setContactSuccess(data.message);
        setContactName('');
        setContactEmail('');
        setContactMessage('');
        setSubmittingContact(false);
      })
      .catch((err) => {
        setContactError(err.message);
        setSubmittingContact(false);
      });
  };

  return (
    <div>
      {/* Navigation Header */}
      <header className="navbar">
        <div className="logo" onClick={() => setCurrentView('home')} style={{ cursor: 'pointer' }}>
          BookMy<span>Slot</span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <ul className="nav-links">
            <li className={`nav-item ${currentView === 'home' ? 'active' : ''}`} onClick={() => setCurrentView('home')}>Home</li>
            <li className={`nav-item ${currentView === 'services' ? 'active' : ''}`} onClick={() => setCurrentView('services')}>Services</li>
            <li className={`nav-item ${currentView === 'about' ? 'active' : ''}`} onClick={() => setCurrentView('about')}>About</li>
            <li className={`nav-item ${currentView === 'contact' ? 'active' : ''}`} onClick={() => setCurrentView('contact')}>Contact</li>
            {token && (
              <li className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>Dashboard</li>
            )}
            {token && user && user.role === 'admin' && (
              <li className={`nav-item ${currentView === 'admin-dashboard' ? 'active' : ''}`} onClick={() => { setCurrentView('admin-dashboard'); setAdminSubTab('bookings'); }}>Admin Panel</li>
            )}
          </ul>

          {/* User profile controls */}
          {token && user ? (
            <div className="user-badge">
              <span className="user-name">{user.first_name} ({user.role})</span>
              <button className="btn-logout" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <button className="btn-logout" onClick={() => { setSessionExpiredMsg(''); setCurrentView('auth'); }}>Login</button>
          )}
        </nav>
      </header>

      {/* Main Views Container */}
      <main className="container">
        
        {/* Banner messages */}
        {isSlowResponse && (
          <div className="alert alert-success" style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-accent-secondary)',
            color: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: '500',
            marginBottom: '1.5rem'
          }}>
            <span style={{ fontSize: '1.2rem' }}>☕</span>
            <span>Waking up the server — this can take up to a minute...</span>
          </div>
        )}
        {bookingSuccessMsg && <div className="alert alert-success">{bookingSuccessMsg}</div>}
        {bookingErrorMsg && <div className="alert alert-error">{bookingErrorMsg}</div>}
        {paymentSuccessMsg && <div className="alert alert-success">{paymentSuccessMsg}</div>}
        {paymentCancelMsg && <div className="alert alert-error">{paymentCancelMsg}</div>}

        {/* 1. Home View */}
        {currentView === 'home' && (
          <div>
            <section className="hero">
              <h1>Bookings Made Simple.</h1>
              <p>
                From hair styling and repair jobs to wellness therapies and custom tutoring slots. 
                Find availability and book your service instantly.
              </p>
              <button className="btn" onClick={() => setCurrentView('services')}>
                Explore Available Services
              </button>
            </section>

            <section style={{ marginTop: '4rem' }}>
              <div className="grid">
                <div className="card">
                  <h3 className="card-title">Real-time Booking</h3>
                  <p className="card-desc" style={{ minHeight: 'unset' }}>
                    Say goodbye to endless phone tag. Book discrete available slots in real time directly from our platform.
                  </p>
                </div>
                <div className="card">
                  <h3 className="card-title">Instant Security</h3>
                  <p className="card-desc" style={{ minHeight: 'unset' }}>
                    Payments are handled securely via Stripe test mode, ensuring peace of mind during checkout.
                  </p>
                </div>
                <div className="card">
                  <h3 className="card-title">Flexible Schedules</h3>
                  <p className="card-desc" style={{ minHeight: 'unset' }}>
                    Reschedule, cancel, or modify bookings easily from your personalized customer dashboard.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 2. Services List View */}
        {currentView === 'services' && (
          <div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>Our Services</h2>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
              Select a service below to view open appointment slots and schedule your visit.
            </p>

            {loadingServices && (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                {isSlowResponse ? 'Waking up the server — this can take up to a minute...' : 'Loading services...'}
              </p>
            )}
            {servicesError && <p className="alert alert-error">{servicesError}</p>}

            <div className="grid">
              {services.map((service) => (
                <div className="card" key={service.id}>
                  <h3 className="card-title">{service.name}</h3>
                  <p className="card-desc">{service.description || 'No description provided.'}</p>
                  <div className="card-footer" style={{ marginBottom: '1.25rem' }}>
                    <div className="card-meta">
                      <span className="meta-label">Duration</span>
                      <span className="meta-value">{service.duration_minutes} min</span>
                    </div>
                    <div className="card-meta" style={{ textAlign: 'right' }}>
                      <span className="meta-label">Price</span>
                      <span className="meta-value" style={{ color: 'var(--accent)' }}>${parseFloat(service.price).toFixed(2)}</span>
                    </div>
                  </div>
                  <button className="btn" style={{ width: '100%' }} onClick={() => handleBookSlotClick(service)}>
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Slot Picker View */}
        {currentView === 'slot-picker' && selectedService && (
          <div className="slot-picker-container">
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Select Time Slot for {selectedService.name}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Browse and select from the available schedules below to reserve your booking.
            </p>

            {loadingSlots && (
              <p style={{ color: 'var(--text-secondary)' }}>
                {isSlowResponse ? 'Waking up the server — this can take up to a minute...' : 'Loading slots...'}
              </p>
            )}
            {slotsError && <p className="alert alert-error">{slotsError}</p>}

            {!loadingSlots && !slotsError && slots.length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>No available time slots listed for this service at the moment.</p>
            )}

            <div className="slot-grid">
              {slots.map((slot) => {
                const start = new Date(slot.start_time);
                const isSelected = selectedSlot && selectedSlot.id === slot.id;
                return (
                  <button 
                    key={slot.id} 
                    className={`slot-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <div>{start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '700', marginTop: '0.25rem' }}>
                      {start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-logout" onClick={() => setCurrentView('services')}>Cancel</button>
              <button 
                className="btn" 
                disabled={!selectedSlot}
                onClick={handleConfirmBooking}
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}

        {/* 4. Login & Register View */}
        {currentView === 'auth' && (
          <div className="auth-box">
            <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              {isLoginView ? 'Welcome Back' : 'Create Account'}
            </h2>

            {sessionExpiredMsg && <div className="alert alert-success">{sessionExpiredMsg}</div>}
            {authError && <div className="alert alert-error">{authError}</div>}
            {authSuccess && <div className="alert alert-success">{authSuccess}</div>}

            <form onSubmit={handleAuthSubmit}>
              {!isLoginView && (
                <>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={authFirstName} 
                      onChange={(e) => setAuthFirstName(e.target.value)} 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={authLastName} 
                      onChange={(e) => setAuthLastName(e.target.value)} 
                      required
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={authEmail} 
                  onChange={(e) => setAuthEmail(e.target.value)} 
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)} 
                  required
                />
              </div>
              <button type="submit" className="btn" disabled={authSubmitting} style={{ width: '100%', marginTop: '1rem' }}>
                {authSubmitting 
                  ? (isSlowResponse ? 'Waking up server...' : 'Please wait...')
                  : (isLoginView ? 'Login' : 'Sign Up')}
              </button>
            </form>

            <div className="auth-toggle-text">
              {isLoginView ? (
                <p>Don't have an account? <span onClick={() => { setIsLoginView(false); setAuthError(null); }}>Sign Up</span></p>
              ) : (
                <p>Already have an account? <span onClick={() => { setIsLoginView(true); setAuthError(null); }}>Login</span></p>
              )}
            </div>
          </div>
        )}

        {/* 5. Customer Dashboard Booking History View */}
        {/* 3.1 Booking Confirmation Screen (Shown after success payment) */}
        {currentView === 'confirmation' && (
          <div className="confirmation-card">
            <h2>Booking Confirmed!</h2>
            <p>Your payment succeeded, and your booking is officially confirmed.</p>
            {loadingConfirmed ? (
              <p style={{ color: 'var(--text-secondary)' }}>
                {isSlowResponse ? 'Waking up the server — this can take up to a minute...' : 'Loading booking details...'}
              </p>
            ) : confirmedBooking ? (
              <div className="confirmation-details">
                <div className="confirmation-row">
                  <span className="confirmation-label">Service</span>
                  <span className="confirmation-val">{confirmedBooking.service_name}</span>
                </div>
                <div className="confirmation-row">
                  <span className="confirmation-label">Date</span>
                  <span className="confirmation-val">
                    {new Date(confirmedBooking.start_time).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="confirmation-row">
                  <span className="confirmation-label">Time</span>
                  <span className="confirmation-val">
                    {new Date(confirmedBooking.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({confirmedBooking.duration_minutes} min)
                  </span>
                </div>
                <div className="confirmation-row">
                  <span className="confirmation-label">Amount Paid</span>
                  <span className="confirmation-val" style={{ color: 'var(--accent)' }}>
                    ${parseFloat(confirmedBooking.price).toFixed(2)}
                  </span>
                </div>
                <div className="confirmation-row">
                  <span className="confirmation-label">Booking ID</span>
                  <span className="confirmation-val" style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {confirmedBooking.id}
                  </span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>Details could not be fetched, but your payment was processed.</p>
            )}
            <button className="btn" onClick={() => setCurrentView('dashboard')}>
              Go to Your Dashboard
            </button>
          </div>
        )}

        {/* 5. Customer Dashboard Booking History View */}
        {currentView === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Your Dashboard</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>
              View and manage your service booking history.
            </p>

            {loadingBookings && (
              <p style={{ color: 'var(--text-secondary)' }}>
                {isSlowResponse ? 'Waking up the server — this can take up to a minute...' : 'Loading bookings...'}
              </p>
            )}
            {bookingsError && <p className="alert alert-error">{bookingsError}</p>}

            {!loadingBookings && !bookingsError && bookings.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>You don't have any bookings scheduled yet.</p>
            )}

            {/* Upcoming Bookings Section */}
            {!loadingBookings && bookings.length > 0 && (
              <div>
                <h3 className="dashboard-section-title">Upcoming Appointments</h3>
                {bookings.filter(b => new Date(b.start_time) >= new Date()).length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No upcoming appointments scheduled.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {bookings
                      .filter(b => new Date(b.start_time) >= new Date())
                      .map((booking) => {
                        const date = new Date(booking.start_time);
                        const hoursRemaining = (date - new Date()) / (1000 * 60 * 60);
                        const canModify = booking.status === 'pending_payment' || (booking.status === 'confirmed' && hoursRemaining >= 24);
                        
                        let badgeClass = 'badge-pending';
                        if (booking.status === 'confirmed') badgeClass = 'badge-confirmed';
                        if (booking.status === 'cancelled') badgeClass = 'badge-cancelled';

                        return (
                          <div className="card" key={booking.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                              <span className={`badge ${badgeClass}`} style={{ marginBottom: '0.5rem' }}>{booking.status.replace('_', ' ')}</span>
                              <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>{booking.service_name}</h3>
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                {date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at{' '}
                                {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({booking.duration_minutes} mins)
                              </p>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent)' }}>${parseFloat(booking.price).toFixed(2)}</span>
                              {booking.status === 'pending_payment' && (
                                <button className="btn" onClick={() => handlePayBooking(booking.id)}>
                                  Pay Now
                                </button>
                              )}
                              {booking.status !== 'cancelled' && (
                                <>
                                  {canModify ? (
                                    <>
                                      <button className="btn-logout" onClick={() => handleRescheduleClick(booking)}>
                                        Reschedule
                                      </button>
                                      <button className="btn-danger" onClick={() => handleCancelBooking(booking.id)}>
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                      No changes within 24h
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Past Bookings Section */}
                <h3 className="dashboard-section-title">Past Appointments</h3>
                {bookings.filter(b => new Date(b.start_time) < new Date()).length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No past appointments recorded.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {bookings
                      .filter(b => new Date(b.start_time) < new Date())
                      .map((booking) => {
                        const date = new Date(booking.start_time);
                        let badgeClass = 'badge-pending';
                        if (booking.status === 'confirmed') badgeClass = 'badge-confirmed';
                        if (booking.status === 'cancelled') badgeClass = 'badge-cancelled';

                        return (
                          <div className="card" key={booking.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', opacity: 0.7 }}>
                            <div>
                              <span className={`badge ${badgeClass}`} style={{ marginBottom: '0.5rem' }}>{booking.status.replace('_', ' ')}</span>
                              <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>{booking.service_name}</h3>
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                {date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at{' '}
                                {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({booking.duration_minutes} mins)
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent)' }}>${parseFloat(booking.price).toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5.1 Admin Dashboard Protected View */}
        {currentView === 'admin-dashboard' && (
          <div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Admin Control Center</h2>
            
            {/* Admin Submenus navigation */}
            <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <button 
                className="btn-logout" 
                style={{ borderColor: adminSubTab === 'bookings' ? 'var(--primary)' : 'var(--border)', color: adminSubTab === 'bookings' ? 'var(--primary)' : 'var(--text-secondary)' }}
                onClick={() => setAdminSubTab('bookings')}
              >
                Bookings
              </button>
              <button 
                className="btn-logout" 
                style={{ borderColor: adminSubTab === 'services' ? 'var(--primary)' : 'var(--border)', color: adminSubTab === 'services' ? 'var(--primary)' : 'var(--text-secondary)' }}
                onClick={() => setAdminSubTab('services')}
              >
                Services
              </button>
              <button 
                className="btn-logout" 
                style={{ borderColor: adminSubTab === 'analytics' ? 'var(--primary)' : 'var(--border)', color: adminSubTab === 'analytics' ? 'var(--primary)' : 'var(--text-secondary)' }}
                onClick={() => setAdminSubTab('analytics')}
              >
                Analytics
              </button>
              <button 
                className="btn-logout" 
                style={{ borderColor: adminSubTab === 'customers' ? 'var(--primary)' : 'var(--border)', color: adminSubTab === 'customers' ? 'var(--primary)' : 'var(--text-secondary)' }}
                onClick={() => setAdminSubTab('customers')}
              >
                Customers
              </button>
            </div>

            {/* Sub-tab 1: Admin Bookings Table list */}
            {adminSubTab === 'bookings' && (
              <div>
                {/* Search & Filters Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '10px' }}>
                  <div style={{ flex: '1 1 250px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Search Customer (Name/Email)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Type search terms..." 
                      value={filterSearch} 
                      onChange={(e) => setFilterSearch(e.target.value)} 
                    />
                  </div>
                  <div style={{ width: '150px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Status</label>
                    <select 
                      className="form-input" 
                      value={filterStatus} 
                      onChange={(e) => setFilterStatus(e.target.value)}
                      style={{ background: 'var(--bg-primary)' }}
                    >
                      <option value="">All</option>
                      <option value="pending_payment">Pending Payment</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div style={{ width: '150px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Start Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={filterStartDate} 
                      onChange={(e) => setFilterStartDate(e.target.value)} 
                    />
                  </div>
                  <div style={{ width: '150px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>End Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={filterEndDate} 
                      onChange={(e) => setFilterEndDate(e.target.value)} 
                    />
                  </div>
                </div>

                {loadingAdminBookings && <p style={{ color: 'var(--text-secondary)' }}>Loading bookings records...</p>}
                {adminBookingsError && <p className="alert alert-error">{adminBookingsError}</p>}

                {!loadingAdminBookings && !adminBookingsError && (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '1rem' }}>Booking ID</th>
                          <th style={{ padding: '1rem' }}>Customer</th>
                          <th style={{ padding: '1rem' }}>Service</th>
                          <th style={{ padding: '1rem' }}>Date & Time</th>
                          <th style={{ padding: '1rem' }}>Amount</th>
                          <th style={{ padding: '1rem' }}>Status</th>
                          <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminBookings.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No matching bookings records found.</td>
                          </tr>
                        ) : (
                          adminBookings.map((booking) => {
                            const date = new Date(booking.start_time);
                            let badgeClass = 'badge-pending';
                            if (booking.status === 'confirmed') badgeClass = 'badge-confirmed';
                            if (booking.status === 'completed') badgeClass = 'badge-confirmed'; // Complete matches success indicator
                            if (booking.status === 'cancelled') badgeClass = 'badge-cancelled';

                            return (
                              <tr key={booking.id} style={{ borderBottom: '1px solid var(--border)', hover: { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                                <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{booking.id.slice(0, 8)}...</td>
                                <td style={{ padding: '1rem' }}>
                                  <div style={{ fontWeight: '600' }}>{booking.customer_first_name} {booking.customer_last_name}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{booking.customer_email}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>{booking.service_name}</td>
                                <td style={{ padding: '1rem' }}>
                                  <div>{date.toLocaleDateString()}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </td>
                                <td style={{ padding: '1rem', fontWeight: '700' }}>${parseFloat(booking.price).toFixed(2)}</td>
                                <td style={{ padding: '1rem' }}>
                                  <span className={`badge ${badgeClass}`}>{booking.status.replace('_', ' ')}</span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    {booking.status === 'confirmed' && (
                                      <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleCompleteBooking(booking.id)}>
                                        Complete
                                      </button>
                                    )}
                                    {booking.status !== 'cancelled' && (
                                      <button className="btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleAdminCancelBooking(booking.id)}>
                                        Cancel
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Admin Services List */}
            {adminSubTab === 'services' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ margin: 0 }}>Services Catalog</h3>
                  <button className="btn" onClick={() => { setEditingService(null); setFormServiceName(''); setFormServiceDesc(''); setFormServiceDuration(''); setFormServicePrice(''); setShowServiceModal(true); }}>
                    + Add New Service
                  </button>
                </div>

                {loadingAdminServices && <p style={{ color: 'var(--text-secondary)' }}>Loading services...</p>}
                {adminServicesError && <p className="alert alert-error">{adminServicesError}</p>}

                {!loadingAdminServices && !adminServicesError && (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '1rem' }}>Name</th>
                          <th style={{ padding: '1rem' }}>Description</th>
                          <th style={{ padding: '1rem' }}>Duration</th>
                          <th style={{ padding: '1rem' }}>Price</th>
                          <th style={{ padding: '1rem' }}>Status</th>
                          <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminServices.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No services found.</td>
                          </tr>
                        ) : (
                          adminServices.map((service) => {
                            let badgeClass = service.is_active ? 'badge-confirmed' : 'badge-cancelled';
                            return (
                              <tr key={service.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', fontWeight: '600' }}>{service.name}</td>
                                <td style={{ padding: '1rem', color: 'var(--text-secondary)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {service.description || '(No description)'}
                                </td>
                                <td style={{ padding: '1rem' }}>{service.duration_minutes} mins</td>
                                <td style={{ padding: '1rem', fontWeight: '700' }}>${parseFloat(service.price).toFixed(2)}</td>
                                <td style={{ padding: '1rem' }}>
                                  <span className={`badge ${badgeClass}`}>{service.is_active ? 'Active' : 'Inactive'}</span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button className="btn-logout" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleEditServiceClick(service)}>
                                      Edit
                                    </button>
                                    <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={() => handleManageSlotsClick(service)}>
                                      Slots
                                    </button>
                                    {service.is_active ? (
                                      <button className="btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleDeleteService(service.id)}>
                                        Deactivate
                                      </button>
                                    ) : (
                                      <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--accent)', border: 'none', color: '#fff' }} onClick={() => handleReactivateService(service.id)}>
                                        Reactivate
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {adminSubTab === 'analytics' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ margin: 0 }}>Analytics Performance Reports</h3>
                  <button className="btn" onClick={fetchAnalytics} disabled={loadingAnalytics}>
                    Refresh Data
                  </button>
                </div>

                {loadingAnalytics && <p style={{ color: 'var(--text-secondary)' }}>Loading aggregated metrics...</p>}
                {analyticsError && <p className="alert alert-error">{analyticsError}</p>}

                {!loadingAnalytics && !analyticsError && analyticsData && (
                  <div>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                      <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Revenue</div>
                        <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--accent)' }}>
                          ${analyticsData.summary.total_revenue.toFixed(2)}
                        </div>
                      </div>
                      <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Bookings</div>
                        <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                          {analyticsData.summary.total_bookings}
                        </div>
                      </div>
                    </div>

                    {/* Charts Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                      {/* 1. Revenue Chart (Bar) */}
                      <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)', minHeight: '350px' }}>
                        <h4 style={{ margin: '0 0 1.5rem 0' }}>Daily Revenue Distribution</h4>
                        <div style={{ width: '100%', height: '280px' }}>
                          {analyticsData.revenue_chart.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '100px' }}>No revenue records registered yet.</p>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={analyticsData.revenue_chart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }} />
                                <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>

                      {/* 2. Bookings over time chart (Line) */}
                      <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)', minHeight: '350px' }}>
                        <h4 style={{ margin: '0 0 1.5rem 0' }}>Daily Bookings Volume</h4>
                        <div style={{ width: '100%', height: '280px' }}>
                          {analyticsData.bookings_chart.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '100px' }}>No bookings records registered yet.</p>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={analyticsData.bookings_chart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 10 }} allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }} />
                                <Line type="monotone" dataKey="bookings" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {adminSubTab === 'customers' && (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <h3>Customer Directory profiles coming soon.</h3>
              </div>
            )}
          </div>
        )}

        {/* 6. About Page */}
        {currentView === 'about' && (
          <div className="about-section">
            <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>About BookMySlot</h2>
            <p>
              BookMySlot is a cutting-edge scheduling system engineered to help service providers and clients connect transparently. We eliminate booking confusion with our unique, lock-secured time slot selection engine.
            </p>
            <p>
              Whether you are running a clinic, offering consulting slots, teaching students, or scheduling equipment repairs, BookMySlot scales to fit your schedule.
            </p>
          </div>
        )}

        {/* 7. Contact View */}
        {currentView === 'contact' && (
          <div className="form-container">
            <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>Contact Us</h2>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem' }}>
              Have questions or need support? Send us a message and our team will get back to you shortly.
            </p>

            {contactSuccess && <div className="alert alert-success">{contactSuccess}</div>}
            {contactError && <div className="alert alert-error">{contactError}</div>}

            <form onSubmit={handleContactSubmit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-input" value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} required />
              </div>
              <button type="submit" className="btn" style={{ width: '100%' }} disabled={submittingContact}>
                {submittingContact ? 'Submitting...' : 'Send Message'}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* Reschedule Modal Overlay */}
      {reschedulingBooking && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3 className="modal-header">Reschedule Appointment</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Select a new available time slot to move your <strong>{reschedulingBooking.service_name}</strong> appointment.
            </p>
            
            {loadingRescheduleSlots && <p style={{ color: 'var(--text-secondary)' }}>Loading slots...</p>}
            
            {!loadingRescheduleSlots && rescheduleSlots.filter(s => s.id !== reschedulingBooking.slot_id).length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>No alternative slots available for this service.</p>
            )}

            <div className="slot-grid" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              {rescheduleSlots
                .filter(s => s.id !== reschedulingBooking.slot_id)
                .map((slot) => {
                  const start = new Date(slot.start_time);
                  const isSelected = selectedRescheduleSlot && selectedRescheduleSlot.id === slot.id;
                  return (
                    <button 
                      key={slot.id} 
                      className={`slot-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedRescheduleSlot(slot)}
                    >
                      <div>{start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                      <div style={{ fontWeight: '700', marginTop: '0.25rem' }}>
                        {start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </button>
                  );
                })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn-logout" onClick={() => setReschedulingBooking(null)}>Close</button>
              <button 
                className="btn" 
                disabled={!selectedRescheduleSlot}
                onClick={handleConfirmReschedule}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Add/Edit Form Modal */}
      {showServiceModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3 className="modal-header">{editingService ? 'Edit Service' : 'Add New Service'}</h3>
            
            <form onSubmit={handleSaveServiceSubmit}>
              <div className="form-group">
                <label className="form-label">Service Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formServiceName} 
                  onChange={(e) => setFormServiceName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-input" 
                  value={formServiceDesc} 
                  onChange={(e) => setFormServiceDesc(e.target.value)} 
                  rows="3"
                />
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Duration (Minutes)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={formServiceDuration} 
                    onChange={(e) => setFormServiceDuration(e.target.value)} 
                    required 
                    min="1"
                  />
                </div>
                <div>
                  <label className="form-label">Price ($)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    step="0.01"
                    value={formServicePrice} 
                    onChange={(e) => setFormServicePrice(e.target.value)} 
                    required 
                    min="0"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn-logout" onClick={() => { setShowServiceModal(false); setEditingService(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  {editingService ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Availability Slots Manager Modal */}
      {managingSlotsService && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '700px', width: '90%' }}>
            <h3 className="modal-header">Manage Slots: {managingSlotsService.name}</h3>
            
            {/* Add Slot Form */}
            <form onSubmit={handleAddSlotSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', alignItems: 'end', marginBottom: '2rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Slot Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={slotFormDate} 
                  onChange={(e) => setSlotFormDate(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Start Time</label>
                <input 
                  type="time" 
                  className="form-input" 
                  value={slotFormStart} 
                  onChange={(e) => setSlotFormStart(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>End Time</label>
                <input 
                  type="time" 
                  className="form-input" 
                  value={slotFormEnd} 
                  onChange={(e) => setSlotFormEnd(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="btn" style={{ padding: '0.75rem 1rem' }}>
                + Add Slot
              </button>
            </form>

            {loadingAdminSlots && <p style={{ color: 'var(--text-secondary)' }}>Loading slots list...</p>}
            {adminSlotsError && <p className="alert alert-error">{adminSlotsError}</p>}

            {/* Slots List Table */}
            {!loadingAdminSlots && !adminSlotsError && (
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem' }}>Start Date & Time</th>
                      <th style={{ padding: '0.75rem' }}>End Date & Time</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminSlots.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No availability slots defined for this service.</td>
                      </tr>
                    ) : (
                      adminSlots.map((slot) => {
                        const start = new Date(slot.start_time);
                        const end = new Date(slot.end_time);
                        let badgeClass = 'badge-pending';
                        if (slot.status === 'available') badgeClass = 'badge-confirmed';
                        if (slot.status === 'booked') badgeClass = 'badge-cancelled';
                        
                        return (
                          <tr key={slot.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.75rem' }}>
                              {start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {end.toLocaleDateString()} {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span className={`badge ${badgeClass}`}>{slot.status}</span>
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                              {slot.status === 'available' ? (
                                <button className="btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDeleteSlot(slot.id)}>
                                  Delete
                                </button>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic' }}>Locked (Booked)</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-logout" onClick={() => { setManagingSlotsService(null); setAdminSlots([]); }}>
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2026 BookMySlot. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
