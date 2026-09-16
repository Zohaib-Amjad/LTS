const STORAGE_KEYS = {
  profile: 'smartluggage_profile',
  settings: 'smartluggage_settings',
  luggage: 'smartluggage_luggage',
  bookings: 'smartluggage_bookings',
  notifications: 'smartluggage_notifications',
  supportRequests: 'smartluggage_support_requests',
  feedback: 'smartluggage_feedback',
  theme: 'smartluggage_theme',
  auth: 'smartluggage_auth'
};

const appState = {
  currentSection: 'home',
  bookings: [],
  luggage: [],
  notifications: [],
  profile: null,
  settings: null,
  supportRequests: [],
  chatHistory: [],
  currentFilter: 'All',
  currentPartnerFilter: 'All',
  charts: {}
};

const sampleProfile = {
  fullName: 'Ali Khan',
  email: 'alikhan@example.com',
  phone: '+92 300 1234567',
  address: 'House 12, Street 5, G-10',
  city: 'Islamabad',
  country: 'Pakistan',
  avatarInitials: 'AK'
};

const sampleSettings = {
  language: 'English',
  currency: 'USD',
  timezone: 'PKT (UTC+5)',
  emailNotifications: true,
  smsNotifications: true,
  deliveryNotifications: true,
  aiRecommendations: true,
  lightMode: true,
  darkMode: false,
  compactMode: false,
  themePreference: 'light'
};

const sampleLuggage = [
  {
    id: 'LUG-10001',
    type: 'Suitcase',
    weight: 12,
    dimensions: '40x25x20 cm',
    status: 'In Transit',
    currentLocation: 'Lahore',
    destination: 'Karachi',
    bookingId: 'BK-2026-001',
    deliveryDate: '2026-09-18'
  },
  {
    id: 'LUG-10002',
    type: 'Backpack',
    weight: 4,
    dimensions: '30x20x15 cm',
    status: 'Ready for Pickup',
    currentLocation: 'Islamabad',
    destination: 'Peshawar',
    bookingId: 'BK-2026-002',
    deliveryDate: '2026-09-20'
  },
  {
    id: 'LUG-10003',
    type: 'Fragile Package',
    weight: 9,
    dimensions: '38x18x15 cm',
    status: 'Delayed',
    currentLocation: 'Rawalpindi',
    destination: 'Multan',
    bookingId: 'BK-2026-003',
    deliveryDate: '2026-09-21'
  },
  {
    id: 'LUG-10004',
    type: 'Box',
    weight: 8,
    dimensions: '45x30x25 cm',
    status: 'Delivered',
    currentLocation: 'Karachi',
    destination: 'Islamabad',
    bookingId: 'BK-2026-004',
    deliveryDate: '2026-09-10'
  }
];

const sampleBookings = [
  {
    id: 'BK-2026-001',
    customer: 'Ali Khan',
    luggage: 'LUG-10001',
    pickup: 'Islamabad',
    destination: 'Karachi',
    bookingDate: '2026-09-12',
    deliveryDate: '2026-09-18',
    cost: 145.5,
    status: 'In Transit',
    transportType: 'Express'
  },
  {
    id: 'BK-2026-002',
    customer: 'Sarah Ali',
    luggage: 'LUG-10002',
    pickup: 'Lahore',
    destination: 'Peshawar',
    bookingDate: '2026-09-13',
    deliveryDate: '2026-09-20',
    cost: 89.9,
    status: 'Pending',
    transportType: 'Standard'
  },
  {
    id: 'BK-2026-003',
    customer: 'Hassan Raza',
    luggage: 'LUG-10003',
    pickup: 'Rawalpindi',
    destination: 'Multan',
    bookingDate: '2026-09-11',
    deliveryDate: '2026-09-21',
    cost: 112.0,
    status: 'Confirmed',
    transportType: 'Premium'
  },
  {
    id: 'BK-2026-004',
    customer: 'Ayesha Qureshi',
    luggage: 'LUG-10004',
    pickup: 'Karachi',
    destination: 'Islamabad',
    bookingDate: '2026-09-06',
    deliveryDate: '2026-09-10',
    cost: 160.2,
    status: 'Delivered',
    transportType: 'Economy'
  }
];

const sampleNotifications = [
  { id: 1, title: 'Booking confirmed', message: 'Your booking BK-2026-002 has been confirmed.', time: '2h ago', read: false },
  { id: 2, title: 'Luggage picked up', message: 'LUG-10001 has been collected from Islamabad.', time: '5h ago', read: false },
  { id: 3, title: 'AI recommendation available', message: 'A better transport option is now available for your route.', time: '1d ago', read: true },
  { id: 4, title: 'Delivery completed', message: 'LUG-10004 reached its destination successfully.', time: '2d ago', read: true }
];

const sampleSupport = [
  { question: 'How do I book luggage transportation?', answer: 'Go to Book Luggage, fill in the form, select transport type, and submit.' },
  { question: 'How is the cost calculated?', answer: 'The cost is estimated based on distance, weight, transport type, and special handling fees.' },
  { question: 'How do I track luggage?', answer: 'Use the Track Luggage page and enter the luggage ID or tracking number.' },
  { question: 'Can I cancel a booking?', answer: 'Yes, bookings can be cancelled from the My Bookings page.' },
  { question: 'What happens if delivery is delayed?', answer: 'You will receive notifications and the delay risk is highlighted in the AI prediction panel.' }
];

const samplePartners = [
  { name: 'SwiftCargo Logistics', vehicle: 'Mini Van', serviceArea: 'Islamabad, Rawalpindi', rating: 4.8, speed: 'Fast', price: '$$', availability: 'Available Now' },
  { name: 'TravelMile Express', vehicle: 'Cargo Truck', serviceArea: 'Karachi, Lahore', rating: 4.6, speed: 'Medium', price: '$$', availability: 'Available Now' },
  { name: 'SafeRoute Movers', vehicle: 'Premium Van', serviceArea: 'Peshawar, Multan', rating: 4.9, speed: 'Fast', price: '$$$', availability: 'Busy' },
  { name: 'BudgetFreight', vehicle: 'Cargo Bike', serviceArea: 'Faisalabad, Lahore', rating: 4.4, speed: 'Slow', price: '$', availability: 'Available Now' }
];

const sampleSupportRequests = [];

function init() {
  if (!localStorage.getItem(STORAGE_KEYS.auth)) {
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify({ loggedIn: false }));
  }

  const existingProfile = localStorage.getItem(STORAGE_KEYS.profile);
  const existingLuggage = localStorage.getItem(STORAGE_KEYS.luggage);
  const existingBookings = localStorage.getItem(STORAGE_KEYS.bookings);
  const existingNotifications = localStorage.getItem(STORAGE_KEYS.notifications);
  const existingSettings = localStorage.getItem(STORAGE_KEYS.settings);
  const existingSupport = localStorage.getItem(STORAGE_KEYS.supportRequests);

  appState.profile = existingProfile ? JSON.parse(existingProfile) : sampleProfile;
  appState.luggage = existingLuggage ? JSON.parse(existingLuggage) : sampleLuggage;
  appState.bookings = existingBookings ? JSON.parse(existingBookings) : sampleBookings;
  appState.notifications = existingNotifications ? JSON.parse(existingNotifications) : sampleNotifications;
  appState.settings = existingSettings ? JSON.parse(existingSettings) : sampleSettings;
  appState.supportRequests = existingSupport ? JSON.parse(existingSupport) : sampleSupportRequests;

  if (localStorage.getItem(STORAGE_KEYS.theme)) {
    document.body.classList.toggle('dark-mode', localStorage.getItem(STORAGE_KEYS.theme) === 'dark');
  }

  hydrateStorage();
  setupUI();
  bindEvents();
  renderAll();
  switchSection('home');
  openAuthModalIfNeeded();
}

function hydrateStorage() {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(appState.profile));
  localStorage.setItem(STORAGE_KEYS.luggage, JSON.stringify(appState.luggage));
  localStorage.setItem(STORAGE_KEYS.bookings, JSON.stringify(appState.bookings));
  localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(appState.notifications));
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(appState.settings));
  localStorage.setItem(STORAGE_KEYS.supportRequests, JSON.stringify(appState.supportRequests));
}

function setupUI() {
  const today = new Date();
  const dateInput = document.getElementById('pickupDate');
  const deliveryDateInput = document.getElementById('deliveryDate');
  if (dateInput) dateInput.value = formatDate(today);
  if (deliveryDateInput) deliveryDateInput.value = addDays(today, 2);

  const routeDeadline = document.getElementById('routeDeadline');
  if (routeDeadline) routeDeadline.value = addDays(today, 3);

  const costPickup = document.getElementById('costPickupCity');
  const costDestination = document.getElementById('costDestinationCity');
  if (costPickup && costDestination) {
    costDestination.value = 'Karachi';
  }

  populateProfileForm();
  populateSettingsForm();
  populateChatSuggestions();
  populateFAQ();
  updateThemeToggle();
  renderDashboard();
  renderBookings();
  renderLuggage();
  renderNotifications();
  renderReports();
  renderPartners();
  renderTracking('', true);
  renderDashboardAIRecommendation();
  renderCostEstimatorResult();
}

function bindEvents() {
  document.querySelectorAll('.nav-item[data-section]').forEach((button) => {
    button.addEventListener('click', () => switchSection(button.dataset.section));
  });

  document.querySelectorAll('[data-open-section]').forEach((button) => {
    button.addEventListener('click', () => switchSection(button.dataset.openSection));
  });

  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
  document.getElementById('bookingResetBtn').addEventListener('click', resetBookingForm);
  document.getElementById('trackingForm').addEventListener('submit', handleTrackingSubmit);
  document.getElementById('costEstimatorForm').addEventListener('submit', handleCostEstimateSubmit);
  document.getElementById('routeForm').addEventListener('submit', handleRouteOptimizationSubmit);
  document.getElementById('profileForm').addEventListener('submit', handleProfileSave);
  document.getElementById('settingsForm').addEventListener('submit', handleSettingsSave);
  document.getElementById('supportForm').addEventListener('submit', handleSupportSubmit);
  document.getElementById('feedbackForm').addEventListener('submit', handleFeedbackSubmit);
  document.getElementById('luggageForm').addEventListener('submit', handleLuggageSubmit);
  document.getElementById('openLuggageModalBtn').addEventListener('click', () => openModal('luggageModal'));
  document.getElementById('clearChatBtn').addEventListener('click', clearChat);
  document.getElementById('chatForm').addEventListener('submit', handleChatSubmit);
  document.getElementById('markAllReadBtn').addEventListener('click', markAllNotificationsRead);
  document.getElementById('logoutBtn').addEventListener('click', logoutUser);
  document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => togglePasswordView(btn.dataset.target));
  });

  document.getElementById('globalSearch').addEventListener('input', handleGlobalSearch);
  document.getElementById('notificationQuickBtn').addEventListener('click', () => switchSection('notifications'));

  document.querySelectorAll('.filter-pill').forEach((button) => {
    button.addEventListener('click', () => {
      appState.currentFilter = button.dataset.filter;
      document.querySelectorAll('.filter-pill').forEach((pill) => pill.classList.toggle('active', pill === button));
      renderBookings();
    });
  });

  document.querySelectorAll('.report-filter').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.report-filter').forEach((item) => item.classList.toggle('active', item === button));
      renderReports();
    });
  });

  document.querySelectorAll('.partner-filter').forEach((button) => {
    button.addEventListener('click', () => {
      appState.currentPartnerFilter = button.dataset.partnerFilter;
      document.querySelectorAll('.partner-filter').forEach((item) => item.classList.toggle('active', item === button));
      renderPartners();
    });
  });

  document.querySelectorAll('input[name="transportType"]').forEach((input) => {
    input.addEventListener('change', updateBookingEstimate);
  });

  const bookingFormInputFields = [
    'numberOfBags', 'weightPerBag', 'totalWeight', 'length', 'width', 'height', 'pickupCity', 'destinationCity'
  ];

  bookingFormInputFields.forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', updateBookingEstimate);
  });

  document.getElementById('profileEditBtn').addEventListener('click', () => {
    document.getElementById('profileFullName').focus();
    showToast('Profile edit enabled.');
  });

  document.getElementById('changePasswordBtn').addEventListener('click', () => {
    showToast('Password change simulation started.');
  });
}

function renderAll() {
  renderDashboard();
  renderBookings();
  renderLuggage();
  renderNotifications();
  renderReports();
  renderPartners();
  renderTracking('', true);
  renderDashboardAIRecommendation();
  renderCostEstimatorResult();
  populateProfileForm();
  populateSettingsForm();
}

function renderDashboard() {
  const totalLuggage = appState.luggage.length;
  const activeBookings = appState.bookings.filter((booking) => booking.status !== 'Delivered' && booking.status !== 'Cancelled').length;
  const delivered = appState.bookings.filter((booking) => booking.status === 'Delivered').length;
  const pending = appState.bookings.filter((booking) => booking.status === 'Pending').length;
  const totalCost = appState.bookings.reduce((sum, booking) => sum + Number(booking.cost || 0), 0);

  document.getElementById('totalLuggageStat').textContent = totalLuggage;
  document.getElementById('activeBookingsStat').textContent = activeBookings;
  document.getElementById('deliveredStat').textContent = delivered;
  document.getElementById('pendingStat').textContent = pending;
  document.getElementById('totalCostStat').textContent = `$${totalCost.toFixed(2)}`;

  const recentBookings = [...appState.bookings].slice(0, 4);
  const tableBody = document.getElementById('recentBookingsTable');
  tableBody.innerHTML = recentBookings.map((booking) => `
    <tr>
      <td>${booking.id}</td>
      <td>${booking.luggage}</td>
      <td>${booking.pickup}</td>
      <td>${booking.destination}</td>
      <td>${booking.deliveryDate}</td>
      <td>${booking.transportType}</td>
      <td><span class="status-badge ${toStatusClass(booking.status)}">${booking.status}</span></td>
      <td>$${Number(booking.cost).toFixed(2)}</td>
      <td><button class="small-btn" data-view-booking="${booking.id}">View</button></td>
    </tr>
  `).join('');

  tableBody.querySelectorAll('[data-view-booking]').forEach((button) => {
    button.addEventListener('click', () => {
      renderTracking(button.dataset.viewBooking, false);
      switchSection('tracking');
    });
  });

  const activeDelivery = appState.luggage.find((item) => item.status === 'In Transit' || item.status === 'Delayed') || appState.luggage[0];
  const deliveryProgress = activeDelivery.status === 'Delivered' ? 100 : activeDelivery.status === 'Delayed' ? 60 : 72;

  document.getElementById('activeDeliveryCard').innerHTML = `
    <div class="card">
      <div class="card-meta">
        <span>Luggage ID</span>
        <strong>${activeDelivery.id}</strong>
      </div>
      <div class="card-meta">
        <span>Current Location</span>
        <strong>${activeDelivery.currentLocation}</strong>
      </div>
      <div class="card-meta">
        <span>Destination</span>
        <strong>${activeDelivery.destination}</strong>
      </div>
      <div class="card-meta">
        <span>Estimated Arrival</span>
        <strong>${activeDelivery.deliveryDate}</strong>
      </div>
      <div class="progress-track" style="--progress:${deliveryProgress}%">
        <div class="progress-fill"></div>
      </div>
      <div class="card-meta">
        <span>Delivery Progress</span>
        <strong>${deliveryProgress}%</strong>
      </div>
      <div class="card-meta">
        <span>Status</span>
        <strong class="status-badge ${toStatusClass(activeDelivery.status)}">${activeDelivery.status}</strong>
      </div>
    </div>
  `;

  document.getElementById('headerBadge').textContent = appState.notifications.filter((n) => !n.read).length;
}

function renderDashboardAIRecommendation() {
  const recommendation = generateRecommendationForDashboard();
  document.getElementById('dashboardAIRecommendation').innerHTML = `
    <div class="ai-card">
      <div class="ai-tag"><i class="fa-solid fa-brain"></i> AI Recommendation</div>
      <h4>${recommendation.service}</h4>
      <p>${recommendation.reason}</p>
      <hr class="hr-divider" />
      <div class="action-group">
        <button class="btn btn-primary">Accept Recommendation</button>
        <button class="btn btn-secondary">View Alternatives</button>
      </div>
    </div>
  `;
}

function renderBookings() {
  const bookBody = document.getElementById('bookingsTableBody');
  const filtered = appState.bookings.filter((booking) => {
    if (appState.currentFilter === 'All') return true;
    return booking.status === appState.currentFilter;
  });

  bookBody.innerHTML = filtered.map((booking) => `
    <tr>
      <td>${booking.id}</td>
      <td>${booking.customer}</td>
      <td>${booking.luggage}</td>
      <td>${booking.pickup}</td>
      <td>${booking.destination}</td>
      <td>${booking.bookingDate}</td>
      <td>${booking.deliveryDate}</td>
      <td>$${Number(booking.cost).toFixed(2)}</td>
      <td><span class="status-badge ${toStatusClass(booking.status)}">${booking.status}</span></td>
      <td>
        <div class="action-group">
          <button class="small-btn" data-booking-action="view" data-booking-id="${booking.id}">View Details</button>
          <button class="small-btn" data-booking-action="track" data-booking-id="${booking.id}">Track</button>
          <button class="small-btn" data-booking-action="edit" data-booking-id="${booking.id}">Edit</button>
          <button class="small-btn" data-booking-action="cancel" data-booking-id="${booking.id}">Cancel</button>
          <button class="small-btn" data-booking-action="print" data-booking-id="${booking.id}">Print Receipt</button>
        </div>
      </td>
    </tr>
  `).join('');

  bookBody.querySelectorAll('[data-booking-action]').forEach((button) => {
    button.addEventListener('click', () => handleBookingAction(button.dataset.bookingAction, button.dataset.bookingId));
  });
}

function renderLuggage() {
  const grid = document.getElementById('luggageGrid');
  grid.innerHTML = appState.luggage.map((item) => `
    <div class="card">
      <h4>${item.id}</h4>
      <p><strong>Luggage Type:</strong> ${item.type}</p>
      <p><strong>Weight:</strong> ${item.weight} kg</p>
      <p><strong>Dimensions:</strong> ${item.dimensions}</p>
      <p><strong>Current Status:</strong> <span class="status-badge ${toStatusClass(item.status)}">${item.status}</span></p>
      <p><strong>Current Location:</strong> ${item.currentLocation}</p>
      <p><strong>Destination:</strong> ${item.destination}</p>
      <p><strong>Booking ID:</strong> ${item.bookingId}</p>
      <p><strong>Delivery Date:</strong> ${item.deliveryDate}</p>
      <div class="action-group">
        <button class="small-btn" data-luggage-action="view" data-luggage-id="${item.id}">View</button>
        <button class="small-btn" data-luggage-action="edit" data-luggage-id="${item.id}">Edit</button>
        <button class="small-btn" data-luggage-action="track" data-luggage-id="${item.id}">Track</button>
        <button class="small-btn" data-luggage-action="delete" data-luggage-id="${item.id}">Delete</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-luggage-action]').forEach((button) => {
    button.addEventListener('click', () => handleLuggageAction(button.dataset.luggageAction, button.dataset.luggageId));
  });
}

function renderNotifications() {
  const list = document.getElementById('notificationsList');
  list.innerHTML = appState.notifications.map((notification) => `
    <div class="notification-item ${notification.read ? '' : 'unread'}">
      <div class="notification-content">
        <strong>${notification.title}</strong>
        <span>${notification.message}</span>
        <small>${notification.time}</small>
      </div>
      <div class="notification-actions">
        <button class="small-btn" data-notification-action="read" data-notification-id="${notification.id}">${notification.read ? 'Read' : 'Mark Read'}</button>
        <button class="small-btn" data-notification-action="delete" data-notification-id="${notification.id}">Delete</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-notification-action]').forEach((button) => {
    button.addEventListener('click', () => handleNotificationAction(button.dataset.notificationAction, button.dataset.notificationId));
  });
}

function renderReports() {
  const statBadges = document.getElementById('reportStatBadges');
  const stats = [
    { label: 'Total Luggage Transported', value: appState.luggage.length },
    { label: 'Monthly Bookings', value: appState.bookings.length },
    { label: 'Delivery Success Rate', value: '98.5%' },
    { label: 'Transportation Revenue', value: `$${appState.bookings.reduce((sum, b) => sum + Number(b.cost), 0).toFixed(2)}` },
    { label: 'Average Delivery Time', value: '3.2 days' },
    { label: 'Cancelled Bookings', value: appState.bookings.filter((b) => b.status === 'Cancelled').length },
    { label: 'Delayed Deliveries', value: appState.luggage.filter((l) => l.status === 'Delayed').length },
    { label: 'Most Used Transportation Type', value: 'Standard' }
  ];

  statBadges.innerHTML = stats.map((stat) => `
    <div class="stat-badge">
      <p>${stat.label}</p>
      <strong>${stat.value}</strong>
    </div>
  `).join('');

  const monthlyData = [28, 34, 31, 40, 46, 52, 49, 58, 66, 62, 70, 76];
  const typesData = ['Economy', 'Standard', 'Express', 'Premium'];
  const typeValues = [12, 26, 18, 8];
  const destinationLabels = ['Islamabad', 'Karachi', 'Lahore', 'Peshawar', 'Multan'];
  const destinationValues = [22, 19, 17, 14, 10];

  const ctxMonthly = document.getElementById('monthlyChart');
  const ctxTypes = document.getElementById('typesChart');
  const ctxStatus = document.getElementById('statusChart');
  const ctxRevenue = document.getElementById('revenueChart');
  const ctxDestinations = document.getElementById('destinationsChart');

  if (appState.charts.monthly) appState.charts.monthly.destroy();
  if (appState.charts.types) appState.charts.types.destroy();
  if (appState.charts.status) appState.charts.status.destroy();
  if (appState.charts.revenue) appState.charts.revenue.destroy();
  if (appState.charts.destinations) appState.charts.destinations.destroy();

  appState.charts.monthly = new Chart(ctxMonthly, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{ label: 'Monthly Bookings', data: monthlyData, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.12)', fill: true }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  appState.charts.types = new Chart(ctxTypes, {
    type: 'bar',
    data: {
      labels: typesData,
      datasets: [{ label: 'Transportation Types', data: typeValues, backgroundColor: ['#4f46e5', '#7c3aed', '#0ea5e9', '#10b981'] }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  appState.charts.status = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['Delivered', 'In Transit', 'Pending'],
      datasets: [{ data: [58, 27, 15], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'] }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  appState.charts.revenue = new Chart(ctxRevenue, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{ label: 'Revenue', data: [1800, 2100, 2400, 2600, 3000, 3700], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)', fill: true }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  appState.charts.destinations = new Chart(ctxDestinations, {
    type: 'bar',
    data: {
      labels: destinationLabels,
      datasets: [{ label: 'Popular Destinations', data: destinationValues, backgroundColor: '#8b5cf6' }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderPartners() {
  const grid = document.getElementById('partnersGrid');
  const filtered = appState.currentPartnerFilter === 'All'
    ? samplePartners
    : samplePartners.filter((partner) => {
        if (appState.currentPartnerFilter === 'Cheapest') return partner.price === '$';
        if (appState.currentPartnerFilter === 'Fastest') return partner.speed === 'Fast';
        if (appState.currentPartnerFilter === 'Highest Rated') return partner.rating >= 4.8;
        if (appState.currentPartnerFilter === 'Available Now') return partner.availability === 'Available Now';
        return true;
      });

  grid.innerHTML = filtered.map((partner) => `
    <div class="card">
      <h4>${partner.name}</h4>
      <p><strong>Vehicle Type:</strong> ${partner.vehicle}</p>
      <p><strong>Service Area:</strong> ${partner.serviceArea}</p>
      <p><strong>Rating:</strong> ${partner.rating} / 5</p>
      <p><strong>Delivery Speed:</strong> ${partner.speed}</p>
      <p><strong>Price Level:</strong> ${partner.price}</p>
      <p><strong>Availability:</strong> ${partner.availability}</p>
    </div>
  `).join('');
}

function populateProfileForm() {
  const profile = appState.profile;
  document.getElementById('profileFullName').value = profile.fullName;
  document.getElementById('profileEmail').value = profile.email;
  document.getElementById('profilePhone').value = profile.phone;
  document.getElementById('profileAddress').value = profile.address;
  document.getElementById('profileCity').value = profile.city;
  document.getElementById('profileCountry').value = profile.country;
  document.getElementById('topUserName').textContent = profile.fullName;
  document.getElementById('avatarCircle').textContent = profile.avatarInitials || profile.fullName.substring(0, 2).toUpperCase();
  document.getElementById('profileAvatar').textContent = profile.avatarInitials || profile.fullName.substring(0, 2).toUpperCase();
}

function populateSettingsForm() {
  const settings = appState.settings;
  document.getElementById('languageSelect').value = settings.language;
  document.getElementById('currencySelect').value = settings.currency;
  document.getElementById('timezoneSelect').value = settings.timezone;
  document.getElementById('emailNotifications').checked = settings.emailNotifications;
  document.getElementById('smsNotifications').checked = settings.smsNotifications;
  document.getElementById('deliveryNotifications').checked = settings.deliveryNotifications;
  document.getElementById('aiRecommendations').checked = settings.aiRecommendations;
  document.getElementById('lightMode').checked = settings.lightMode;
  document.getElementById('darkMode').checked = settings.darkMode;
  document.getElementById('compactMode').checked = settings.compactMode;
}

function populateChatSuggestions() {
  const suggestions = [
    'How can I book luggage transportation?',
    'How much will my luggage cost?',
    'Where is my luggage?',
    'How long will delivery take?',
    'Which transportation method is best?'
  ];

  document.getElementById('chatSuggestions').innerHTML = suggestions.map((question) => `
    <button type="button" class="suggested-question" data-chat-question="${question}">${question}</button>
  `).join('');

  document.querySelectorAll('[data-chat-question]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById('chatInput');
      input.value = button.dataset.chatQuestion;
      input.focus();
    });
  });
}

function populateFAQ() {
  const faqList = document.getElementById('faqList');
  faqList.innerHTML = sampleSupport.map((item) => `
    <div class="faq-item">
      <strong>${item.question}</strong>
      <p>${item.answer}</p>
    </div>
  `).join('');
}

function switchSection(section) {
  appState.currentSection = section;
  const sectionsToShow = section === 'home' ? ['homeSection', 'dashboardSection'] : [`${section}Section`];

  document.querySelectorAll('.page-section').forEach((sectionEl) => {
    sectionEl.classList.toggle('active', sectionsToShow.includes(sectionEl.id));
  });

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.section === section);
  });

  const pageTitle = {
    home: 'Dashboard',
    booking: 'Book Luggage',
    luggage: 'My Luggage',
    bookings: 'My Bookings',
    tracking: 'Track Luggage',
    assistant: 'AI Assistant',
    cost: 'Cost Estimator',
    routes: 'Delivery Routes',
    notifications: 'Notifications',
    reports: 'Reports',
    partners: 'Partners',
    profile: 'Profile',
    settings: 'Settings',
    support: 'Help & Support'
  };

  document.getElementById('pageTitle').textContent = pageTitle[section] || 'Dashboard';
  document.getElementById('sidebar').classList.remove('open');
}

function handleBookingSubmit(event) {
  event.preventDefault();

  const form = event.target;
  if (!form.reportValidity()) return;

  const booking = {
    id: `BK-2026-${String(appState.bookings.length + 1).padStart(3, '0')}`,
    customer: document.getElementById('customerFullName').value,
    luggage: `LUG-${String(appState.luggage.length + 10001).slice(-5)}`,
    pickup: document.getElementById('pickupCity').value,
    destination: document.getElementById('destinationCity').value,
    bookingDate: formatDate(new Date()),
    deliveryDate: document.getElementById('deliveryDate').value,
    cost: Number(document.getElementById('bookingEstimatePrice').textContent.replace(/[^0-9.]/g, '') || 0),
    status: 'Pending',
    transportType: document.querySelector('input[name="transportType"]:checked')?.value || 'Standard'
  };

  appState.bookings.unshift(booking);
  appState.luggage.unshift({
    id: booking.luggage,
    type: document.getElementById('luggageType').value,
    weight: Number(document.getElementById('totalWeight').value),
    dimensions: `${document.getElementById('length').value}x${document.getElementById('width').value}x${document.getElementById('height').value} cm`,
    status: 'Ready for Pickup',
    currentLocation: document.getElementById('pickupCity').value,
    destination: document.getElementById('destinationCity').value,
    bookingId: booking.id,
    deliveryDate: booking.deliveryDate
  });

  appState.notifications.unshift({
    id: Date.now(),
    title: 'Booking confirmed',
    message: `Your booking ${booking.id} has been created successfully.`,
    time: 'Just now',
    read: false
  });

  localStorage.setItem(STORAGE_KEYS.bookings, JSON.stringify(appState.bookings));
  localStorage.setItem(STORAGE_KEYS.luggage, JSON.stringify(appState.luggage));
  localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(appState.notifications));

  renderAll();
  form.reset();
  showToast('Booking created successfully.');
}

function handleTrackingSubmit(event) {
  event.preventDefault();
  const query = document.getElementById('trackingInput').value.trim();
  renderTracking(query, false);
}

function renderTracking(query, initial) {
  const resultContainer = document.getElementById('trackingResult');
  const luggageMatch = appState.luggage.find((item) => item.id.toLowerCase() === query.toLowerCase());

  if (!query && initial) {
    resultContainer.innerHTML = `
      <div class="card">
        <h4>Tracking Information</h4>
        <p>Enter a luggage ID to see the tracking details.</p>
      </div>
    `;
    resultContainer.classList.add('visible');
    return;
  }

  if (!luggageMatch) {
    resultContainer.innerHTML = `
      <div class="card">
        <h4>No matching luggage found</h4>
        <p>Please enter a valid tracking number.</p>
      </div>
    `;
    resultContainer.classList.add('visible');
    return;
  }

  const bookingMatch = appState.bookings.find((book) => book.luggage === luggageMatch.id) || {};
  const statusOrder = ['Booking Confirmed', 'Luggage Picked Up', 'Processing Center', 'In Transit', 'Out for Delivery', 'Delivered'];
  const currentIndex = statusOrder.indexOf(luggageMatch.status === 'Ready for Pickup' ? 'Booking Confirmed' : luggageMatch.status);

  resultContainer.innerHTML = `
    <div class="card">
      <h4>Tracking Information</h4>
      <div class="result-grid">
        <div class="stat-badge"><p>Booking ID</p><strong>${bookingMatch.id || 'N/A'}</strong></div>
        <div class="stat-badge"><p>Luggage ID</p><strong>${luggageMatch.id}</strong></div>
        <div class="stat-badge"><p>Pickup Location</p><strong>${bookingMatch.pickup || luggageMatch.currentLocation}</strong></div>
        <div class="stat-badge"><p>Destination</p><strong>${luggageMatch.destination}</strong></div>
        <div class="stat-badge"><p>Current Location</p><strong>${luggageMatch.currentLocation}</strong></div>
        <div class="stat-badge"><p>Transport Type</p><strong>${bookingMatch.transportType || 'Standard'}</strong></div>
        <div class="stat-badge"><p>Expected Delivery</p><strong>${luggageMatch.deliveryDate}</strong></div>
        <div class="stat-badge"><p>Current Status</p><strong>${luggageMatch.status}</strong></div>
      </div>
      <div class="timeline">
        ${statusOrder.map((phase, idx) => {
          const completed = idx <= currentIndex || (luggageMatch.status === 'Delivered' && idx <= 5);
          const current = idx === currentIndex;
          return `
            <div class="timeline-item ${completed ? 'completed' : ''} ${current ? 'current' : ''}">
              <span class="timeline-dot"></span>
              <div class="timeline-text">
                <strong>${phase}</strong>
                <small>${idx === 0 ? 'Booked' : idx === 1 ? 'Collected' : idx === 2 ? 'Processed' : idx === 3 ? 'On the move' : idx === 4 ? 'Out for delivery' : 'Delivered'}</small>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  resultContainer.classList.add('visible');
  showToast('Tracking information loaded.');
}

function handleCostEstimateSubmit(event) {
  event.preventDefault();
  renderCostEstimatorResult();
}

function renderCostEstimatorResult() {
  const weight = Number(document.getElementById('costWeight').value || 0);
  const items = Number(document.getElementById('costItemCount').value || 1);
  const distance = Number(document.getElementById('costDistance').value || 0);
  const transportType = document.getElementById('costTransportType').value;
  const fragile = document.getElementById('costFragile').checked;
  const express = document.getElementById('costExpress').checked;

  const baseRate = transportType === 'Economy' ? 0.18 : transportType === 'Standard' ? 0.24 : transportType === 'Express' ? 0.32 : 0.4;
  const baseTransport = distance * baseRate;
  const weightCharges = weight * 0.9 * items;
  const distanceCharges = distance * 0.11;
  const fragileFee = fragile ? 18 : 0;
  const expressFee = express ? 24 : 0;
  const serviceCharges = 12;
  const total = baseTransport + weightCharges + distanceCharges + fragileFee + expressFee + serviceCharges;

  const recommendedTransport = transportType === 'Economy' ? 'Economy' : transportType;
  const estimatedTime = express ? '1-2 days' : transportType === 'Premium' ? '2 days' : transportType === 'Express' ? '2-3 days' : '3-5 days';
  const carbonFootprint = (distance * 0.12 + weight * 0.08).toFixed(2);

  document.getElementById('costResult').innerHTML = `
    <div class="result-grid">
      <div class="stat-badge"><p>Estimated Transportation Cost</p><strong>$${total.toFixed(2)}</strong></div>
      <div class="stat-badge"><p>Estimated Delivery Time</p><strong>${estimatedTime}</strong></div>
      <div class="stat-badge"><p>Recommended Transportation</p><strong>${recommendedTransport}</strong></div>
      <div class="stat-badge"><p>Estimated Carbon Footprint</p><strong>${carbonFootprint} kg CO2</strong></div>
    </div>
  `;
}

function handleRouteOptimizationSubmit(event) {
  event.preventDefault();
  const pickup = document.getElementById('routePickup').value;
  const destination = document.getElementById('routeDestination').value;
  const priority = document.getElementById('routePriority').value;
  const weight = Number(document.getElementById('routeWeight').value || 0);
  const route = priority === 'Critical' ? `${pickup} → Lahore → Multan → ${destination}` : `${pickup} → Lahore → ${destination}`;
  const distance = weight > 15 ? 980 : 720;
  const estimatedCost = weight > 15 ? 210 : 160;
  const estimatedTime = priority === 'Urgent' ? '2 days' : priority === 'Critical' ? '1.5 days' : '3 days';
  const traffic = priority === 'Critical' ? 'Heavy congestion expected' : 'Moderate traffic';
  const efficiency = weight > 15 ? '86%' : '92%';

  document.getElementById('routeResult').innerHTML = `
    <div class="result-grid">
      <div class="stat-badge"><p>Recommended Route</p><strong>${route}</strong></div>
      <div class="stat-badge"><p>Estimated Distance</p><strong>${distance} km</strong></div>
      <div class="stat-badge"><p>Estimated Delivery Time</p><strong>${estimatedTime}</strong></div>
      <div class="stat-badge"><p>Estimated Cost</p><strong>$${estimatedCost}</strong></div>
      <div class="stat-badge"><p>Traffic Condition</p><strong>${traffic}</strong></div>
      <div class="stat-badge"><p>Route Efficiency</p><strong>${efficiency}</strong></div>
    </div>
  `;

  showToast('AI route optimized successfully.');
}

function handleProfileSave(event) {
  event.preventDefault();
  appState.profile = {
    fullName: document.getElementById('profileFullName').value,
    email: document.getElementById('profileEmail').value,
    phone: document.getElementById('profilePhone').value,
    address: document.getElementById('profileAddress').value,
    city: document.getElementById('profileCity').value,
    country: document.getElementById('profileCountry').value,
    avatarInitials: makeInitials(document.getElementById('profileFullName').value)
  };

  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(appState.profile));
  populateProfileForm();
  showToast('Profile updated.');
}

function handleSettingsSave(event) {
  event.preventDefault();
  appState.settings = {
    language: document.getElementById('languageSelect').value,
    currency: document.getElementById('currencySelect').value,
    timezone: document.getElementById('timezoneSelect').value,
    emailNotifications: document.getElementById('emailNotifications').checked,
    smsNotifications: document.getElementById('smsNotifications').checked,
    deliveryNotifications: document.getElementById('deliveryNotifications').checked,
    aiRecommendations: document.getElementById('aiRecommendations').checked,
    lightMode: document.getElementById('lightMode').checked,
    darkMode: document.getElementById('darkMode').checked,
    compactMode: document.getElementById('compactMode').checked,
    themePreference: document.getElementById('darkMode').checked ? 'dark' : 'light'
  };

  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(appState.settings));
  updateThemeToggle();
  document.body.classList.toggle('dark-mode', appState.settings.darkMode);
  localStorage.setItem(STORAGE_KEYS.theme, appState.settings.darkMode ? 'dark' : 'light');
  showToast('Settings saved.');
}

function handleSupportSubmit(event) {
  event.preventDefault();
  const request = {
    name: document.getElementById('supportName').value,
    email: document.getElementById('supportEmail').value,
    bookingId: document.getElementById('supportBookingId').value,
    issueType: document.getElementById('supportIssueType').value,
    message: document.getElementById('supportMessage').value
  };

  appState.supportRequests.push(request);
  localStorage.setItem(STORAGE_KEYS.supportRequests, JSON.stringify(appState.supportRequests));
  event.target.reset();
  showToast('Support request submitted successfully.');
}

function handleFeedbackSubmit(event) {
  event.preventDefault();
  const value = document.getElementById('feedbackInput').value.trim();
  if (!value) return;

  appState.feedback = value;
  localStorage.setItem(STORAGE_KEYS.feedback, JSON.stringify(value));
  event.target.reset();
  showToast('Feedback sent successfully.');
}

function handleLuggageSubmit(event) {
  event.preventDefault();
  const item = {
    id: `LUG-${String(appState.luggage.length + 10001)}`,
    type: document.getElementById('newLuggageType').value,
    weight: Number(document.getElementById('newLuggageWeight').value),
    dimensions: document.getElementById('newLuggageDimensions').value,
    status: document.getElementById('newLuggageStatus').value,
    currentLocation: document.getElementById('newLuggageCurrentLocation').value,
    destination: document.getElementById('newLuggageDestination').value,
    bookingId: document.getElementById('newLuggageBookingId').value,
    deliveryDate: document.getElementById('newLuggageDeliveryDate').value
  };

  appState.luggage.unshift(item);
  localStorage.setItem(STORAGE_KEYS.luggage, JSON.stringify(appState.luggage));
  closeModal('luggageModal');
  event.target.reset();
  renderLuggage();
  renderDashboard();
  showToast('Luggage added successfully.');
}

function handleLuggageAction(action, id) {
  if (action === 'delete') {
    appState.luggage = appState.luggage.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.luggage, JSON.stringify(appState.luggage));
    renderLuggage();
    renderDashboard();
    showToast('Luggage deleted.');
    return;
  }

  if (action === 'track') {
    document.getElementById('trackingInput').value = id;
    renderTracking(id, false);
    switchSection('tracking');
    return;
  }

  showToast(`Luggage ${action} action simulated.`);
}

function handleBookingAction(action, id) {
  const booking = appState.bookings.find((item) => item.id === id);
  if (!booking) return;

  if (action === 'cancel') {
    booking.status = 'Cancelled';
    localStorage.setItem(STORAGE_KEYS.bookings, JSON.stringify(appState.bookings));
    renderBookings();
    renderDashboard();
    showToast('Booking cancelled.');
    return;
  }

  if (action === 'track') {
    const luggageId = booking.luggage;
    document.getElementById('trackingInput').value = luggageId;
    renderTracking(luggageId, false);
    switchSection('tracking');
    return;
  }

  if (action === 'print') {
    window.print();
    return;
  }

  showToast(`Booking ${action} action simulated.`);
}

function handleNotificationAction(action, id) {
  if (action === 'delete') {
    appState.notifications = appState.notifications.filter((item) => item.id !== Number(id));
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(appState.notifications));
    renderNotifications();
    return;
  }

  if (action === 'read') {
    const item = appState.notifications.find((n) => n.id === Number(id));
    if (item) item.read = true;
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(appState.notifications));
    renderNotifications();
    renderDashboard();
  }
}

function markAllNotificationsRead() {
  appState.notifications = appState.notifications.map((item) => ({ ...item, read: true }));
  localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(appState.notifications));
  renderNotifications();
  renderDashboard();
  showToast('All notifications marked as read.');
}

function handleGlobalSearch(event) {
  const value = event.target.value.toLowerCase();
  if (!value) {
    renderBookings();
    return;
  }

  const filtered = appState.bookings.filter((booking) => {
    return [booking.id, booking.luggage, booking.destination, booking.customer, booking.status]
      .join(' ')
      .toLowerCase()
      .includes(value);
  });

  const bookBody = document.getElementById('bookingsTableBody');
  bookBody.innerHTML = filtered.map((booking) => `
    <tr>
      <td>${booking.id}</td>
      <td>${booking.customer}</td>
      <td>${booking.luggage}</td>
      <td>${booking.pickup}</td>
      <td>${booking.destination}</td>
      <td>${booking.bookingDate}</td>
      <td>${booking.deliveryDate}</td>
      <td>$${Number(booking.cost).toFixed(2)}</td>
      <td><span class="status-badge ${toStatusClass(booking.status)}">${booking.status}</span></td>
      <td>
        <div class="action-group">
          <button class="small-btn" data-booking-action="view" data-booking-id="${booking.id}">View Details</button>
        </div>
      </td>
    </tr>
  `).join('');

  bookBody.querySelectorAll('[data-booking-action]').forEach((button) => {
    button.addEventListener('click', () => handleBookingAction('track', button.dataset.bookingId));
  });
}

function updateBookingEstimate() {
  const weight = Number(document.getElementById('totalWeight').value || 0);
  const transportType = document.querySelector('input[name="transportType"]:checked')?.value || 'Standard';
  const numberOfBags = Number(document.getElementById('numberOfBags').value || 1);
  const isFragile = document.getElementById('isFragile').checked;
  const isSpecialHandling = document.getElementById('specialHandling').checked;

  let base = 0;
  if (transportType === 'Economy') base = 18;
  else if (transportType === 'Standard') base = 26;
  else if (transportType === 'Express') base = 38;
  else if (transportType === 'Premium') base = 52;

  const weightCharge = weight * 1.15;
  const fragileFee = isFragile ? 18 : 0;
  const specialHandlingFee = isSpecialHandling ? 12 : 0;
  const total = base + weightCharge + fragileFee + specialHandlingFee + (numberOfBags * 6);

  document.getElementById('bookingEstimatePrice').textContent = `$${total.toFixed(2)}`;
  document.getElementById('bookingEstimateTime').textContent = transportType === 'Express' ? '1-2 days' : transportType === 'Premium' ? '2 days' : '3-4 days';
  document.getElementById('bookingEstimateFeatures').textContent = `${transportType} • ${isFragile ? 'Fragile Handling' : 'Standard Care'}`;
}

function resetBookingForm() {
  document.getElementById('bookingForm').reset();
  document.getElementById('pickupDate').value = formatDate(new Date());
  document.getElementById('deliveryDate').value = addDays(new Date(), 2);
  updateBookingEstimate();
}

function openAuthModalIfNeeded() {
  const auth = JSON.parse(localStorage.getItem(STORAGE_KEYS.auth) || '{}');
  if (!auth.loggedIn) {
    openModal('authModal');
  }
}

authModalLogic();

function authModalLogic() {
  const authTabs = document.querySelectorAll('.auth-tab');
  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      authTabs.forEach((t) => t.classList.toggle('active', t === tab));
      const target = tab.dataset.authTab;
      document.getElementById('loginPanel').classList.toggle('active', target === 'login');
      document.getElementById('registerPanel').classList.toggle('active', target === 'register');
    });
  });
}

function handleLogin(event) {
  event.preventDefault();
  const auth = { loggedIn: true };
  localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(auth));
  closeModal('authModal');
  showToast('Login demo successful.');
}

function handleRegister(event) {
  event.preventDefault();
  const auth = { loggedIn: true };
  localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(auth));
  closeModal('authModal');
  showToast('Registration demo successful.');
}

function logoutUser() {
  localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify({ loggedIn: false }));
  openModal('authModal');
  showToast('Logged out.');
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  appState.settings.darkMode = isDark;
  localStorage.setItem(STORAGE_KEYS.theme, isDark ? 'dark' : 'light');
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(appState.settings));
  updateThemeToggle();
}

function updateThemeToggle() {
  const themeIcon = document.querySelector('#themeToggle i');
  if (!themeIcon) return;
  themeIcon.className = document.body.classList.contains('dark-mode') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function togglePasswordView(targetId) {
  const input = document.getElementById(targetId);
  const button = document.querySelector(`[data-target="${targetId}"]`);
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  button.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
}

function clearChat() {
  document.getElementById('chatBox').innerHTML = '';
  appState.chatHistory = [];
  showToast('Chat cleared.');
}

function handleChatSubmit(event) {
  event.preventDefault();
  const input = document.getElementById('chatInput');
  const value = input.value.trim();
  if (!value) return;

  appendChatMessage('user', value);
  input.value = '';

  const response = generateAIChatResponse(value);
  setTimeout(() => appendChatMessage('ai', response), 400);
}

function appendChatMessage(sender, message) {
  const chatBox = document.getElementById('chatBox');
  const row = document.createElement('div');
  row.classList.add('chat-message', sender);
  row.innerHTML = `<div class="chat-bubble">${message}</div>`;
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function generateAIChatResponse(query) {
  const lower = query.toLowerCase();

  if (lower.includes('book')) return 'You can book luggage transportation by opening the Book Luggage section, filling the booking form, and submitting it. The system will create a demo booking and AI recommendation.';
  if (lower.includes('cost') || lower.includes('price')) return 'Use the Cost Estimator page to get an estimate. The total is based on distance, weight, transportation type, and special handling.';
  if (lower.includes('where is my luggage') || lower.includes('where is')) return 'Use the Track Luggage section and enter your luggage ID or tracking number to see current location and progress.';
  if (lower.includes('how long') || lower.includes('delivery take')) return 'Estimated delivery time depends on your chosen transport type, distance, and route conditions. The AI estimator can give you a quick estimate.';
  if (lower.includes('which transportation method') || lower.includes('best')) return 'For moderate weight and regular deadlines, Standard is usually best. For urgent shipments, choose Express.';
  if (lower.includes('restricted') || lower.includes('prohibited')) return 'Fragile, high-value, or hazardous items should be declared in the booking form for special handling.';
  if (lower.includes('track')) return 'Open Track Luggage, enter your LUG ID, and the app will display your current status, location, and timeline.';

  return 'I can help with booking, costs, tracking, recommendations, and route planning for your luggage.';
}

function toStatusClass(status) {
  const map = {
    Pending: 'pending',
    Confirmed: 'confirmed',
    'In Transit': 'in-transit',
    Delivered: 'delivered',
    Cancelled: 'cancelled',
    'Ready for Pickup': 'confirmed',
    Delayed: 'pending'
  };

  return map[status] || 'pending';
}

function generateRecommendationForDashboard() {
  const totalWeight = appState.luggage.reduce((sum, item) => sum + item.weight, 0);
  const activeBookings = appState.bookings.filter((b) => b.status !== 'Delivered' && b.status !== 'Cancelled').length;

  const service = activeBookings > 2 ? 'Express' : 'Standard';
  const reason = totalWeight > 20
    ? 'Your luggage load is higher than usual, so Express transportation is recommended for faster handling and reduced risk of delays.'
    : 'Your luggage weight is moderate and delivery is not urgent, so Standard transportation provides the best balance between cost and time.';

  return { service, reason };
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2500);
}

function makeInitials(value) {
  return value.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return formatDate(result);
}

function validateEmail(value) {
  return /\S+@\S+\.\S+/.test(value);
}

init();
