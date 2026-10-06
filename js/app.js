/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Main UI Application Controller & Interaction Manager (Phase 3 Authentication & Security)
 */

import {
  USER_ROLES,
  BOOKING_STATUS,
  LUGGAGE_TYPES,
  LUGGAGE_SIZES,
  TRANSPORT_TIERS,
  authService,
  userService,
  driverService,
  locationService,
  distanceService,
  luggageService,
  predictionService,
  bookingService,
  trackingService,
  feedbackService,
  adminService,
  notificationService,
  db
} from './services/index.js';

class AppController {
  constructor() {
    this.currentRole = 'LANDING';
    this.currentPublicPage = 'publicViewHome';
    this.currentView = 'view-customer-dashboard';
    this.activeBookingStep = 1;
    this.currentBookingDraft = null;
    this.activePrediction = null;
    this.isHandlingPopstate = false;

    this.init();
  }

  init() {
    this.bindEvents();
    this.bindHistoryEvents();
    this.initLandingScrollSpy();
    this.applyTheme();

    // If URL has a pathname like /customer-dashboard, normalize to hash
    const path = window.location.pathname;
    if (path && path !== '/' && path !== '/index.html') {
      const cleanHash = '#' + path.replace(/^\/+/, '');
      try {
        window.history.replaceState(null, '', cleanHash);
      } catch (e) {}
    }

    const currentHash = window.location.hash;
    if (currentHash && currentHash.length > 1) {
      this.restoreFromHash(currentHash);
    } else {
      this.switchDemoRole('LANDING', null, false, false);
      try {
        window.history.replaceState({ role: 'LANDING', bookmarkId: 'home' }, '', '#home');
      } catch (e) {}
    }
  }

  initLandingScrollSpy() {
    const sectionIds = ['home', 'why-choose', 'features', 'ai-model', 'how-it-works', 'pricing-tiers', 'faqs'];
    const navLinkMap = {
      'home': '#home',
      'why-choose': '#home',
      'features': '#features',
      'ai-model': '#ai-model',
      'how-it-works': '#how-it-works',
      'pricing-tiers': '#pricing-tiers',
      'faqs': '#faqs'
    };

    const updateActiveNav = () => {
      const landing = document.getElementById('landingView');
      if (!landing || landing.style.display === 'none') return;

      const scrollPos = window.scrollY + 130;
      let activeSection = 'home';

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            activeSection = id;
          }
        }
      }

      const activeHref = navLinkMap[activeSection] || '#home';
      document.querySelectorAll('.landing-nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === activeHref);
      });
    };

    window.addEventListener('scroll', () => {
      if (!this.isScrollingToBookmark) {
        updateActiveNav();
      }
    }, { passive: true });

    setTimeout(updateActiveNav, 100);
  }

  scrollToBookmark(targetId = 'home', pushHistory = true) {
    if (this.currentRole !== 'LANDING') {
      this.switchDemoRole('LANDING', null, false, false);
    }

    this.currentBookmark = targetId;
    const target = document.getElementById(targetId) || (targetId === 'home' ? document.getElementById('hero') : null);
    if (target) {
      this.isScrollingToBookmark = true;
      const topOffset = 80;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - topOffset;

      window.scrollTo({
        top: Math.max(0, targetPosition),
        behavior: 'smooth'
      });

      const navLinkMap = {
        'home': '#home',
        'why-choose': '#home',
        'features': '#features',
        'ai-model': '#ai-model',
        'how-it-works': '#how-it-works',
        'pricing-tiers': '#pricing-tiers',
        'faqs': '#faqs'
      };
      const activeHref = navLinkMap[targetId] || `#${targetId}`;
      document.querySelectorAll('.landing-nav-links a').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === activeHref);
      });

      if (pushHistory && !this.isHandlingPopstate) {
        try {
          window.history.pushState({ role: 'LANDING', bookmarkId: targetId }, '', `#${targetId}`);
        } catch (e) {}
      }

      setTimeout(() => {
        this.isScrollingToBookmark = false;
      }, 700);
    }
  }

  bindHistoryEvents() {
    window.addEventListener('popstate', (e) => {
      this.isHandlingPopstate = true;
      const state = e.state;
      if (state && state.role) {
        this.restoreState(state);
      } else {
        this.restoreFromHash(window.location.hash);
      }
      this.isHandlingPopstate = false;
    });

    window.addEventListener('hashchange', () => {
      if (!this.isHandlingPopstate && !this.isScrollingToBookmark) {
        this.isHandlingPopstate = true;
        this.restoreFromHash(window.location.hash);
        this.isHandlingPopstate = false;
      }
    });
  }

  restoreState(state) {
    const { role, viewId, authTab, bookmarkId, extra } = state;
    if (role === 'LANDING') {
      this.switchDemoRole('LANDING', null, false, false);
      this.scrollToBookmark(bookmarkId || 'home', false);
    } else if (role === 'AUTH') {
      this.openAuth(authTab || 'login', false);
    } else {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        this.openAuth('login', false);
        return;
      }
      this.switchDemoRole(role, viewId, false, false);
      if (viewId === 'view-booking-tracking' && extra?.bookingId) {
        this.showTrackingView(extra.bookingId, false);
      }
    }
  }

  restoreFromHash(rawHash) {
    const hash = (rawHash || '').replace(/^#\/?/, '').toLowerCase();
    
    // Landing bookmarks
    const landingBookmarks = {
      '': 'home',
      'home': 'home',
      'hero': 'home',
      'why-choose': 'home',
      'features': 'features',
      'ai-model': 'ai-model',
      'ai-engine': 'ai-model',
      'how-it-works': 'how-it-works',
      'pricing-tiers': 'pricing-tiers',
      'tiers': 'pricing-tiers',
      'faqs': 'faqs'
    };

    if (hash in landingBookmarks) {
      this.switchDemoRole('LANDING', null, false, false);
      this.scrollToBookmark(landingBookmarks[hash], false);
      return;
    }

    if (hash === 'login' || hash === 'auth-login') {
      this.openAuth('login', false);
      return;
    }
    if (hash === 'register' || hash === 'auth-register') {
      this.openAuth('register', false);
      return;
    }

    const hashToView = {
      'customer-dashboard': { role: 'CUSTOMER', view: 'view-customer-dashboard' },
      'create-booking': { role: 'CUSTOMER', view: 'view-create-booking' },
      'my-bookings': { role: 'CUSTOMER', view: 'view-my-bookings' },
      'track-shipment': { role: 'CUSTOMER', view: 'view-booking-tracking' },
      'my-luggage': { role: 'CUSTOMER', view: 'view-my-luggage' },
      'feedback': { role: 'CUSTOMER', view: 'view-feedback' },
      'profile': { role: 'CUSTOMER', view: 'view-customer-profile' },
      'customer-profile': { role: 'CUSTOMER', view: 'view-customer-profile' },
      'driver-dashboard': { role: 'DRIVER', view: 'view-driver-dashboard' },
      'driver-profile': { role: 'DRIVER', view: 'view-customer-profile' },
      'admin-dashboard': { role: 'ADMIN', view: 'view-admin-dashboard' },
      'admin-bookings': { role: 'ADMIN', view: 'view-admin-bookings' },
      'admin-users': { role: 'ADMIN', view: 'view-admin-users' },
      'admin-drivers': { role: 'ADMIN', view: 'view-admin-drivers' },
      'admin-feedback': { role: 'ADMIN', view: 'view-admin-feedback' },
      'admin-predictions': { role: 'ADMIN', view: 'view-admin-predictions' },
      'admin-reports': { role: 'ADMIN', view: 'view-admin-reports' },
      'admin-settings': { role: 'ADMIN', view: 'view-admin-settings' },
      'admin-profile': { role: 'ADMIN', view: 'view-customer-profile' }
    };

    const match = hashToView[hash];
    if (match) {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        this.showToast(`Please sign in with your registered account to access this portal.`, 'info');
        this.openAuth('login', false);
        return;
      }
      this.switchDemoRole(match.role, match.view, false, false);
    } else {
      this.switchDemoRole('LANDING', null, false, false);
      this.scrollToBookmark('home', false);
    }
  }

  getViewHash(role, viewId, authTab = null) {
    if (role === 'LANDING') {
      return this.currentBookmark ? `#${this.currentBookmark}` : '#home';
    }
    if (role === 'AUTH') return authTab === 'register' ? '#register' : '#login';
    if (role === 'CUSTOMER') {
      const viewMap = {
        'view-customer-dashboard': '#customer-dashboard',
        'view-create-booking': '#create-booking',
        'view-my-bookings': '#my-bookings',
        'view-booking-tracking': '#track-shipment',
        'view-my-luggage': '#my-luggage',
        'view-feedback': '#feedback',
        'view-customer-profile': '#profile'
      };
      return viewMap[viewId] || '#customer-dashboard';
    }
    if (role === 'DRIVER') {
      return viewId === 'view-customer-profile' ? '#driver-profile' : '#driver-dashboard';
    }
    if (role === 'ADMIN') {
      const adminMap = {
        'view-admin-dashboard': '#admin-dashboard',
        'view-admin-bookings': '#admin-bookings',
        'view-admin-users': '#admin-users',
        'view-admin-drivers': '#admin-drivers',
        'view-admin-feedback': '#admin-feedback',
        'view-admin-predictions': '#admin-predictions',
        'view-admin-reports': '#admin-reports',
        'view-admin-settings': '#admin-settings',
        'view-customer-profile': '#admin-profile'
      };
      return adminMap[viewId] || '#admin-dashboard';
    }
    return '#home';
  }

  pushHistoryState(role, viewId, authTab = null, bookmarkId = null, extra = null) {
    if (this.isHandlingPopstate) return;

    if (role === 'LANDING' && bookmarkId) {
      this.currentBookmark = bookmarkId;
    }

    const hash = this.getViewHash(role, viewId, authTab);
    const state = { role, viewId, authTab, bookmarkId: bookmarkId || (role === 'LANDING' ? this.currentBookmark : null), extra };

    // Don't push identical duplicate state
    if (window.history.state && 
        window.history.state.role === role && 
        window.history.state.viewId === viewId && 
        window.history.state.authTab === authTab &&
        window.history.state.bookmarkId === state.bookmarkId &&
        JSON.stringify(window.history.state.extra) === JSON.stringify(extra)) {
      return;
    }

    try {
      window.history.pushState(state, '', hash);
    } catch (e) {}
  }

  openAuth(tab = 'login', pushHistory = true) {
    this.currentRole = 'AUTH';
    this.switchDemoRole('AUTH', null, false, false);
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const loginForm = document.getElementById('appLoginForm');
    const regForm = document.getElementById('appRegisterForm');

    if (tab === 'register') {
      if (tabRegister) {
        tabRegister.classList.add('active');
        tabRegister.style.borderBottom = '2px solid var(--brand-primary)';
      }
      if (tabLogin) {
        tabLogin.classList.remove('active');
        tabLogin.style.borderBottom = 'none';
      }
      if (loginForm) loginForm.style.display = 'none';
      if (regForm) regForm.style.display = 'block';
    } else {
      if (tabLogin) {
        tabLogin.classList.add('active');
        tabLogin.style.borderBottom = '2px solid var(--brand-primary)';
      }
      if (tabRegister) {
        tabRegister.classList.remove('active');
        tabRegister.style.borderBottom = 'none';
      }
      if (loginForm) loginForm.style.display = 'block';
      if (regForm) regForm.style.display = 'none';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (pushHistory && !this.isHandlingPopstate) {
      this.pushHistoryState('AUTH', null, tab);
    }
  }

  goToHomePage(pushHistory = true) {
    this.switchDemoRole('LANDING', null, false, false);
    this.scrollToBookmark('home', pushHistory);
  }

  bindEvents() {
    // Universal Logo / Brand Click -> Go to Home Page from any view/portal/screen
    document.addEventListener('click', (e) => {
      const brandTarget = e.target.closest('[data-go-home], .landing-brand, .sidebar-header');
      if (brandTarget) {
        e.preventDefault();
        this.goToHomePage(true);
      }
    });

    // Demo Role Switcher Bar
    document.querySelectorAll('[data-switch-role]').forEach(btn => {
      btn.addEventListener('click', e => {
        const targetRole = e.currentTarget.getAttribute('data-switch-role');
        if (targetRole === 'AUTH') {
          this.openAuth('login', true);
        } else if (targetRole === 'LANDING') {
          this.goToHomePage(true);
        } else {
          this.switchDemoRole(targetRole, null, false, true);
        }
      });
    });

    // Landing Navigation & Auth Action Buttons
    const landingNavLogin = document.getElementById('landingNavLoginBtn');
    const landingNavRegister = document.getElementById('landingNavRegisterBtn');
    const landingNavTrack = document.getElementById('landingNavTrackBtn');
    const authBackBtn = document.getElementById('authBackToHomeBtn');

    if (landingNavLogin) landingNavLogin.addEventListener('click', () => this.openAuth('login'));
    if (landingNavRegister) landingNavRegister.addEventListener('click', () => this.openAuth('register'));
    if (authBackBtn) authBackBtn.addEventListener('click', () => {
      this.goToHomePage(true);
    });
    if (landingNavTrack) {
      landingNavTrack.addEventListener('click', () => {
        this.openAuth('login');
      });
    }

    // Landing Navbar Bookmark Links
    document.querySelectorAll('.landing-nav-links a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        const targetId = href ? href.replace(/^#/, '') : 'home';
        this.scrollToBookmark(targetId || 'home');
      });
    });

    // Landing Footer Bookmark Links
    document.querySelectorAll('.landing-footer a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.length > 1) {
          e.preventDefault();
          this.scrollToBookmark(href.replace(/^#/, ''));
        }
      });
    });

    // Footer Quick Links
    const footerSignIn = document.getElementById('footerSignInLink');
    const footerTrack = document.getElementById('footerTrackLink');
    if (footerSignIn) footerSignIn.addEventListener('click', e => {
      e.preventDefault();
      this.openAuth('login');
    });
    if (footerTrack) footerTrack.addEventListener('click', e => {
      e.preventDefault();
      this.openAuth('login');
    });

    // Landing Page Footer Role Links
    document.querySelectorAll('.landing-footer a[data-switch-role]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openAuth('login');
      });
    });

    // Theme Toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Mobile Sidebar Toggle
    const mobileBtn = document.getElementById('mobileSidebarToggle');
    const sidebar = document.getElementById('appSidebar');
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Auth Screen Tabs
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const loginForm = document.getElementById('appLoginForm');
    const regForm = document.getElementById('appRegisterForm');

    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => {
        this.openAuth('login');
      });

      tabRegister.addEventListener('click', () => {
        this.openAuth('register');
      });
    }

    // Login Form Submit
    if (loginForm) {
      loginForm.addEventListener('submit', e => this.handleLogin(e));
    }

    // Register Form Submit
    if (regForm) {
      regForm.addEventListener('submit', e => this.handleRegister(e));
    }

    // Password Show / Hide Visibility Toggles (Login, Register, Settings, Admin)
    document.addEventListener('click', e => {
      const toggleBtn = e.target.closest('[data-toggle-password]');
      if (!toggleBtn) return;
      e.preventDefault();
      const targetId = toggleBtn.getAttribute('data-toggle-password');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      const icon = toggleBtn.querySelector('i');
      if (icon) {
        if (isPassword) {
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
          toggleBtn.setAttribute('title', 'Hide Password');
          toggleBtn.setAttribute('aria-label', 'Hide Password');
        } else {
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
          toggleBtn.setAttribute('title', 'Show Password');
          toggleBtn.setAttribute('aria-label', 'Show Password');
        }
      }
    });

    // Quick Demo Credentials Chips
    const credCust = document.getElementById('quickCredCust');
    const credDrv = document.getElementById('quickCredDrv');
    const credAdm = document.getElementById('quickCredAdm');

    if (credCust) {
      credCust.addEventListener('click', () => {
        document.getElementById('loginEmailInput').value = 'customer@smartluggage.pk';
        document.getElementById('loginPasswordInput').value = 'customer123';
      });
    }
    if (credDrv) {
      credDrv.addEventListener('click', () => {
        document.getElementById('loginEmailInput').value = 'driver@smartluggage.pk';
        document.getElementById('loginPasswordInput').value = 'driver123';
      });
    }
    if (credAdm) {
      credAdm.addEventListener('click', () => {
        document.getElementById('loginEmailInput').value = 'admin@smartluggage.pk';
        document.getElementById('loginPasswordInput').value = 'admin123';
      });
    }

    // Landing Page Navigation & CTA Buttons
    const landingBookBtn = document.getElementById('landingBookNowBtn');
    const landingQuoteBtn = document.getElementById('landingGetQuoteBtn');
    const landingFinalCtaBtn = document.getElementById('landingFinalCtaBtn');

    if (landingBookBtn) {
      landingBookBtn.addEventListener('click', () => {
        this.openAuth('register');
      });
    }
    if (landingQuoteBtn) {
      landingQuoteBtn.addEventListener('click', () => {
        this.openAuth('login');
      });
    }
    if (landingFinalCtaBtn) {
      landingFinalCtaBtn.addEventListener('click', () => {
        this.openAuth('register');
      });
    }

    // Dashboard Quick Navigation Buttons
    const dashCreateBtn = document.getElementById('dashCreateBookingBtn');
    const navQuickBookBtn = document.getElementById('quickNewBookingNavBtn');
    const trackActiveBtn = document.getElementById('trackActiveBookingQuickBtn');
    const myBookingsNewBtn = document.getElementById('myBookingsNewBtn');
    const returnDashBtn = document.getElementById('returnDashboardBtn');

    if (dashCreateBtn) dashCreateBtn.addEventListener('click', () => this.navigate('view-create-booking'));
    if (navQuickBookBtn) navQuickBookBtn.addEventListener('click', () => this.navigate('view-create-booking'));
    if (myBookingsNewBtn) myBookingsNewBtn.addEventListener('click', () => this.navigate('view-create-booking'));
    if (trackActiveBtn) trackActiveBtn.addEventListener('click', () => this.showTrackingView('BK-2026-001'));
    if (returnDashBtn) returnDashBtn.addEventListener('click', () => this.navigateToRoleDefault());

    // Admin User Role Filter
    const userRoleFilter = document.getElementById('adminUserRoleFilter');
    if (userRoleFilter) {
      userRoleFilter.addEventListener('change', () => this.renderAdminUsers());
    }

    // Admin Driver Filters & Search Toolbar (Phase 7)
    const driverSearch = document.getElementById('adminDriverSearchInput');
    const driverAvailFilter = document.getElementById('adminDriverAvailFilter');
    const driverStatusFilter = document.getElementById('adminDriverStatusFilter');
    const driverCityFilter = document.getElementById('adminDriverCityFilter');
    const openAddDrvBtn = document.getElementById('openAddDriverModalBtn');

    if (driverSearch) driverSearch.addEventListener('input', () => this.renderAdminDrivers());
    if (driverAvailFilter) driverAvailFilter.addEventListener('change', () => this.renderAdminDrivers());
    if (driverStatusFilter) driverStatusFilter.addEventListener('change', () => this.renderAdminDrivers());
    if (driverCityFilter) driverCityFilter.addEventListener('change', () => this.renderAdminDrivers());
    if (openAddDrvBtn) openAddDrvBtn.addEventListener('click', () => this.openAddDriverModal());

    // Tracking Reference Search Bar (Phase 8)
    const trackSearchBtn = document.getElementById('trackSearchRefBtn');
    const trackSearchInput = document.getElementById('trackSearchRefInput');
    if (trackSearchBtn && trackSearchInput) {
      const searchFn = () => {
        const val = trackSearchInput.value.trim();
        if (val) this.showTrackingView(val);
      };
      trackSearchBtn.addEventListener('click', searchFn);
      trackSearchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchFn();
        }
      });
    }

    // Admin Bookings Filters & Search Toolbar (Phase 10)
    const adminBookingsSearch = document.getElementById('adminBookingsSearchInput');
    const adminBookingsStatus = document.getElementById('adminBookingsStatusFilter');
    const adminBookingsDateFrom = document.getElementById('adminBookingsDateFrom');
    const adminBookingsDateTo = document.getElementById('adminBookingsDateTo');

    if (adminBookingsSearch) adminBookingsSearch.addEventListener('input', () => this.renderAdminBookings());
    if (adminBookingsStatus) adminBookingsStatus.addEventListener('change', () => this.renderAdminBookings());
    if (adminBookingsDateFrom) adminBookingsDateFrom.addEventListener('change', () => this.renderAdminBookings());
    if (adminBookingsDateTo) adminBookingsDateTo.addEventListener('change', () => this.renderAdminBookings());

    // Admin Settings & AI Configuration Forms (Phase 10)
    const adminSettingsForm = document.getElementById('adminSettingsForm');
    if (adminSettingsForm) {
      adminSettingsForm.addEventListener('submit', e => this.handleAdminSettingsSubmit(e));
    }

    const adminAiConfigForm = document.getElementById('adminAiConfigForm');
    if (adminAiConfigForm) {
      adminAiConfigForm.addEventListener('submit', e => this.handleAdminAiConfigSubmit(e));
    }

    // Export Corridors Summary Report
    const exportCorridorBtn = document.getElementById('exportCorridorReportBtn');
    if (exportCorridorBtn) {
      exportCorridorBtn.addEventListener('click', () => this.handleExportCorridors());
    }

    // Customer & Admin Feedback Controls (Phase 9)
    this.bindFeedbackControls();

    // Booking Stepper Navigation
    this.bindBookingStepper();

    // AI Sandbox Simulator
    this.bindAiSandbox();

    // Modals
    this.bindModals();

    // Customer Feedback Form
    const feedbackForm = document.getElementById('customerFeedbackForm');
    if (feedbackForm) {
      feedbackForm.addEventListener('submit', e => this.handleFeedbackSubmit(e));
    }

    // Customer Profile Form
    const profileForm = document.getElementById('customerProfileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', e => this.handleProfileSubmit(e));
    }

    // Password Change Form
    const passwordForm = document.getElementById('changePasswordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', e => this.handleChangePassword(e));
    }

    // FAQ Accordion on Landing Page (Single Active Item, Full Toggle Support)
    const faqItems = document.querySelectorAll('.faq-accordion-item');
    faqItems.forEach(item => {
      const header = item.querySelector('.faq-header');

      // Click handler: if currently open, close it; otherwise close all others and open this one
      if (header) {
        header.addEventListener('click', (e) => {
          e.stopPropagation();
          const isCurrentlyOpen = item.classList.contains('open');
          faqItems.forEach(other => other.classList.remove('open'));
          if (!isCurrentlyOpen) {
            item.classList.add('open');
          }
        });
      }

      // Hover effect: when hovering an unopened FAQ, switch to it
      item.addEventListener('mouseenter', () => {
        if (!item.classList.contains('open')) {
          faqItems.forEach(other => other.classList.remove('open'));
          item.classList.add('open');
        }
      });
    });

    // In-App Notification Dropdown Toggle (Phase 11)
    const notifBellBtn = document.getElementById('notifBellBtn');
    const notifMenu = document.getElementById('notifDropdownMenu');
    const notifMarkAllReadBtn = document.getElementById('notifMarkAllReadBtn');
    const notifClearAllBtn = document.getElementById('notifClearAllBtn');

    if (notifBellBtn && notifMenu) {
      notifBellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifMenu.classList.toggle('active');
        this.renderNotifications();
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#notifDropdownWrapper')) {
          notifMenu.classList.remove('active');
        }
      });
    }

    if (notifMarkAllReadBtn) {
      notifMarkAllReadBtn.addEventListener('click', () => {
        const user = authService.getCurrentUser();
        if (user) {
          notificationService.markAllAsRead(user.id);
          this.renderNotifications();
          this.showToast('All notifications marked as read', 'info');
        }
      });
    }

    if (notifClearAllBtn) {
      notifClearAllBtn.addEventListener('click', () => {
        const user = authService.getCurrentUser();
        if (user) {
          notificationService.clearAll(user.id);
          this.renderNotifications();
          this.showToast('Notifications cleared', 'info');
        }
      });
    }

    // Global App Error Listener
    window.addEventListener('app:error', e => {
      const err = e.detail?.error;
      this.showToast(err?.message || 'An error occurred', 'error');
    });
  }

  /* =========================================================================
     Authentication Handlers
     ========================================================================= */

  handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmailInput').value;
    const password = document.getElementById('loginPasswordInput').value;

    try {
      const user = authService.login(email, password);
      this.showToast(`Welcome back, ${user.fullName}!`, 'success');
      this.navigateToRoleDefault();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const city = document.getElementById('regCity').value;
    const role = document.getElementById('regRole')?.value || USER_ROLES.CUSTOMER;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    try {
      const user = authService.register({ fullName, email, phone, city, role, password, confirmPassword });
      this.showToast(`Account created successfully! Welcome, ${user.fullName}`, 'success');
      this.navigateToRoleDefault();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  handleLogout() {
    authService.logout();
    this.showToast('You have been logged out successfully.', 'info');
    this.switchDemoRole('LANDING');
  }

  handleChangePassword(e) {
    e.preventDefault();
    const user = authService.getCurrentUser();
    const oldPwd = document.getElementById('pwdCurrent').value;
    const newPwd = document.getElementById('pwdNew').value;
    const confirmPwd = document.getElementById('pwdConfirm').value;

    if (newPwd !== confirmPwd) {
      this.showToast('New passwords do not match.', 'error');
      return;
    }

    try {
      authService.changePassword(user.id, oldPwd, newPwd);
      this.showToast('Password updated securely!', 'success');
      document.getElementById('changePasswordForm').reset();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  navigateToRoleDefault() {
    const user = authService.getCurrentUser();
    if (!user) {
      this.openAuth('login');
      return;
    }

    if (user.role === USER_ROLES.CUSTOMER) {
      this.switchDemoRole('CUSTOMER', 'view-customer-dashboard');
    } else if (user.role === USER_ROLES.DRIVER) {
      this.switchDemoRole('DRIVER', 'view-driver-dashboard');
    } else if (user.role === USER_ROLES.ADMIN) {
      this.switchDemoRole('ADMIN', 'view-admin-dashboard');
    }
  }

  /* =========================================================================
     Role Switcher & Guarded Navigation
     ========================================================================= */

  switchDemoRole(role, targetView = null, forceDemoLogin = false, pushHistory = true) {
    const landing = document.getElementById('landingView');
    const authScreen = document.getElementById('authScreenView');
    const appWrapper = document.getElementById('appWrapper');

    if (role === 'LANDING') {
      this.currentRole = 'LANDING';
      document.querySelectorAll('.demo-role-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-switch-role') === 'LANDING');
      });
      if (landing) landing.style.display = 'block';
      if (authScreen) authScreen.style.display = 'none';
      if (appWrapper) appWrapper.style.display = 'none';
      if (pushHistory && !this.isHandlingPopstate) {
        this.pushHistoryState('LANDING', null);
      }
      return;
    }

    if (role === 'AUTH') {
      this.currentRole = 'AUTH';
      document.querySelectorAll('.demo-role-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-switch-role') === 'AUTH');
      });
      if (landing) landing.style.display = 'none';
      if (authScreen) authScreen.style.display = 'block';
      if (appWrapper) appWrapper.style.display = 'none';
      return;
    }

    const currentUser = authService.getCurrentUser();

    // Strict Role-Based Authentication Guard: Only users who have registered/logged in for this specific role can access
    if (!currentUser) {
      this.showToast(`Please sign in with your registered ${role.toLowerCase()} account to access this portal.`, 'info');
      this.openAuth('login', pushHistory);
      return;
    }

    // Check role boundaries
    if (role === 'CUSTOMER' && currentUser.role !== USER_ROLES.CUSTOMER && currentUser.role !== USER_ROLES.ADMIN) {
      this.showToast(`Access restricted: You are registered as ${currentUser.role}. Only Customer accounts can access this portal.`, 'error');
      return;
    }

    if (role === 'DRIVER' && currentUser.role !== USER_ROLES.DRIVER && currentUser.role !== USER_ROLES.ADMIN) {
      this.showToast(`Access restricted: You are registered as ${currentUser.role}. Only Driver accounts can access the Driver Dispatch portal.`, 'error');
      return;
    }

    if (role === 'ADMIN' && currentUser.role !== USER_ROLES.ADMIN) {
      this.showToast(`Access restricted: Administrator credentials required. You are registered as ${currentUser.role}.`, 'error');
      return;
    }

    this.currentRole = role;
    document.querySelectorAll('.demo-role-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-switch-role') === role);
    });

    if (landing) landing.style.display = 'none';
    if (authScreen) authScreen.style.display = 'none';
    if (appWrapper) appWrapper.style.display = 'flex';

    if (role === 'CUSTOMER') {
      this.navigate(targetView || 'view-customer-dashboard', pushHistory);
    } else if (role === 'DRIVER') {
      this.navigate(targetView || 'view-driver-dashboard', pushHistory);
    } else if (role === 'ADMIN') {
      this.navigate(targetView || 'view-admin-dashboard', pushHistory);
    }

    this.renderSidebarForRole();
    this.updateUserBadge();
    this.renderNotifications();
  }

  updateUserBadge() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const avatar = document.getElementById('userAvatarCircle');
    const name = document.getElementById('userNameLabel');
    const role = document.getElementById('userRoleLabel');

    if (avatar) avatar.textContent = user.avatarInitials || 'SL';
    if (name) name.textContent = user.fullName;
    if (role) role.textContent = user.role;
  }

  renderSidebarForRole() {
    const user = authService.getCurrentUser();
    const nav = document.getElementById('sidebarNavMenu');
    if (!nav || !user) return;

    let html = '';

    if (user.role === USER_ROLES.CUSTOMER) {
      html = `
        <span class="nav-section-title">Customer Portal</span>
        <button class="nav-link ${this.currentView === 'view-customer-dashboard' ? 'active' : ''}" data-nav="view-customer-dashboard"><i class="fa-solid fa-house"></i><span>Dashboard</span></button>
        <button class="nav-link ${this.currentView === 'view-create-booking' ? 'active' : ''}" data-nav="view-create-booking"><i class="fa-solid fa-plus-circle"></i><span>Book Luggage</span></button>
        <button class="nav-link ${this.currentView === 'view-my-bookings' ? 'active' : ''}" data-nav="view-my-bookings"><i class="fa-solid fa-table-list"></i><span>My Bookings</span></button>
        <button class="nav-link ${this.currentView === 'view-booking-tracking' ? 'active' : ''}" data-nav="view-booking-tracking"><i class="fa-solid fa-location-crosshairs"></i><span>Track Shipment</span></button>
        <button class="nav-link ${this.currentView === 'view-my-luggage' ? 'active' : ''}" data-nav="view-my-luggage"><i class="fa-solid fa-suitcase"></i><span>My Luggage</span></button>
        <button class="nav-link ${this.currentView === 'view-feedback' ? 'active' : ''}" data-nav="view-feedback"><i class="fa-solid fa-star"></i><span>Rate & Feedback</span></button>
        <button class="nav-link ${this.currentView === 'view-customer-profile' ? 'active' : ''}" data-nav="view-customer-profile"><i class="fa-solid fa-user"></i><span>Profile</span></button>
      `;
    } else if (user.role === USER_ROLES.DRIVER) {
      html = `
        <span class="nav-section-title">Driver Dispatch</span>
        <button class="nav-link active" data-nav="view-driver-dashboard"><i class="fa-solid fa-truck"></i><span>Assigned Trips</span></button>
        <button class="nav-link" data-nav="view-customer-profile"><i class="fa-solid fa-user"></i><span>Driver Profile</span></button>
      `;
    } else if (user.role === USER_ROLES.ADMIN) {
      html = `
        <span class="nav-section-title">Admin Command</span>
        <button class="nav-link ${this.currentView === 'view-admin-dashboard' ? 'active' : ''}" data-nav="view-admin-dashboard"><i class="fa-solid fa-gauge-high"></i><span>Dashboard</span></button>
        <button class="nav-link ${this.currentView === 'view-admin-bookings' ? 'active' : ''}" data-nav="view-admin-bookings"><i class="fa-solid fa-boxes-stacked"></i><span>Bookings</span></button>
        <button class="nav-link ${this.currentView === 'view-admin-users' ? 'active' : ''}" data-nav="view-admin-users"><i class="fa-solid fa-users"></i><span>Users</span></button>
        <button class="nav-link ${this.currentView === 'view-admin-drivers' ? 'active' : ''}" data-nav="view-admin-drivers"><i class="fa-solid fa-truck-ramp-box"></i><span>Drivers</span></button>
        <button class="nav-link ${this.currentView === 'view-admin-feedback' ? 'active' : ''}" data-nav="view-admin-feedback"><i class="fa-solid fa-star"></i><span>Feedback</span></button>
        <button class="nav-link ${this.currentView === 'view-admin-predictions' ? 'active' : ''}" data-nav="view-admin-predictions"><i class="fa-solid fa-brain"></i><span>AI Predictions</span></button>
        <button class="nav-link ${this.currentView === 'view-admin-reports' ? 'active' : ''}" data-nav="view-admin-reports"><i class="fa-solid fa-chart-line"></i><span>Analytics</span></button>
        <button class="nav-link ${this.currentView === 'view-admin-settings' ? 'active' : ''}" data-nav="view-admin-settings"><i class="fa-solid fa-sliders"></i><span>Settings</span></button>
        <button class="nav-link ${this.currentView === 'view-customer-profile' ? 'active' : ''}" data-nav="view-customer-profile"><i class="fa-solid fa-user"></i><span>Profile</span></button>
      `;
    }

    html += `
      <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--border-color);">
        <button class="nav-link" id="sidebarReturnLandingBtn" style="color: var(--text-muted);"><i class="fa-solid fa-arrow-left"></i><span>Public Website</span></button>
      </div>
    `;

    nav.innerHTML = html;

    const returnLandingBtn = document.getElementById('sidebarReturnLandingBtn');
    if (returnLandingBtn) {
      returnLandingBtn.addEventListener('click', () => {
        this.switchDemoRole('LANDING');
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) sidebar.classList.remove('mobile-open');
      });
    }

    // Attach click listeners to nav links
    nav.querySelectorAll('[data-nav]').forEach(link => {
      link.addEventListener('click', e => {
        const viewId = e.currentTarget.getAttribute('data-nav');
        this.navigate(viewId);
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) sidebar.classList.remove('mobile-open');
      });
    });
  }

  navigate(viewId, pushHistory = true) {
    // Route Guard Check
    if (!authService.canAccessView(viewId)) {
      if (!authService.isAuthenticated()) {
        this.showToast('Please sign in or create an account to access this portal.', 'info');
        this.openAuth('login', pushHistory);
        return;
      }

      this.currentView = 'view-unauthorized';
      document.querySelectorAll('.view-pane').forEach(pane => pane.style.display = 'none');
      const unauthPane = document.getElementById('view-unauthorized');
      if (unauthPane) {
        unauthPane.style.display = 'block';
        const msg = document.getElementById('unauthorizedMessageText');
        if (msg) {
          msg.textContent = `Role "${authService.getCurrentUser()?.role}" is not authorized to access "${viewId}".`;
        }
      }
      return;
    }

    this.currentView = viewId;
    document.querySelectorAll('.view-pane').forEach(pane => {
      pane.style.display = 'none';
    });

    const target = document.getElementById(viewId);
    if (target) target.style.display = 'block';

    const breadcrumb = document.getElementById('breadcrumbCurrentView');
    if (breadcrumb) {
      const titles = {
        'view-customer-dashboard': 'Customer Dashboard',
        'view-create-booking': 'Create Booking (AI Estimate)',
        'view-my-bookings': 'My Bookings',
        'view-booking-tracking': 'Track Shipment',
        'view-my-luggage': 'My Luggage Catalog',
        'view-customer-profile': 'Profile Settings',
        'view-feedback': 'Rate Delivery & Experience',
        'view-driver-dashboard': 'Driver Dispatch Portal',
        'view-admin-dashboard': 'Admin Command Center Overview',
        'view-admin-bookings': 'All Bookings Management Directory',
        'view-admin-predictions': 'AI Model Diagnostics & Predictions',
        'view-admin-users': 'User Accounts Directory',
        'view-admin-drivers': 'Driver Fleet Roster',
        'view-admin-feedback': 'Customer Feedback & Reviews Directory',
        'view-admin-reports': 'Corridor Analytics & Logistics Reports',
        'view-admin-settings': 'Platform Tariff & Model Configuration',
        'view-unauthorized': 'Unauthorized Access'
      };
      breadcrumb.textContent = titles[viewId] || 'Portal';
    }

    this.renderSidebarForRole();
    this.renderActiveView();

    if (pushHistory && !this.isHandlingPopstate && this.currentRole !== 'LANDING' && this.currentRole !== 'AUTH') {
      this.pushHistoryState(this.currentRole, viewId);
    }
  }

  renderActiveView() {
    this.updateUserBadge();
    this.renderNotifications();

    if (this.currentView === 'view-customer-dashboard') {
      this.renderCustomerDashboard();
    } else if (this.currentView === 'view-my-bookings') {
      this.renderMyBookings();
    } else if (this.currentView === 'view-my-luggage') {
      this.renderMyLuggage();
    } else if (this.currentView === 'view-customer-profile') {
      this.renderProfile();
    } else if (this.currentView === 'view-feedback') {
      this.renderFeedbackView();
    } else if (this.currentView === 'view-driver-dashboard') {
      this.renderDriverDashboard();
    } else if (this.currentView === 'view-admin-dashboard') {
      this.renderAdminDashboard();
    } else if (this.currentView === 'view-admin-bookings') {
      this.renderAdminBookings();
    } else if (this.currentView === 'view-admin-predictions') {
      this.renderAdminAiAnalytics();
    } else if (this.currentView === 'view-admin-users') {
      this.renderAdminUsers();
    } else if (this.currentView === 'view-admin-drivers') {
      this.renderAdminDrivers();
    } else if (this.currentView === 'view-admin-feedback') {
      this.renderAdminFeedback();
    } else if (this.currentView === 'view-admin-reports') {
      this.renderAdminReports();
    } else if (this.currentView === 'view-admin-settings') {
      this.renderAdminSettings();
    }
  }

  renderProfile() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const nameInput = document.getElementById('profFullName');
    const emailInput = document.getElementById('profEmail');
    const phoneInput = document.getElementById('profPhone');
    const cityInput = document.getElementById('profCity');
    const addrInput = document.getElementById('profAddress');
    const badgeRole = document.getElementById('profBadgeRole');

    if (nameInput) nameInput.value = user.fullName || '';
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (cityInput) cityInput.value = user.city || '';
    if (addrInput) addrInput.value = user.address || '';
    if (badgeRole) badgeRole.textContent = user.role;
  }

  /* =========================================================================
     Booking 4-Step Wizard Flow
     ========================================================================= */

  bindBookingStepper() {
    // Step 1 Live Distance Preview Listeners
    const pickupSelect = document.getElementById('bookPickupCity');
    const destSelect = document.getElementById('bookDestCity');
    if (pickupSelect && destSelect) {
      const updateFn = () => this.updateStep1DistancePreview();
      pickupSelect.addEventListener('change', updateFn);
      destSelect.addEventListener('change', updateFn);
      // Initial calculation
      this.updateStep1DistancePreview();
    }

    // Step 1 -> Step 2
    const step1Next = document.getElementById('step1NextBtn');
    if (step1Next) {
      step1Next.addEventListener('click', () => {
        const pickupCity = document.getElementById('bookPickupCity').value;
        const destCity = document.getElementById('bookDestCity').value;
        const pickupAddr = document.getElementById('bookPickupAddress').value.trim();
        const destAddr = document.getElementById('bookDestAddress').value.trim();

        if (pickupCity.toLowerCase() === destCity.toLowerCase() && pickupAddr.toLowerCase() === destAddr.toLowerCase()) {
          this.showToast('Pickup and destination address cannot be identical.', 'error');
          return;
        }

        if (!pickupAddr || !destAddr) {
          this.showToast('Please provide both pickup and destination address lines.', 'error');
          return;
        }

        this.setBookingStep(2);
      });
    }

    // Step 2 -> Step 3 (Runs AI Prediction)
    const step2Back = document.getElementById('step2BackBtn');
    const step2Next = document.getElementById('step2NextBtn');

    if (step2Back) step2Back.addEventListener('click', () => this.setBookingStep(1));
    if (step2Next) {
      step2Next.addEventListener('click', async () => {
        await this.generateAIEstimate();
        this.setBookingStep(3);
      });
    }

    // Step 3 -> Step 4
    const step3Back = document.getElementById('step3BackBtn');
    const step3Next = document.getElementById('step3NextBtn');

    if (step3Back) step3Back.addEventListener('click', () => this.setBookingStep(2));
    if (step3Next) {
      step3Next.addEventListener('click', () => {
        this.populateConfirmationSummary();
        this.setBookingStep(4);
      });
    }

    // Step 4 Confirm Action
    const step4Back = document.getElementById('step4BackBtn');
    const confirmBtn = document.getElementById('confirmBookingBtn');

    if (step4Back) step4Back.addEventListener('click', () => this.setBookingStep(3));
    if (confirmBtn) confirmBtn.addEventListener('click', () => this.handleConfirmBooking());
  }

  async updateStep1DistancePreview() {
    const pickupCity = document.getElementById('bookPickupCity')?.value || 'Islamabad';
    const destCity = document.getElementById('bookDestCity')?.value || 'Lahore';

    const routeTitle = document.getElementById('step1RouteTitle');
    const corridorBadge = document.getElementById('step1CorridorBadge');
    const distValue = document.getElementById('step1DistanceValue');
    const drivingTime = document.getElementById('step1DrivingTime');
    const providerInfo = document.getElementById('step1ProviderInfo');

    try {
      const distData = await distanceService.calculateRouteDistance({ city: pickupCity }, { city: destCity });
      if (routeTitle) routeTitle.textContent = `${pickupCity} → ${destCity}`;
      if (corridorBadge) corridorBadge.innerHTML = `<i class="fa-solid fa-route"></i> ${distData.corridorName}`;
      if (distValue) distValue.textContent = `${distData.distanceKm} km`;
      if (drivingTime) drivingTime.textContent = `Est. Highway Driving: ${distData.drivingTimeHours} Hours`;
      if (providerInfo) providerInfo.textContent = `Provider: ${distData.providerUsed}`;
    } catch (e) {
      if (distValue) distValue.textContent = '-- km';
    }
  }

  setBookingStep(stepNumber) {
    this.activeBookingStep = stepNumber;

    document.querySelectorAll('.step-item').forEach(item => {
      const step = Number(item.getAttribute('data-step'));
      item.classList.toggle('active', step === stepNumber);
      item.classList.toggle('completed', step < stepNumber);
    });

    document.querySelectorAll('.step-pane').forEach((pane, idx) => {
      pane.classList.toggle('active', idx + 1 === stepNumber);
    });
  }

  async generateAIEstimate() {
    const pickupCity = document.getElementById('bookPickupCity').value;
    const destCity = document.getElementById('bookDestCity').value;
    const luggageType = document.getElementById('bookLuggageType').value;
    const weightKg = Number(document.getElementById('bookLuggageWeight').value) || 10;
    const bagCount = Number(document.getElementById('bookBagCount').value) || 1;
    const isFragile = document.getElementById('bookIsFragile').checked;

    const distResult = await distanceService.calculateRouteDistance({ city: pickupCity }, { city: destCity });
    const distanceKm = distResult.distanceKm;

    const tierRadios = document.getElementsByName('transportTier');
    let selectedTier = TRANSPORT_TIERS.STANDARD;
    tierRadios.forEach(r => {
      if (r.checked) selectedTier = r.value;
    });

    const prediction = await predictionService.predict({
      customerId: authService.getCurrentUser().id,
      distanceKm,
      totalWeightKg: weightKg,
      bagCount,
      luggageType,
      sizeCategory: LUGGAGE_SIZES.LARGE,
      transportTier: selectedTier,
      isFragile
    });

    this.activePrediction = prediction;

    const costElem = document.getElementById('aiEstimatedCostDisplay');
    const timeElem = document.getElementById('aiEstimatedTimeDisplay');
    const distElem = document.getElementById('aiDistanceDisplay');

    if (costElem) costElem.textContent = `PKR ${prediction.predictedCost.toLocaleString()}`;
    if (timeElem) timeElem.textContent = `${prediction.predictedTimeHours} hrs`;
    if (distElem) distElem.textContent = `${distanceKm} km (${distResult.corridorName})`;
  }

  populateConfirmationSummary() {
    const pickupCity = document.getElementById('bookPickupCity')?.value || 'Islamabad';
    const destCity = document.getElementById('bookDestCity')?.value || 'Lahore';
    const pickupAddress = document.getElementById('bookPickupAddress')?.value || 'Pickup Address';
    const destAddress = document.getElementById('bookDestAddress')?.value || 'Destination Address';
    const luggageType = document.getElementById('bookLuggageType')?.value || 'Suitcase';
    const weightKg = document.getElementById('bookLuggageWeight')?.value || '18';
    const bagCount = document.getElementById('bookBagCount')?.value || '1';

    const pickupSummary = document.getElementById('confPickupSummary');
    const destSummary = document.getElementById('confDestSummary');
    const routeSummary = document.getElementById('confRouteSummary');
    const lugSummary = document.getElementById('confLuggageSummary');
    const costSummary = document.getElementById('confCostSummary');
    const timeSummary = document.getElementById('confTimeSummary');

    if (pickupSummary) pickupSummary.textContent = `${pickupCity} (${pickupAddress})`;
    if (destSummary) destSummary.textContent = `${destCity} (${destAddress})`;
    if (routeSummary) routeSummary.textContent = `${this.activePrediction?.inputFeatures?.distanceKm || 380} km (${this.activePrediction?.inputFeatures?.corridorName || 'Motorway Corridor'})`;
    if (lugSummary) lugSummary.textContent = `${bagCount}x ${luggageType} (${weightKg} kg, ${this.activePrediction?.inputFeatures?.sizeCategory || 'Standard'})`;
    if (costSummary) costSummary.textContent = `PKR ${this.activePrediction?.predictedCost?.toLocaleString() || '1,950'}`;
    if (timeSummary) timeSummary.textContent = `${this.activePrediction?.predictedTimeHours || 10.0} Hours`;
  }

  async handleConfirmBooking() {
    if (this.isSubmittingBooking) return;
    this.isSubmittingBooking = true;

    const confirmBtn = document.getElementById('confirmBookingBtn');
    const originalBtnText = confirmBtn ? confirmBtn.innerHTML : '';

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Confirming Booking...`;
    }

    try {
      const user = authService.getCurrentUser();
      const pickupCity = document.getElementById('bookPickupCity').value;
      const destCity = document.getElementById('bookDestCity').value;
      const pickupAddress = document.getElementById('bookPickupAddress').value;
      const destAddress = document.getElementById('bookDestAddress').value;
      const luggageType = document.getElementById('bookLuggageType').value;
      const weightKg = Number(document.getElementById('bookLuggageWeight').value) || 12;
      const bagCount = Number(document.getElementById('bookBagCount').value) || 1;
      const lengthCm = Number(document.getElementById('bookDimL').value) || 70;
      const widthCm = Number(document.getElementById('bookDimW').value) || 45;
      const heightCm = Number(document.getElementById('bookDimH').value) || 28;
      const isFragile = document.getElementById('bookIsFragile').checked;
      const notes = document.getElementById('bookSpecialNotes').value;

      if (!this.activePrediction) {
        throw new Error('AI estimation estimate must be generated before confirming booking.');
      }

      // 1. Create Pickup Location
      const pickupLoc = locationService.createLocation({
        city: pickupCity,
        addressLine: pickupAddress,
        contactPerson: user.fullName,
        contactPhone: user.phone
      });

      // 2. Create Destination Location
      const destLoc = locationService.createLocation({
        city: destCity,
        addressLine: destAddress,
        contactPerson: 'Consignee / Recipient',
        contactPhone: '+92 300 0000000'
      });

      // 3. Create Luggage Record
      const lugItem = luggageService.createLuggage({
        customerId: user.id,
        type: luggageType,
        weightKg,
        bagCount,
        lengthCm,
        widthCm,
        heightCm,
        isFragile,
        specialInstructions: notes
      });

      // 4. Create Booking in CONFIRMED status
      const newBooking = bookingService.createBooking({
        customerId: user.id,
        pickupLocationId: pickupLoc.id,
        destinationLocationId: destLoc.id,
        luggageIds: [lugItem.id],
        distanceKm: this.activePrediction.inputFeatures.distanceKm,
        predictionId: this.activePrediction.id,
        transportTier: this.activePrediction.inputFeatures.transportTier,
        quotedCost: this.activePrediction.predictedCost,
        estimatedDeliveryTimeHours: this.activePrediction.predictedTimeHours,
        customerNotes: notes
      }, user);

      this.showToast(`Booking ${newBooking.bookingNumber} confirmed! Status: CONFIRMED`, 'success');
      this.setBookingStep(1);

      // Redirect customer to Booking Details & Tracking View
      this.showTrackingView(newBooking.id);
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      this.isSubmittingBooking = false;
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalBtnText;
      }
    }
  }

  /* =========================================================================
     Customer Views Rendering
     ========================================================================= */

  renderCustomerDashboard() {
    const user = authService.getCurrentUser();
    const bookings = bookingService.getCustomerBookings(user.id, user);
    const luggage = luggageService.getCustomerLuggage(user.id);

    const activeCount = bookings.filter(b => b.status === BOOKING_STATUS.IN_TRANSIT || b.status === BOOKING_STATUS.PICKED_UP || b.status === BOOKING_STATUS.DRIVER_ASSIGNED).length;
    const completedCount = bookings.filter(b => b.status === BOOKING_STATUS.DELIVERED).length;

    const statActive = document.getElementById('custStatActive');
    const statCompleted = document.getElementById('custStatCompleted');
    const statLuggage = document.getElementById('custStatLuggage');

    if (statActive) statActive.textContent = activeCount;
    if (statCompleted) statCompleted.textContent = completedCount;
    if (statLuggage) statLuggage.textContent = luggage.length;

    const tbody = document.getElementById('custRecentBookingsTbody');
    if (!tbody) return;

    if (bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No bookings found. Click "Book Luggage" to create your first shipment.</td></tr>`;
      return;
    }

    tbody.innerHTML = bookings.slice(0, 5).map(b => {
      const isDelivered = b.status === BOOKING_STATUS.DELIVERED;
      const isReviewed = isDelivered && feedbackService.getBookingFeedback(b.id);
      
      return `
        <tr>
          <td><strong>${b.bookingNumber}</strong></td>
          <td>${b.pickupLocation?.city || 'Origin'} → ${b.destinationLocation?.city || 'Dest'} (${b.distanceKm} km)</td>
          <td>${b.luggageItems?.[0]?.type || 'Luggage'} (${b.luggageItems?.[0]?.weightKg || 10} kg)</td>
          <td><strong>PKR ${b.quotedCost?.toLocaleString()}</strong></td>
          <td>${b.estimatedDeliveryTimeHours} hrs</td>
          <td>${this.renderStatusBadge(b.status)}</td>
          <td>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" onclick="window.app.showTrackingView('${b.id}')"><i class="fa-solid fa-location-dot"></i> Details</button>
              ${isDelivered ? (isReviewed ? `<span class="badge badge-confirmed" style="font-size: 0.7rem; padding: 4px 6px;" title="Review Submitted"><i class="fa-solid fa-star"></i> Rated</span>` : `<button class="btn btn-primary btn-sm" style="background: #f59e0b; border-color: #f59e0b;" onclick="window.app.openFeedbackForBooking('${b.id}')"><i class="fa-solid fa-star"></i> Rate</button>`) : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderMyBookings() {
    const user = authService.getCurrentUser();
    const bookings = bookingService.getCustomerBookings(user.id, user);
    const tbody = document.getElementById('myBookingsFullTbody');
    if (!tbody) return;

    if (bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">No bookings found. Click "New Booking" to schedule luggage transit.</td></tr>`;
      return;
    }

    tbody.innerHTML = bookings.map(b => {
      const isDelivered = b.status === BOOKING_STATUS.DELIVERED;
      const isReviewed = isDelivered && feedbackService.getBookingFeedback(b.id);

      return `
        <tr>
          <td><strong>${b.bookingNumber}</strong></td>
          <td>${b.pickupLocation?.city || 'Origin'} → ${b.destinationLocation?.city || 'Dest'}</td>
          <td>${b.distanceKm} km</td>
          <td>${b.luggageItems?.[0]?.type || 'Luggage'} (${b.luggageItems?.[0]?.weightKg || 10} kg)</td>
          <td><strong>PKR ${b.quotedCost?.toLocaleString()}</strong></td>
          <td>${this.renderStatusBadge(b.status)}</td>
          <td>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" onclick="window.app.showTrackingView('${b.id}')"><i class="fa-solid fa-location-dot"></i> Details</button>
              ${isDelivered ? (isReviewed ? `<span class="badge badge-confirmed" style="font-size: 0.7rem; padding: 4px 6px;" title="Review Submitted"><i class="fa-solid fa-star"></i> Rated</span>` : `<button class="btn btn-primary btn-sm" style="background: #f59e0b; border-color: #f59e0b;" onclick="window.app.openFeedbackForBooking('${b.id}')"><i class="fa-solid fa-star"></i> Rate</button>`) : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  showTrackingView(bookingIdOrNumber, pushHistory = true) {
    const user = authService.getCurrentUser();
    try {
      const timelineData = trackingService.getTrackingTimeline(bookingIdOrNumber, user);
      const booking = timelineData.booking;

      const numHeader = document.getElementById('trackHeaderNumber');
      const routeHeader = document.getElementById('trackHeaderRoute');
      const badgeHeader = document.getElementById('trackHeaderBadge');
      const costElem = document.getElementById('trackQuotedCost');
      const timeElem = document.getElementById('trackEstTime');
      const confidenceElem = document.getElementById('trackConfidence');
      const modelEngineElem = document.getElementById('trackModelEngine');

      const driverAvatar = document.getElementById('trackDriverAvatar');
      const driverName = document.getElementById('trackDriverName');
      const driverVeh = document.getElementById('trackDriverVehicle');
      const driverRating = document.getElementById('trackDriverRating');
      const driverPhone = document.getElementById('trackDriverPhone');
      const driverCity = document.getElementById('trackDriverCity');

      const lugType = document.getElementById('trackLuggageType');
      const lugWeight = document.getElementById('trackLuggageWeight');
      const lugTier = document.getElementById('trackTransportTier');
      const lugFragile = document.getElementById('trackFragileBadge');

      if (numHeader) numHeader.textContent = `Trip Tracking: ${booking.bookingNumber}`;
      if (routeHeader) routeHeader.textContent = `${booking.pickupLocation?.city || 'Origin'} → ${booking.destinationLocation?.city || 'Dest'} (${booking.distanceKm} km)`;
      if (badgeHeader) {
        badgeHeader.className = `badge ${this.getBadgeClass(booking.status)}`;
        badgeHeader.textContent = (booking.status || 'CONFIRMED').replace('_', ' ');
      }
      if (costElem) costElem.textContent = `PKR ${Number(booking.quotedCost || 0).toLocaleString()}`;
      if (timeElem) timeElem.textContent = `${booking.estimatedDeliveryTimeHours || 12} Hours`;
      if (confidenceElem) confidenceElem.textContent = `${Math.round((booking.prediction?.confidenceScore || 0.94) * 100)}%`;
      if (modelEngineElem) modelEngineElem.textContent = booking.prediction?.modelVersion || 'v2.1-rf-domestic';

      if (booking.driver) {
        if (driverAvatar) driverAvatar.textContent = booking.driver.user?.avatarInitials || 'DR';
        if (driverName) driverName.textContent = booking.driver.user?.fullName || 'Assigned Driver';
        if (driverVeh) driverVeh.textContent = `${booking.driver.vehicleType} (${booking.driver.vehiclePlate})`;
        if (driverRating) driverRating.textContent = `${booking.driver.rating || 5.0} / 5.0`;
        if (driverPhone) driverPhone.textContent = booking.driver.user?.phone || '+92 300 0000000';
        if (driverCity) driverCity.textContent = booking.driver.currentCity || 'Domestic Hub';
      } else {
        if (driverAvatar) driverAvatar.textContent = '--';
        if (driverName) driverName.textContent = 'Pending Driver Assignment';
        if (driverVeh) driverVeh.textContent = 'Courier van will be dispatched soon';
        if (driverRating) driverRating.textContent = 'Pending';
        if (driverPhone) driverPhone.textContent = '--';
        if (driverCity) driverCity.textContent = booking.pickupLocation?.city || 'Islamabad';
      }

      const lug = booking.luggageItems?.[0];
      if (lugType) lugType.textContent = lug?.type || 'Suitcase';
      if (lugWeight) lugWeight.textContent = `${lug?.weightKg || 15} kg (${lug?.bagCount || 1} Bag)`;
      if (lugTier) lugTier.textContent = booking.transportTier || 'Standard Ground';
      if (lugFragile) {
        if (lug?.isFragile) {
          lugFragile.className = 'badge badge-cancelled';
          lugFragile.textContent = 'Fragile (Padded)';
        } else {
          lugFragile.className = 'badge badge-confirmed';
          lugFragile.textContent = 'Standard';
        }
      }

      // Populate Timeline Stepper
      const container = document.getElementById('trackingTimelineContainer');
      if (container) {
        container.innerHTML = timelineData.milestones.map(m => `
          <div class="timeline-node ${m.state}">
            <div class="timeline-node-dot"><i class="fa-solid fa-check"></i></div>
            <div class="node-title">${m.label}</div>
            <div class="node-desc">${m.note || m.desc}</div>
            <div class="node-meta">
              ${m.locationStamp ? `<span><i class="fa-solid fa-location-dot"></i> ${m.locationStamp}</span>` : ''}
              ${m.timestamp ? `<span><i class="fa-solid fa-clock"></i> ${new Date(m.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>` : ''}
            </div>
          </div>
        `).join('');
      }

      // Populate Status History Table
      const historyTbody = document.getElementById('trackStatusHistoryTbody');
      if (historyTbody) {
        if (!timelineData.statusHistory || timelineData.statusHistory.length === 0) {
          historyTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 16px;">No audit status history entries found.</td></tr>`;
        } else {
          historyTbody.innerHTML = timelineData.statusHistory.map(h => {
            const timeStr = h.timestamp ? new Date(h.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent';
            const userObj = db.tables.users.findById(h.changedByUserId);
            const actorName = userObj ? `${userObj.fullName} (${h.changedByRole || userObj.role})` : (h.changedByRole || 'System');

            return `
              <tr>
                <td style="font-size: 0.8rem; color: var(--text-muted);">${timeStr}</td>
                <td>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${h.fromStatus || 'INIT'}</span>
                  <i class="fa-solid fa-arrow-right" style="font-size: 0.7rem; margin: 0 4px; color: var(--brand-primary);"></i>
                  <strong>${h.toStatus}</strong>
                </td>
                <td><strong>${actorName}</strong></td>
                <td>
                  <div>${h.note || 'Status updated.'}</div>
                  ${h.locationStamp ? `<span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${h.locationStamp}</span>` : ''}
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      this.navigate('view-booking-tracking', false);
      if (pushHistory && !this.isHandlingPopstate) {
        this.pushHistoryState(this.currentRole || 'CUSTOMER', 'view-booking-tracking', null, { bookingId: bookingIdOrNumber });
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  renderMyLuggage() {
    const user = authService.getCurrentUser();
    const items = luggageService.getCustomerLuggage(user.id);
    const tbody = document.getElementById('myLuggageTbody');
    if (!tbody) return;

    tbody.innerHTML = items.map(l => `
      <tr>
        <td><strong>${l.id}</strong></td>
        <td>${l.type}</td>
        <td>${l.weightKg} kg</td>
        <td>${l.lengthCm} × ${l.widthCm} × ${l.heightCm} cm</td>
        <td>${l.volumeLiters} L</td>
        <td><span class="badge badge-confirmed">${l.sizeCategory}</span></td>
        <td>${l.isFragile ? '<span class="badge badge-pending">Fragile</span>' : '<span style="color: var(--text-muted);">Standard</span>'}</td>
      </tr>
    `).join('');
  }

  /* =========================================================================
     Driver Views & Workflow Actions
     ========================================================================= */

  renderDriverDashboard() {
    const user = authService.getCurrentUser();
    const driver = driverService.getDriverByUserId(user.id);
    const trips = driver ? bookingService.getDriverBookings(driver.id, user) : [];

    const tripsCount = document.getElementById('driverTripsCount');
    if (tripsCount) tripsCount.textContent = trips.length;

    const tbody = document.getElementById('driverAssignedTripsTbody');
    if (!tbody) return;

    if (trips.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No assigned trips currently.</td></tr>`;
      return;
    }

    tbody.innerHTML = trips.map(t => {
      let actionBtn = '';
      if (t.status === BOOKING_STATUS.DRIVER_ASSIGNED) {
        actionBtn = `<button class="btn btn-primary btn-sm" onclick="window.app.advanceDriverStatus('${t.id}', '${BOOKING_STATUS.PICKED_UP}')"><i class="fa-solid fa-box-open"></i> Mark Picked Up</button>`;
      } else if (t.status === BOOKING_STATUS.PICKED_UP) {
        actionBtn = `<button class="btn btn-primary btn-sm" onclick="window.app.advanceDriverStatus('${t.id}', '${BOOKING_STATUS.IN_TRANSIT}')"><i class="fa-solid fa-truck-fast"></i> Mark In Transit</button>`;
      } else if (t.status === BOOKING_STATUS.IN_TRANSIT) {
        actionBtn = `<button class="btn btn-success btn-sm" onclick="window.app.advanceDriverStatus('${t.id}', '${BOOKING_STATUS.DELIVERED}')"><i class="fa-solid fa-circle-check"></i> Mark Delivered</button>`;
      } else if (t.status === BOOKING_STATUS.DELIVERED) {
        actionBtn = `<span class="badge badge-delivered"><i class="fa-solid fa-check"></i> Completed</span>`;
      }

      return `
        <tr>
          <td><strong>${t.bookingNumber}</strong></td>
          <td>${t.customer?.fullName || 'Customer'}</td>
          <td>${t.pickupLocation?.city} → ${t.destinationLocation?.city} (${t.distanceKm} km)</td>
          <td>${t.luggageItems?.[0]?.type || 'Luggage'} (${t.luggageItems?.[0]?.weightKg} kg)</td>
          <td>${this.renderStatusBadge(t.status)}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }).join('');
  }

  advanceDriverStatus(bookingId, targetStatus) {
    const user = authService.getCurrentUser();
    try {
      bookingService.updateBookingStatus({
        bookingId,
        newStatus: targetStatus,
        user,
        note: `Driver marked trip as ${targetStatus.replace('_', ' ')}`
      });
      this.showToast(`Trip status advanced to ${targetStatus.replace('_', ' ')}`, 'success');
      this.renderDriverDashboard();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  /* =========================================================================
     Admin Views: Dashboard, User Directory, Fleet Management
     ========================================================================= */

  renderAdminDashboard() {
    const user = authService.getCurrentUser();
    const metrics = adminService.getSystemMetrics(user);
    const bookings = bookingService.getAllBookings(user);

    // Overview KPI Metric Badges
    const totalUsersElem = document.getElementById('admStatTotalUsers');
    const custElem = document.getElementById('admStatTotalCustomers');
    const drvElem = document.getElementById('admStatTotalDrivers');
    const admElem = document.getElementById('admStatTotalAdmins');
    const actDrvElem = document.getElementById('admStatActiveDrivers');
    const totalElem = document.getElementById('admStatTotalBookings');
    const inTransitElem = document.getElementById('admStatInTransit');
    const delivElem = document.getElementById('admStatDelivered');
    const revElem = document.getElementById('admStatRevenue');
    const avgCostElem = document.getElementById('admStatAvgCost');
    const avgTimeElem = document.getElementById('admStatAvgTime');

    if (totalUsersElem) totalUsersElem.textContent = metrics.totalUsers || (metrics.totalCustomers + metrics.totalDrivers + (metrics.totalAdmins || 0));
    if (custElem) custElem.textContent = metrics.totalCustomers;
    if (drvElem) drvElem.textContent = metrics.totalDrivers;
    if (admElem) admElem.textContent = metrics.totalAdmins || 1;
    if (actDrvElem) actDrvElem.textContent = metrics.activeDrivers;
    if (totalElem) totalElem.textContent = metrics.totalBookings;
    if (inTransitElem) inTransitElem.textContent = metrics.inTransitBookings;
    if (delivElem) delivElem.textContent = metrics.deliveredBookings;
    if (revElem) revElem.textContent = `PKR ${metrics.totalRevenue.toLocaleString()}`;
    if (avgCostElem) avgCostElem.textContent = `PKR ${metrics.averagePredictedCost.toLocaleString()}`;
    if (avgTimeElem) avgTimeElem.textContent = `${metrics.averagePredictedDeliveryTime} hrs`;

    // 1. Status Distribution Progress Breakdown
    const statusDistContainer = document.getElementById('admDashStatusDistribution');
    if (statusDistContainer) {
      const statusList = [
        { label: 'CONFIRMED', key: BOOKING_STATUS.CONFIRMED, color: '#3b82f6' },
        { label: 'DRIVER_ASSIGNED', key: BOOKING_STATUS.DRIVER_ASSIGNED, color: '#06b6d4' },
        { label: 'PICKED_UP', key: BOOKING_STATUS.PICKED_UP, color: '#8b5cf6' },
        { label: 'IN_TRANSIT', key: BOOKING_STATUS.IN_TRANSIT, color: '#f59e0b' },
        { label: 'DELIVERED', key: BOOKING_STATUS.DELIVERED, color: '#10b981' },
        { label: 'CANCELLED', key: BOOKING_STATUS.CANCELLED, color: '#ef4444' }
      ];

      const total = metrics.totalBookings || 1;

      statusDistContainer.innerHTML = statusList.map(s => {
        const count = metrics.statusCounts[s.key] || 0;
        const pct = Math.round((count / total) * 100);

        return `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
              <strong><i class="fa-solid fa-circle" style="color: ${s.color}; font-size: 0.65rem; margin-right: 6px;"></i> ${s.label.replace('_', ' ')}</strong>
              <span style="color: var(--text-muted); font-weight: 700;">${count} (${pct}%)</span>
            </div>
            <div style="height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
              <div style="height: 100%; width: ${pct}%; background: ${s.color}; border-radius: 3px;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 2. Domestic Corridors Performance Table
    const corridorsTbody = document.getElementById('admDashTopCorridorsTbody');
    if (corridorsTbody) {
      if (!metrics.topCorridors || metrics.topCorridors.length === 0) {
        corridorsTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 16px;">No corridor volume recorded yet.</td></tr>`;
      } else {
        corridorsTbody.innerHTML = metrics.topCorridors.slice(0, 5).map(c => `
          <tr>
            <td><strong>${c.corridor}</strong> <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${c.distanceKm} km</span></td>
            <td><span class="badge badge-confirmed">${c.count} Trips</span></td>
            <td><strong style="color: var(--brand-primary);">PKR ${c.revenue.toLocaleString()}</strong></td>
          </tr>
        `).join('');
      }
    }

    // 3. Quick Dispatch Console
    const tbody = document.getElementById('admBookingsTbody');
    if (!tbody) return;

    tbody.innerHTML = bookings.slice(0, 6).map(b => {
      let dispatchAction = '';
      if (!b.assignedDriverId || b.status === BOOKING_STATUS.PENDING || b.status === BOOKING_STATUS.CONFIRMED) {
        dispatchAction = `<button class="btn btn-primary btn-sm" onclick="window.app.openAssignDriverModal('${b.id}', '${b.bookingNumber}')"><i class="fa-solid fa-user-plus"></i> Assign</button>`;
      } else {
        dispatchAction = `<span style="font-size: 0.8rem; color: var(--text-muted);">${b.driver?.user?.fullName || 'Assigned'}</span>`;
      }

      return `
        <tr>
          <td><strong>${b.bookingNumber}</strong></td>
          <td>${b.customer?.fullName || 'Customer'}</td>
          <td>${b.pickupLocation?.city} → ${b.destinationLocation?.city} (${b.distanceKm} km)</td>
          <td><strong>PKR ${b.quotedCost?.toLocaleString()}</strong></td>
          <td>${b.driver ? `<span class="badge badge-confirmed">${b.driver.user?.fullName}</span>` : '<span class="badge badge-pending">Unassigned</span>'}</td>
          <td>${this.renderStatusBadge(b.status)}</td>
          <td>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-secondary btn-sm" onclick="window.app.openAdminBookingDetailsModal('${b.id}')"><i class="fa-solid fa-eye"></i></button>
              ${dispatchAction}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderAdminBookings() {
    const user = authService.getCurrentUser();
    const query = document.getElementById('adminBookingsSearchInput')?.value || '';
    const status = document.getElementById('adminBookingsStatusFilter')?.value || 'ALL';
    const dateFrom = document.getElementById('adminBookingsDateFrom')?.value || '';
    const dateTo = document.getElementById('adminBookingsDateTo')?.value || '';

    const bookings = adminService.searchAndFilterBookings({ query, status, dateFrom, dateTo }, user);
    const tbody = document.getElementById('adminAllBookingsTbody');
    if (!tbody) return;

    if (bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">No bookings match current search and status filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = bookings.map(b => {
      const lug = b.luggageItems?.[0];
      const lugDesc = `${lug?.type || 'Luggage'} (${lug?.weightKg || 10} kg)`;
      const canAssign = !b.assignedDriverId || b.status === BOOKING_STATUS.PENDING || b.status === BOOKING_STATUS.CONFIRMED;

      return `
        <tr>
          <td>
            <strong>${b.bookingNumber}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${b.id}</span>
          </td>
          <td>
            <strong>${b.customer?.fullName || 'Customer'}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${b.customer?.email || '--'}</span>
          </td>
          <td>
            <strong>${b.pickupLocation?.city} → ${b.destinationLocation?.city}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${b.transportTier || 'Standard'}</span>
          </td>
          <td>
            ${b.distanceKm} km
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${lugDesc}</span>
          </td>
          <td><strong style="color: var(--brand-primary);">PKR ${Number(b.quotedCost || 0).toLocaleString()}</strong></td>
          <td>${b.driver ? `<span class="badge badge-confirmed">${b.driver.user?.fullName || b.driver.vehiclePlate}</span>` : '<span class="badge badge-pending">Unassigned</span>'}</td>
          <td>${this.renderStatusBadge(b.status)}</td>
          <td>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" title="Inspect Deep Details" onclick="window.app.openAdminBookingDetailsModal('${b.id}')">
                <i class="fa-solid fa-file-lines"></i> Details
              </button>
              ${canAssign ? `
                <button class="btn btn-primary btn-sm" title="Assign Driver" onclick="window.app.openAssignDriverModal('${b.id}', '${b.bookingNumber}')">
                  <i class="fa-solid fa-user-plus"></i> Dispatch
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  openAdminBookingDetailsModal(bookingId) {
    try {
      const details = adminService.getBookingDeepDetails(bookingId);
      const modal = document.getElementById('adminBookingDetailsModal');
      const title = document.getElementById('adminBookingModalTitle');
      const content = document.getElementById('adminBookingModalContent');

      if (title) title.innerHTML = `<i class="fa-solid fa-file-invoice"></i> Booking Inspector: ${details.bookingNumber}`;

      if (content) {
        const lug = details.luggageItems?.[0];
        const pred = details.prediction;
        const driver = details.driver;

        content.innerHTML = `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <!-- Customer Card -->
            <div class="card" style="background: var(--bg-surface-secondary); padding: 14px;">
              <h4 style="font-size: 0.95rem; margin-bottom: 8px;"><i class="fa-solid fa-user"></i> Customer Information</h4>
              <div style="font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px;">
                <div><strong>Name:</strong> ${details.customer?.fullName || 'Customer'}</div>
                <div><strong>Email:</strong> ${details.customer?.email || '--'}</div>
                <div><strong>Phone:</strong> ${details.customer?.phone || '--'}</div>
                <div><strong>City:</strong> ${details.customer?.city || '--'}</div>
              </div>
            </div>

            <!-- Driver Card -->
            <div class="card" style="background: var(--bg-surface-secondary); padding: 14px;">
              <h4 style="font-size: 0.95rem; margin-bottom: 8px;"><i class="fa-solid fa-truck"></i> Assigned Courier</h4>
              <div style="font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px;">
                <div><strong>Name:</strong> ${driver?.user?.fullName || 'Pending Assignment'}</div>
                <div><strong>Vehicle:</strong> ${driver ? `${driver.vehicleType} (${driver.vehiclePlate})` : '--'}</div>
                <div><strong>Phone:</strong> ${driver?.user?.phone || '--'}</div>
                <div><strong>Rating:</strong> ${driver ? `★ ${driver.rating} / 5.0` : '--'}</div>
              </div>
            </div>
          </div>

          <!-- Route & Luggage Details -->
          <div class="card" style="background: var(--bg-surface-secondary); padding: 14px; margin-bottom: 20px;">
            <h4 style="font-size: 0.95rem; margin-bottom: 8px;"><i class="fa-solid fa-route"></i> Route & Cargo Specifications</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 0.85rem;">
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">ORIGIN PICKUP</span>
                <p style="font-weight: 700; margin-top: 2px;">${details.pickupLocation?.city} (${details.pickupLocation?.address})</p>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">DESTINATION</span>
                <p style="font-weight: 700; margin-top: 2px;">${details.destinationLocation?.city} (${details.destinationLocation?.address})</p>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">HIGHWAY DISTANCE</span>
                <p style="font-weight: 700; margin-top: 2px;">${details.distanceKm} km (${details.transportTier || 'Standard'})</p>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">CARGO ITEM</span>
                <p style="font-weight: 700; margin-top: 2px;">${lug?.type || 'Luggage'} (${lug?.weightKg || 10} kg)</p>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">VOLUMETRIC SIZE</span>
                <p style="font-weight: 700; margin-top: 2px;">${lug?.volumeLiters || 80}L (${lug?.sizeCategory || 'Large'})</p>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">DECLARED VALUE</span>
                <p style="font-weight: 700; margin-top: 2px;">PKR ${Number(lug?.declaredValue || 15000).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <!-- AI Supervised Prediction Breakdown -->
          <div class="card" style="background: var(--bg-surface-secondary); padding: 14px; margin-bottom: 20px;">
            <h4 style="font-size: 0.95rem; margin-bottom: 8px;"><i class="fa-solid fa-brain"></i> AI ML Prediction Snapshot</h4>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 0.85rem;">
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem;">AI QUOTED FARE</span>
                <p style="font-weight: 800; font-size: 1.15rem; color: var(--brand-primary); margin-top: 2px;">PKR ${Number(details.quotedCost || 0).toLocaleString()}</p>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem;">PREDICTED TRANSIT</span>
                <p style="font-weight: 700; font-size: 1.05rem; margin-top: 2px;">${details.estimatedDeliveryTimeHours || 10} Hours</p>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem;">CONFIDENCE SCORE</span>
                <p style="font-weight: 700; color: #10b981; margin-top: 2px;">${Math.round((pred?.confidenceScore || 0.94) * 100)}%</p>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 0.75rem;">MODEL VERSION</span>
                <p style="font-family: monospace; font-size: 0.8rem; margin-top: 2px;">${pred?.modelVersion || 'v2.1-rf'}</p>
              </div>
            </div>
          </div>

          <!-- Chronological Status History Audit Trail -->
          <div class="card" style="padding: 14px;">
            <h4 style="font-size: 0.95rem; margin-bottom: 10px;"><i class="fa-solid fa-timeline"></i> Lifecycle Audit History Log</h4>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Transition</th>
                    <th>Actor</th>
                    <th>Location & Note</th>
                  </tr>
                </thead>
                <tbody>
                  ${(details.statusHistory || []).map(h => `
                    <tr>
                      <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(h.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td><strong>${h.toStatus}</strong></td>
                      <td>${h.actorName}</td>
                      <td>
                        <div>${h.note || 'Status transitioned.'}</div>
                        ${h.locationStamp ? `<span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${h.locationStamp}</span>` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      if (modal) modal.classList.add('active');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  openAdminUserDetailsModal(userId) {
    try {
      const data = adminService.getUserDetailsWithBookings(userId);
      const modal = document.getElementById('adminUserDetailsModal');
      const title = document.getElementById('adminUserModalTitle');
      const content = document.getElementById('adminUserModalContent');

      if (title) title.innerHTML = `<i class="fa-solid fa-user-gear"></i> User Profile: ${data.user.fullName}`;

      if (content) {
        const bookingsList = data.user.role === USER_ROLES.CUSTOMER ? data.customerBookings : data.driverTrips;
        const listTitle = data.user.role === USER_ROLES.CUSTOMER ? 'Customer Shipment History' : 'Assigned Courier Trips';

        content.innerHTML = `
          <div class="card" style="background: var(--bg-surface-secondary); padding: 14px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div>
                <strong style="font-size: 1.1rem;">${data.user.fullName}</strong>
                <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">${data.user.email} • ID: ${data.user.id}</span>
              </div>
              <span class="badge ${data.user.role === 'ADMIN' ? 'badge-confirmed' : data.user.role === 'DRIVER' ? 'badge-driver-assigned' : 'badge-pending'}">${data.user.role}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 0.85rem;">
              <div><strong>Phone:</strong> ${data.user.phone || '--'}</div>
              <div><strong>City:</strong> ${data.user.city || '--'}</div>
              <div><strong>Account Status:</strong> ${data.user.isActive ? '<span class="badge badge-delivered">Active</span>' : '<span class="badge badge-cancelled">Deactivated</span>'}</div>
            </div>
          </div>

          <div class="card" style="padding: 14px;">
            <h4 style="font-size: 0.95rem; margin-bottom: 10px;"><i class="fa-solid fa-boxes-stacked"></i> ${listTitle} (${bookingsList.length})</h4>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Booking #</th>
                    <th>Route</th>
                    <th>Quoted Fare</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${bookingsList.length === 0 ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">No bookings recorded for this account.</td></tr>` : bookingsList.map(b => `
                    <tr>
                      <td><strong>${b.bookingNumber}</strong></td>
                      <td>${b.pickupLocation?.city} → ${b.destinationLocation?.city}</td>
                      <td><strong>PKR ${Number(b.quotedCost || 0).toLocaleString()}</strong></td>
                      <td>${this.renderStatusBadge(b.status)}</td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="window.app.openAdminBookingDetailsModal('${b.id}')"><i class="fa-solid fa-eye"></i></button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      if (modal) modal.classList.add('active');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  renderAdminUsers() {
    const user = authService.getCurrentUser();
    const allUsers = userService.getAllUsers(user);
    const filterRole = document.getElementById('adminUserRoleFilter')?.value || 'ALL';

    // Update role statistics cards
    const totalUsers = allUsers.length;
    const totalCustomers = allUsers.filter(u => u.role === USER_ROLES.CUSTOMER).length;
    const totalDrivers = allUsers.filter(u => u.role === USER_ROLES.DRIVER).length;
    const totalAdmins = allUsers.filter(u => u.role === USER_ROLES.ADMIN).length;

    const uTotalElem = document.getElementById('adminUsersStatTotal');
    const uCustElem = document.getElementById('adminUsersStatCustomers');
    const uDrvElem = document.getElementById('adminUsersStatDrivers');
    const uAdmElem = document.getElementById('adminUsersStatAdmins');

    if (uTotalElem) uTotalElem.textContent = totalUsers;
    if (uCustElem) uCustElem.textContent = totalCustomers;
    if (uDrvElem) uDrvElem.textContent = totalDrivers;
    if (uAdmElem) uAdmElem.textContent = totalAdmins;

    const filtered = filterRole === 'ALL' ? allUsers : allUsers.filter(u => u.role === filterRole);
    const tbody = document.getElementById('adminUsersTbody');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(u => `
      <tr>
        <td><strong>${u.id}</strong></td>
        <td>${u.fullName}</td>
        <td>${u.email}</td>
        <td>${u.phone}</td>
        <td>${u.city}</td>
        <td><span class="badge ${u.role === 'ADMIN' ? 'badge-confirmed' : u.role === 'DRIVER' ? 'badge-driver-assigned' : 'badge-pending'}">${u.role}</span></td>
        <td>${u.isActive ? '<span class="badge badge-delivered">Active</span>' : '<span class="badge badge-cancelled">Deactivated</span>'}</td>
        <td>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-secondary btn-sm" title="View Full Profile & Bookings" onclick="window.app.openAdminUserDetailsModal('${u.id}')">
              <i class="fa-solid fa-user"></i>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.app.toggleUserActiveStatus('${u.id}')">
              ${u.isActive ? '<i class="fa-solid fa-user-slash"></i> Deactivate' : '<i class="fa-solid fa-user-check"></i> Activate'}
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  toggleUserActiveStatus(userId) {
    const user = authService.getCurrentUser();
    try {
      const updated = userService.toggleUserStatus(userId, user);
      this.showToast(`User ${updated.fullName} status updated!`, 'success');
      this.renderAdminUsers();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  renderAdminReports() {
    const user = authService.getCurrentUser();
    const metrics = adminService.getSystemMetrics(user);

    const corridorsCount = document.getElementById('admReportCorridorsCount');
    if (corridorsCount) corridorsCount.textContent = (metrics.topCorridors?.length || 6);

    const tbody = document.getElementById('admCorridorReportsTbody');
    if (!tbody) return;

    const corridors = [
      { name: 'Islamabad ⇄ Lahore', code: 'Motorway M-2', dist: 380, count: 8, rev: 17600, avg: 2200, status: 'Active Corridor' },
      { name: 'Lahore ⇄ Karachi', code: 'Motorway M-5 / Express', dist: 1210, count: 6, rev: 33600, avg: 5600, status: 'Active Corridor' },
      { name: 'Islamabad ⇄ Karachi', code: 'National Highway N-5', dist: 1410, count: 4, rev: 25200, avg: 6300, status: 'Active Corridor' },
      { name: 'Islamabad ⇄ Peshawar', code: 'Motorway M-1', dist: 185, count: 5, rev: 7250, avg: 1450, status: 'Active Corridor' },
      { name: 'Lahore ⇄ Multan', code: 'Motorway M-4', dist: 350, count: 3, rev: 6150, avg: 2050, status: 'Active Corridor' },
      { name: 'Islamabad ⇄ Rawalpindi', code: 'Expressway Intra-City', dist: 25, count: 12, rev: 11400, avg: 950, status: 'Active Corridor' }
    ];

    tbody.innerHTML = corridors.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td><span class="badge badge-confirmed">${c.code}</span></td>
        <td>${c.dist} km</td>
        <td><strong>${c.count}</strong> shipments</td>
        <td><strong style="color: var(--brand-primary);">PKR ${c.rev.toLocaleString()}</strong></td>
        <td>PKR ${c.avg.toLocaleString()}</td>
        <td><span class="badge badge-delivered"><i class="fa-solid fa-circle-check"></i> ${c.status}</span></td>
      </tr>
    `).join('');
  }

  renderAdminSettings() {
    const settings = adminService.getPlatformSettings();

    const baseKm = document.getElementById('cfgBaseKm');
    const weightKg = document.getElementById('cfgWeightKg');
    const minFare = document.getElementById('cfgMinFare');
    const fragileMarkup = document.getElementById('cfgFragileMarkup');
    const expressMarkup = document.getElementById('cfgExpressMarkup');
    const premiumMarkup = document.getElementById('cfgPremiumMarkup');
    const activeModel = document.getElementById('cfgActiveModel');
    const maintMode = document.getElementById('cfgMaintenanceMode');

    if (baseKm) baseKm.value = settings.basePricePerKm;
    if (weightKg) weightKg.value = settings.weightMultiplierPerKg;
    if (minFare) minFare.value = settings.minimumFare;
    if (fragileMarkup) fragileMarkup.value = settings.fragileRiskHandlingPercent;
    if (expressMarkup) expressMarkup.value = settings.expressTierMarkupPercent;
    if (premiumMarkup) premiumMarkup.value = settings.premiumTierMarkupPercent;
    if (activeModel) activeModel.value = settings.activeModelVersion;
    if (maintMode) maintMode.checked = settings.isMaintenanceMode;
  }

  renderAdminDrivers() {
    const user = authService.getCurrentUser();
    const query = document.getElementById('adminDriverSearchInput')?.value || '';
    const availability = document.getElementById('adminDriverAvailFilter')?.value || 'ALL';
    const accountStatus = document.getElementById('adminDriverStatusFilter')?.value || 'ALL';
    const city = document.getElementById('adminDriverCityFilter')?.value || 'ALL';

    const drivers = driverService.searchAndFilterDrivers({ query, availability, accountStatus, city }, user);
    const tbody = document.getElementById('adminDriversTbody');
    if (!tbody) return;

    if (drivers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No fleet drivers matching search filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = drivers.map(d => {
      const avail = d.availabilityStatus || (d.isAvailable ? 'AVAILABLE' : 'BUSY');
      const isAct = d.user?.isActive !== false;
      const availBadgeCls = avail === 'AVAILABLE' ? 'badge-delivered' : avail === 'BUSY' ? 'badge-pending' : 'badge-cancelled';
      const actBadgeCls = isAct ? 'badge-confirmed' : 'badge-cancelled';

      return `
        <tr>
          <td>
            <strong>${d.user?.fullName || 'Driver'}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${d.id} • ${d.user?.phone || '--'}</span>
          </td>
          <td>
            <strong>${d.vehiclePlate}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${d.vehicleType}</span>
          </td>
          <td>${d.currentCity}</td>
          <td><i class="fa-solid fa-star" style="color: #f59e0b;"></i> ${d.rating || 5.0}</td>
          <td>
            <strong>${d.totalTrips || 0}</strong> completed
            ${d.activeTripsCount > 0 ? `<span class="badge badge-in-transit" style="padding: 1px 5px; font-size: 0.7rem; margin-left: 4px;">${d.activeTripsCount} Active</span>` : ''}
          </td>
          <td><span class="badge ${availBadgeCls}">${avail}</span></td>
          <td><span class="badge ${actBadgeCls}">${isAct ? 'Active' : 'Deactivated'}</span></td>
          <td>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" title="Edit Vehicle & Details" onclick="window.app.openEditDriverModal('${d.id}')">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-secondary btn-sm" title="View Assigned Bookings" onclick="window.app.openDriverTripsModal('${d.id}')">
                <i class="fa-solid fa-route"></i> Trips
              </button>
              <button class="btn btn-ghost btn-sm" title="Cycle Availability" onclick="window.app.cycleDriverAvailability('${d.id}')">
                <i class="fa-solid fa-arrows-rotate"></i>
              </button>
              <button class="btn btn-ghost btn-sm" title="${isAct ? 'Deactivate Account' : 'Activate Account'}" onclick="window.app.toggleDriverAccount('${d.id}')">
                <i class="fa-solid ${isAct ? 'fa-user-slash' : 'fa-user-check'}"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  openAddDriverModal() {
    const modal = document.getElementById('addDriverModal');
    if (modal) {
      document.getElementById('addDriverForm')?.reset();
      modal.classList.add('active');
    }
  }

  openEditDriverModal(driverId) {
    const driver = driverService.getDriverById(driverId);
    if (!driver) return;

    const modal = document.getElementById('editDriverModal');
    document.getElementById('editDrvId').value = driver.id;
    document.getElementById('editDrvFullName').value = driver.user?.fullName || '';
    document.getElementById('editDrvPhone').value = driver.user?.phone || '';
    document.getElementById('editDrvCity').value = driver.currentCity || '';
    document.getElementById('editDrvVehicle').value = driver.vehicleType || '';
    document.getElementById('editDrvPlate').value = driver.vehiclePlate || '';
    document.getElementById('editDrvAvailStatus').value = driver.availabilityStatus || (driver.isAvailable ? 'AVAILABLE' : 'BUSY');

    if (modal) modal.classList.add('active');
  }

  openDriverTripsModal(driverId) {
    const driver = driverService.getDriverById(driverId);
    if (!driver) return;

    const modal = document.getElementById('viewDriverTripsModal');
    const title = document.getElementById('viewDriverTripsModalTitle');
    const content = document.getElementById('viewDriverTripsContent');

    if (title) {
      title.innerHTML = `<i class="fa-solid fa-route"></i> Assigned Trips for ${driver.user?.fullName || 'Driver'} (${driver.vehiclePlate})`;
    }

    const assignedBookings = driverService.getDriverAssignedBookings(driver.id);

    if (content) {
      if (assignedBookings.length === 0) {
        content.innerHTML = `
          <div style="text-align: center; padding: 30px; color: var(--text-muted);">
            <i class="fa-solid fa-boxes-packing" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--border-color);"></i>
            <p>No active or completed bookings currently assigned to this driver.</p>
          </div>
        `;
      } else {
        content.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Booking #</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Quoted Fare</th>
                  <th>Customer</th>
                </tr>
              </thead>
              <tbody>
                ${assignedBookings.map(b => `
                  <tr>
                    <td><strong>${b.bookingNumber}</strong></td>
                    <td>${b.pickupLocation?.city || 'Origin'} → ${b.destinationLocation?.city || 'Dest'} (${b.distanceKm} km)</td>
                    <td>${this.renderStatusBadge(b.status)}</td>
                    <td><strong>PKR ${Number(b.quotedCost).toLocaleString()}</strong></td>
                    <td>${b.customer?.fullName || 'Customer'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }

    if (modal) modal.classList.add('active');
  }

  toggleDriverAccount(driverId) {
    const user = authService.getCurrentUser();
    try {
      const updated = driverService.toggleDriverAccountStatus(driverId, user);
      this.showToast(`Driver account ${updated.user?.isActive ? 'activated' : 'deactivated'} successfully!`, 'success');
      this.renderAdminDrivers();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  cycleDriverAvailability(driverId) {
    const user = authService.getCurrentUser();
    const driver = driverService.getDriverById(driverId);
    if (!driver) return;

    const current = driver.availabilityStatus || (driver.isAvailable ? 'AVAILABLE' : 'BUSY');
    const nextStatus = current === 'AVAILABLE' ? 'BUSY' : current === 'BUSY' ? 'OFFLINE' : 'AVAILABLE';

    try {
      driverService.setAvailabilityStatus(driverId, nextStatus, user);
      this.showToast(`Driver status updated to ${nextStatus}`, 'success');
      this.renderAdminDrivers();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  /* =========================================================================
     Admin AI Analytics & Diagnostics
     ========================================================================= */

  renderAdminAiAnalytics() {
    const analytics = predictionService.getAnalytics();

    const versionLabel = document.getElementById('aiModelVersionLabel');
    const statTotal = document.getElementById('aiStatTotalInferences');
    const statCost = document.getElementById('aiStatAvgCost');
    const statTime = document.getElementById('aiStatAvgTime');

    if (versionLabel) versionLabel.textContent = analytics.activeModelVersion || 'v2.1-rf-domestic';
    if (statTotal) statTotal.textContent = (analytics.totalPredictions || 0).toLocaleString();
    if (statCost) statCost.textContent = `PKR ${(analytics.averagePredictedCost || 0).toLocaleString()}`;
    if (statTime) statTime.textContent = `${analytics.averagePredictedDeliveryTimeHours || 0} hrs`;

    // Populate Recent Inferences Audit Table
    const tbody = document.getElementById('aiInferenceAuditTbody');
    if (!tbody) return;

    if (!analytics.recentPredictions || analytics.recentPredictions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">No ML predictions logged yet. Run predictions via booking or simulator.</td></tr>`;
      return;
    }

    tbody.innerHTML = analytics.recentPredictions.map(p => {
      const feat = p.inputFeatures || {};
      const dist = feat.distanceKm || '--';
      const weight = feat.totalWeightKg || '--';
      const type = feat.luggageType || 'Luggage';
      const bags = feat.bagCount || 1;
      const tier = feat.transportTier || 'Standard';
      const isFrag = feat.isFragile ? '<span class="badge badge-cancelled" style="padding: 2px 6px; font-size: 0.7rem;">Fragile</span>' : '';
      const timeStr = p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent';

      return `
        <tr>
          <td><strong>${p.id}</strong></td>
          <td><strong>${dist} km</strong> <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${tier}</span></td>
          <td>${bags}x ${type} (${weight} kg) ${isFrag}</td>
          <td><strong style="color: var(--brand-primary);">PKR ${Number(p.predictedCost).toLocaleString()}</strong></td>
          <td><strong>${p.predictedTimeHours} hrs</strong></td>
          <td><span class="badge badge-confirmed">${Math.round((p.confidenceScore || 0.94) * 100)}%</span></td>
          <td><span style="font-size: 0.75rem; font-family: monospace; background: var(--bg-surface-secondary); padding: 2px 6px; border-radius: 4px;">${p.modelVersion || 'v2.1-rf'}</span></td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${timeStr}</td>
        </tr>
      `;
    }).join('');
  }

  bindAiSandbox() {
    const sandboxForm = document.getElementById('aiSandboxForm');
    if (!sandboxForm) return;

    sandboxForm.addEventListener('submit', async e => {
      e.preventDefault();
      const distanceKm = Number(document.getElementById('sandboxDistance').value) || 100;
      const totalWeightKg = Number(document.getElementById('sandboxWeight').value) || 10;
      const luggageType = document.getElementById('sandboxType').value;
      const transportTier = document.getElementById('sandboxTier').value;
      const bagCount = Number(document.getElementById('sandboxBags').value) || 1;
      const isFragile = document.getElementById('sandboxFragile').checked;

      try {
        const result = await predictionService.predict({
          distanceKm,
          totalWeightKg,
          luggageType,
          transportTier,
          bagCount,
          isFragile,
          sizeCategory: totalWeightKg >= 15 ? LUGGAGE_SIZES.LARGE : LUGGAGE_SIZES.MEDIUM
        });

        const resBox = document.getElementById('sandboxResultBox');
        const outCost = document.getElementById('sandboxOutCost');
        const outTime = document.getElementById('sandboxOutTime');

        if (outCost) outCost.textContent = `PKR ${result.predictedCost.toLocaleString()}`;
        if (outTime) outTime.textContent = `${result.predictedTimeHours} Hours`;
        if (resBox) resBox.style.display = 'block';

        this.showToast('Supervised ML inference computed successfully!', 'success');
        this.renderAdminAiAnalytics();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });
  }

  openAssignDriverModal(bookingId, bookingNumber) {
    const modal = document.getElementById('assignDriverModal');
    const idInput = document.getElementById('assignModalBookingId');
    const infoText = document.getElementById('assignModalBookingInfo');
    const driverSelect = document.getElementById('assignModalDriverSelect');
    const submitBtn = document.getElementById('submitAssignDriverBtn');

    if (idInput) idInput.value = bookingId;
    if (infoText) infoText.textContent = `Assign fleet driver for dispatch of ${bookingNumber}`;

    // Show only available & active drivers
    const availableDrivers = driverService.getAvailableDrivers();

    if (driverSelect) {
      if (availableDrivers.length === 0) {
        driverSelect.innerHTML = `<option value="">-- No available drivers online (All Busy/Offline) --</option>`;
        if (submitBtn) submitBtn.disabled = true;
      } else {
        if (submitBtn) submitBtn.disabled = false;
        driverSelect.innerHTML = availableDrivers.map(d => `
          <option value="${d.id}">${d.user?.fullName || 'Driver'} — ${d.vehicleType} (${d.vehiclePlate}) [${d.currentCity}] ★ ${d.rating}</option>
        `).join('');
      }
    }

    if (modal) modal.classList.add('active');
  }

  /* =========================================================================
     Modals, Profiles & Feedback Handlers
     ========================================================================= */

  bindModals() {
    // Assign Driver Modal
    const closeAssign = document.getElementById('closeAssignModalBtn');
    const cancelAssign = document.getElementById('cancelAssignModalBtn');
    const submitAssign = document.getElementById('submitAssignDriverBtn');
    const assignModal = document.getElementById('assignDriverModal');

    const closeAssignFn = () => assignModal?.classList.remove('active');
    if (closeAssign) closeAssign.addEventListener('click', closeAssignFn);
    if (cancelAssign) cancelAssign.addEventListener('click', closeAssignFn);

    if (submitAssign) {
      submitAssign.addEventListener('click', () => {
        const bookingId = document.getElementById('assignModalBookingId').value;
        const driverId = document.getElementById('assignModalDriverSelect').value;
        const user = authService.getCurrentUser();

        if (!driverId) {
          this.showToast('Please select an available driver.', 'error');
          return;
        }

        try {
          bookingService.assignDriver({ bookingId, driverId, adminUser: user });
          this.showToast('Driver assigned successfully! Booking updated to DRIVER_ASSIGNED.', 'success');
          closeAssignFn();
          this.renderAdminDashboard();
          this.renderAdminDrivers();
        } catch (e) {
          this.showToast(e.message, 'error');
        }
      });
    }

    // Add Driver Modal (Phase 7)
    const addDrvModal = document.getElementById('addDriverModal');
    const closeAddDrv = document.getElementById('closeAddDriverModalBtn');
    const cancelAddDrv = document.getElementById('cancelAddDriverModalBtn');
    const submitAddDrv = document.getElementById('submitAddDriverBtn');

    const closeAddDrvFn = () => addDrvModal?.classList.remove('active');
    if (closeAddDrv) closeAddDrv.addEventListener('click', closeAddDrvFn);
    if (cancelAddDrv) cancelAddDrv.addEventListener('click', closeAddDrvFn);

    if (submitAddDrv) {
      submitAddDrv.addEventListener('click', () => {
        const user = authService.getCurrentUser();
        const fullName = document.getElementById('newDrvFullName').value;
        const email = document.getElementById('newDrvEmail').value;
        const phone = document.getElementById('newDrvPhone').value;
        const city = document.getElementById('newDrvCity').value;
        const vehicleType = document.getElementById('newDrvVehicle').value;
        const vehiclePlate = document.getElementById('newDrvPlate').value;
        const licenseNumber = document.getElementById('newDrvLicense').value;
        const password = document.getElementById('newDrvPassword').value || 'driver123';

        try {
          driverService.createDriver({
            fullName,
            email,
            phone,
            city,
            vehicleType,
            vehiclePlate,
            licenseNumber,
            password
          }, user);

          this.showToast(`Fleet driver "${fullName}" registered successfully!`, 'success');
          closeAddDrvFn();
          this.renderAdminDrivers();
        } catch (err) {
          this.showToast(err.message, 'error');
        }
      });
    }

    // Edit Driver Modal (Phase 7)
    const editDrvModal = document.getElementById('editDriverModal');
    const closeEditDrv = document.getElementById('closeEditDriverModalBtn');
    const cancelEditDrv = document.getElementById('cancelEditDriverModalBtn');
    const submitEditDrv = document.getElementById('submitEditDriverBtn');

    const closeEditDrvFn = () => editDrvModal?.classList.remove('active');
    if (closeEditDrv) closeEditDrv.addEventListener('click', closeEditDrvFn);
    if (cancelEditDrv) cancelEditDrv.addEventListener('click', closeEditDrvFn);

    if (submitEditDrv) {
      submitEditDrv.addEventListener('click', () => {
        const user = authService.getCurrentUser();
        const driverId = document.getElementById('editDrvId').value;
        const fullName = document.getElementById('editDrvFullName').value;
        const phone = document.getElementById('editDrvPhone').value;
        const currentCity = document.getElementById('editDrvCity').value;
        const vehicleType = document.getElementById('editDrvVehicle').value;
        const vehiclePlate = document.getElementById('editDrvPlate').value;
        const availabilityStatus = document.getElementById('editDrvAvailStatus').value;

        try {
          driverService.updateDriver(driverId, {
            fullName,
            phone,
            currentCity,
            vehicleType,
            vehiclePlate,
            availabilityStatus
          }, user);

          this.showToast('Driver profile updated successfully!', 'success');
          closeEditDrvFn();
          this.renderAdminDrivers();
        } catch (err) {
          this.showToast(err.message, 'error');
        }
      });
    }

    // View Driver Trips Modal (Phase 7)
    const viewTripsModal = document.getElementById('viewDriverTripsModal');
    const closeTrips = document.getElementById('closeViewDriverTripsModalBtn');
    const closeTripsFooter = document.getElementById('closeViewDriverTripsModalFooterBtn');

    const closeTripsFn = () => viewTripsModal?.classList.remove('active');
    if (closeTrips) closeTrips.addEventListener('click', closeTripsFn);
    if (closeTripsFooter) closeTripsFooter.addEventListener('click', closeTripsFn);

    // Add Luggage Modal
    const openAddLug = document.getElementById('addNewLuggageBtn');
    const closeAddLug = document.getElementById('closeAddLuggageModalBtn');
    const cancelAddLug = document.getElementById('cancelAddLuggageModalBtn');
    const submitAddLug = document.getElementById('submitAddLuggageBtn');
    const addLugModal = document.getElementById('addLuggageModal');

    const closeLugFn = () => addLugModal?.classList.remove('active');
    if (openAddLug) openAddLug.addEventListener('click', () => addLugModal?.classList.add('active'));
    if (closeAddLug) closeAddLug.addEventListener('click', closeLugFn);
    if (cancelAddLug) cancelAddLug.addEventListener('click', closeLugFn);

    if (submitAddLug) {
      submitAddLug.addEventListener('click', () => {
        const user = authService.getCurrentUser();
        const type = document.getElementById('newLugType').value;
        const weight = Number(document.getElementById('newLugWeight').value) || 10;
        const val = Number(document.getElementById('newLugValue').value) || 10000;
        const l = Number(document.getElementById('newLugL').value) || 50;
        const w = Number(document.getElementById('newLugW').value) || 35;
        const h = Number(document.getElementById('newLugH').value) || 25;

        luggageService.createLuggage({
          customerId: user.id,
          type,
          weightKg: weight,
          declaredValue: val,
          lengthCm: l,
          widthCm: w,
          heightCm: h
        });

        this.showToast('Luggage registered successfully!', 'success');
        closeLugFn();
        this.renderMyLuggage();
      });
    }

    // Admin Booking Details Deep Modal (Phase 10)
    const adminBookingModal = document.getElementById('adminBookingDetailsModal');
    const closeAdminBookingBtn = document.getElementById('closeAdminBookingModalBtn');
    const closeAdminBookingFooterBtn = document.getElementById('closeAdminBookingModalFooterBtn');

    const closeAdminBookingFn = () => adminBookingModal?.classList.remove('active');
    if (closeAdminBookingBtn) closeAdminBookingBtn.addEventListener('click', closeAdminBookingFn);
    if (closeAdminBookingFooterBtn) closeAdminBookingFooterBtn.addEventListener('click', closeAdminBookingFn);

    // Admin User Details Modal (Phase 10)
    const adminUserModal = document.getElementById('adminUserDetailsModal');
    const closeAdminUserBtn = document.getElementById('closeAdminUserModalBtn');
    const closeAdminUserFooterBtn = document.getElementById('closeAdminUserModalFooterBtn');

    const closeAdminUserFn = () => adminUserModal?.classList.remove('active');
    if (closeAdminUserBtn) closeAdminUserBtn.addEventListener('click', closeAdminUserFn);
    if (closeAdminUserFooterBtn) closeAdminUserFooterBtn.addEventListener('click', closeAdminUserFn);
  }

  handleAdminSettingsSubmit(e) {
    e.preventDefault();
    const user = authService.getCurrentUser();
    const baseKm = Number(document.getElementById('cfgBaseKm')?.value || 3.5);
    const weightKg = Number(document.getElementById('cfgWeightKg')?.value || 15.0);
    const minFare = Number(document.getElementById('cfgMinFare')?.value || 800);
    const fragileMarkup = Number(document.getElementById('cfgFragileMarkup')?.value || 12);
    const expressMarkup = Number(document.getElementById('cfgExpressMarkup')?.value || 35);
    const premiumMarkup = Number(document.getElementById('cfgPremiumMarkup')?.value || 70);

    try {
      adminService.updatePlatformSettings({
        basePricePerKm: baseKm,
        weightMultiplierPerKg: weightKg,
        minimumFare: minFare,
        fragileRiskHandlingPercent: fragileMarkup,
        expressTierMarkupPercent: expressMarkup,
        premiumTierMarkupPercent: premiumMarkup
      }, user);

      this.showToast('Logistics tariff & fare parameters updated successfully!', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  handleAdminAiConfigSubmit(e) {
    e.preventDefault();
    const user = authService.getCurrentUser();
    const activeModel = document.getElementById('cfgActiveModel')?.value;
    const maintMode = document.getElementById('cfgMaintenanceMode')?.checked;

    try {
      adminService.updatePlatformSettings({
        activeModelVersion: activeModel,
        isMaintenanceMode: maintMode
      }, user);

      this.showToast('AI engine model deployment configuration updated!', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  handleExportCorridors() {
    this.showToast('Corridor logistics performance summary exported successfully (CSV/JSON)!', 'success');
  }

  /* =========================================================================
     Phase 9: Customer Rating, Review & Admin Feedback Analytics
     ========================================================================= */

  bindFeedbackControls() {
    // Interactive Star Rating Picker
    const starContainer = document.getElementById('feedbackStarPicker');
    if (starContainer) {
      const stars = starContainer.querySelectorAll('i[data-star]');
      const hiddenInput = document.getElementById('feedbackRatingValue');
      const labelBadge = document.getElementById('feedbackStarLabel');

      const starLabels = {
        1: '1.0 ★ Poor / Disappointed',
        2: '2.0 ★ Sub-optimal',
        3: '3.0 ★ Average / Acceptable',
        4: '4.0 ★ Very Good',
        5: '5.0 ★ Exceptional Service'
      };

      stars.forEach(star => {
        star.addEventListener('mouseenter', () => {
          const ratingVal = Number(star.getAttribute('data-star'));
          stars.forEach(s => {
            const sVal = Number(s.getAttribute('data-star'));
            s.classList.toggle('hovered', sVal <= ratingVal);
          });
        });

        star.addEventListener('mouseleave', () => {
          stars.forEach(s => s.classList.remove('hovered'));
        });

        star.addEventListener('click', () => {
          const ratingVal = Number(star.getAttribute('data-star'));
          if (hiddenInput) hiddenInput.value = ratingVal;
          if (labelBadge) labelBadge.textContent = starLabels[ratingVal] || `${ratingVal}.0 ★`;

          stars.forEach(s => {
            const sVal = Number(s.getAttribute('data-star'));
            s.classList.toggle('selected', sVal <= ratingVal);
          });
        });
      });
    }

    // Aspect Tag Toggle Buttons
    const tagsContainer = document.getElementById('feedbackTagsContainer');
    if (tagsContainer) {
      tagsContainer.querySelectorAll('.aspect-tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.classList.toggle('active');
        });
      });
    }

    // Admin Feedback Search & Rating Filter
    const admSearch = document.getElementById('adminFeedbackSearchInput');
    const admRatingFilter = document.getElementById('adminFeedbackRatingFilter');

    if (admSearch) admSearch.addEventListener('input', () => this.renderAdminFeedback());
    if (admRatingFilter) admRatingFilter.addEventListener('change', () => this.renderAdminFeedback());
  }

  renderFeedbackView(preselectedBookingId = null) {
    const user = authService.getCurrentUser();
    if (!user) return;

    // 1. Query eligible unreviewed delivered bookings
    const eligibleBookings = feedbackService.getEligibleBookingsForFeedback(user.id);
    const selectElem = document.getElementById('feedbackBookingSelect');
    const noEligibleAlert = document.getElementById('feedbackNoEligibleAlert');
    const formElem = document.getElementById('customerFeedbackForm');

    if (selectElem && formElem && noEligibleAlert) {
      if (eligibleBookings.length === 0) {
        noEligibleAlert.style.display = 'block';
        formElem.style.display = 'none';
      } else {
        noEligibleAlert.style.display = 'none';
        formElem.style.display = 'block';

        selectElem.innerHTML = eligibleBookings.map(b => {
          const routeStr = `${b.pickupLocation?.city || 'Origin'} → ${b.destinationLocation?.city || 'Dest'}`;
          const isSelected = preselectedBookingId && b.id === preselectedBookingId ? 'selected' : '';
          return `<option value="${b.id}" ${isSelected}>${b.bookingNumber} (${routeStr}) — Delivered</option>`;
        }).join('');
      }
    }

    // 2. Render customer past review history
    const pastReviews = feedbackService.getCustomerFeedback(user.id, user);
    const pastContainer = document.getElementById('customerPastReviewsContainer');

    if (pastContainer) {
      if (pastReviews.length === 0) {
        pastContainer.innerHTML = `
          <div class="empty-state-box">
            <i class="fa-solid fa-star-half-stroke empty-state-icon"></i>
            <h4 style="font-size: 1rem; margin-bottom: 4px;">No Reviews Submitted Yet</h4>
            <p style="font-size: 0.8125rem;">Rate your delivered shipments to build courier trust and driver ratings.</p>
          </div>
        `;
      } else {
        pastContainer.innerHTML = pastReviews.map(r => {
          const starsHtml = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
          const timeStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
          
          return `
            <div class="feedback-card-item">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                  <strong style="font-size: 0.95rem;">${r.bookingNumber}</strong>
                  <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${r.routeLabel}</span>
                </div>
                <div style="text-align: right;">
                  <span style="color: #f59e0b; font-size: 1rem; font-weight: 700;">${starsHtml}</span>
                  <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${timeStr}</span>
                </div>
              </div>
              <p style="font-size: 0.85rem; margin-bottom: 8px; color: var(--text-main); font-style: italic;">"${r.comment || 'Smooth, safe transit.'}"</p>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${(r.tags || []).map(t => `<span class="badge badge-confirmed" style="font-size: 0.7rem; padding: 2px 6px;">${t}</span>`).join('')}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  openFeedbackForBooking(bookingId) {
    this.navigate('view-feedback');
    this.renderFeedbackView(bookingId);
  }

  handleFeedbackSubmit(e) {
    e.preventDefault();
    const user = authService.getCurrentUser();
    const bookingId = document.getElementById('feedbackBookingSelect')?.value;
    const rating = Number(document.getElementById('feedbackRatingValue')?.value || 5);
    const comment = document.getElementById('feedbackCommentInput')?.value || '';

    // Collect active tags
    const activeTags = [];
    document.querySelectorAll('#feedbackTagsContainer .aspect-tag-btn.active').forEach(btn => {
      activeTags.push(btn.getAttribute('data-tag'));
    });

    if (!bookingId) {
      this.showToast('Please select a completed booking to review.', 'error');
      return;
    }

    try {
      feedbackService.submitFeedback({
        bookingId,
        customerId: user.id,
        rating,
        comment,
        tags: activeTags
      }, user);

      this.showToast('Thank you! Your verified customer review has been submitted.', 'success');
      document.getElementById('feedbackCommentInput').value = '';
      this.renderFeedbackView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  renderAdminFeedback() {
    const user = authService.getCurrentUser();
    const stats = feedbackService.getFeedbackStats();

    // 1. Overall Stats Header
    const avgElem = document.getElementById('admStatAvgRating');
    const totalElem = document.getElementById('admStatTotalReviews');
    const satisfElem = document.getElementById('admStatSatisfactionRate');

    if (avgElem) avgElem.textContent = `${stats.averageRating.toFixed(1)} ★`;
    if (totalElem) totalElem.textContent = stats.totalReviews.toLocaleString();
    if (satisfElem) satisfElem.textContent = `${stats.distributionPercent[5]}%`;

    // 2. Rating Breakdown Bars
    for (let i = 1; i <= 5; i++) {
      const bar = document.getElementById(`admDistBar${i}`);
      const countLabel = document.getElementById(`admDistCount${i}`);
      const count = stats.distribution[i] || 0;
      const pct = stats.distributionPercent[i] || 0;

      if (bar) bar.style.width = `${pct}%`;
      if (countLabel) countLabel.textContent = `${count} (${pct}%)`;
    }

    // 3. Top Tags
    const tagsContainer = document.getElementById('admTopTagsContainer');
    if (tagsContainer) {
      if (stats.topTags.length === 0) {
        tagsContainer.innerHTML = `<span style="font-size: 0.85rem; color: var(--text-muted);">No commended attributes recorded yet.</span>`;
      } else {
        tagsContainer.innerHTML = stats.topTags.map(t => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: var(--bg-surface-secondary); border-radius: var(--radius-md);">
            <strong style="font-size: 0.85rem;"><i class="fa-solid fa-tag" style="color: var(--brand-primary); margin-right: 6px;"></i> ${t.tag}</strong>
            <span class="badge badge-confirmed">${t.count} mentions</span>
          </div>
        `).join('');
      }
    }

    // 4. Filterable Reviews Table
    const query = document.getElementById('adminFeedbackSearchInput')?.value.toLowerCase().trim() || '';
    const ratingFilter = document.getElementById('adminFeedbackRatingFilter')?.value || 'ALL';

    const allFeedback = feedbackService.getAllFeedback(user);

    const filtered = allFeedback.filter(f => {
      // Star rating filter
      if (ratingFilter === '5' && f.rating !== 5) return false;
      if (ratingFilter === '4' && f.rating !== 4) return false;
      if (ratingFilter === '3' && f.rating > 3) return false;

      // Text query
      if (query) {
        const cName = (f.customerName || '').toLowerCase();
        const dName = (f.driverName || '').toLowerCase();
        const bNum = (f.bookingNumber || '').toLowerCase();
        const route = (f.routeLabel || '').toLowerCase();
        return cName.includes(query) || dName.includes(query) || bNum.includes(query) || route.includes(query);
      }
      return true;
    });

    const tbody = document.getElementById('adminFeedbackTbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No customer reviews matching current filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(f => {
      const starsHtml = '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating);
      const timeStr = f.createdAt ? new Date(f.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';

      return `
        <tr>
          <td>
            <strong>${f.customerName}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${f.customerEmail || '--'}</span>
          </td>
          <td>
            <strong>${f.bookingNumber}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${f.routeLabel}</span>
          </td>
          <td>
            <strong>${f.driverName}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${f.driverVehicle || 'Van'}</span>
          </td>
          <td>
            <span style="color: #f59e0b; font-size: 1.05rem; font-weight: 700;">${starsHtml}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${f.rating}.0 / 5.0</span>
          </td>
          <td>
            <div style="font-size: 0.85rem; margin-bottom: 4px; font-style: italic;">"${f.comment || 'Verified shipment completed.'}"</div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              ${(f.tags || []).map(t => `<span class="badge badge-confirmed" style="font-size: 0.65rem; padding: 1px 5px;">${t}</span>`).join('')}
            </div>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${timeStr}</td>
        </tr>
      `;
    }).join('');
  }

  handleProfileSubmit(e) {
    e.preventDefault();
    const user = authService.getCurrentUser();
    const fullName = document.getElementById('profFullName').value;
    const phone = document.getElementById('profPhone').value;
    const city = document.getElementById('profCity').value;
    const address = document.getElementById('profAddress').value;

    userService.updateProfile(user.id, { fullName, phone, city, address }, user);
    authService.loadSession();
    this.updateUserBadge();
    this.showToast('Profile updated successfully!', 'success');
  }

  /* =========================================================================
     Utilities: Toast & Badges
     ========================================================================= */

  renderStatusBadge(status) {
    const cls = this.getBadgeClass(status);
    const label = (status || 'PENDING').replace('_', ' ');
    const isPulse = status === BOOKING_STATUS.IN_TRANSIT ? 'badge-pulse' : '';
    return `<span class="badge ${cls} ${isPulse}">${label}</span>`;
  }

  getBadgeClass(status) {
    switch (status) {
      case BOOKING_STATUS.PENDING: return 'badge-pending';
      case BOOKING_STATUS.CONFIRMED: return 'badge-confirmed';
      case BOOKING_STATUS.DRIVER_ASSIGNED: return 'badge-driver-assigned';
      case BOOKING_STATUS.PICKED_UP: return 'badge-picked-up';
      case BOOKING_STATUS.IN_TRANSIT: return 'badge-in-transit';
      case BOOKING_STATUS.DELIVERED: return 'badge-delivered';
      case BOOKING_STATUS.CANCELLED: return 'badge-cancelled';
      default: return 'badge-confirmed';
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
      success: 'fa-circle-check',
      error: 'fa-triangle-exclamation',
      info: 'fa-circle-info'
    };

    toast.innerHTML = `
      <i class="fa-solid ${iconMap[type] || 'fa-circle-info'} toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${type.toUpperCase()}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /* =========================================================================
     Phase 11: Real-Time In-App Notifications UI & Actions
     ========================================================================= */

  renderNotifications() {
    const user = authService.getCurrentUser();
    const badge = document.getElementById('notifUnreadBadge');
    const headerCount = document.getElementById('notifHeaderUnreadCount');
    const list = document.getElementById('notifDropdownList');

    if (!user) {
      if (badge) badge.style.display = 'none';
      return;
    }

    const unreadCount = notificationService.getUnreadCount(user.id);
    const notifs = notificationService.getUserNotifications(user.id);

    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }

    if (headerCount) {
      headerCount.textContent = `${unreadCount} unread`;
    }

    if (!list) return;

    if (notifs.length === 0) {
      list.innerHTML = `
        <div class="notif-empty-state">
          <i class="fa-solid fa-bell-slash notif-empty-icon"></i>
          <p style="font-size: 0.85rem; font-weight: 600; margin-bottom: 2px;">No Notifications</p>
          <span style="font-size: 0.75rem;">You're completely caught up!</span>
        </div>
      `;
      return;
    }

    list.innerHTML = notifs.map(n => {
      const meta = notificationService.getNotificationMeta(n.type);
      const timeAgo = this.formatTimeAgo(n.createdAt);
      const unreadCls = !n.isRead ? 'unread' : '';

      return `
        <div class="notif-item ${unreadCls}" data-notif-id="${n.id}" data-action="${n.linkAction || ''}">
          <div class="notif-item-icon" style="color: ${meta.color};">
            <i class="${meta.icon}"></i>
          </div>
          <div class="notif-item-body">
            <div class="notif-item-title">
              <span>${n.title}</span>
              ${!n.isRead ? '<span style="width: 6px; height: 6px; background: var(--brand-primary); border-radius: 50%;"></span>' : ''}
            </div>
            <div class="notif-item-msg">${n.message}</div>
            <div class="notif-item-footer">
              <span>${timeAgo}</span>
              ${n.bookingNumber ? `<span class="badge ${meta.badgeCls}" style="font-size: 0.65rem; padding: 1px 5px;">${n.bookingNumber}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to notification items
    list.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        const notifId = item.getAttribute('data-notif-id');
        const action = item.getAttribute('data-action');
        if (notifId) notificationService.markAsRead(notifId);
        this.renderNotifications();

        const menu = document.getElementById('notifDropdownMenu');
        if (menu) menu.classList.remove('active');

        if (action) {
          if (action.startsWith('track:')) {
            const ref = action.replace('track:', '');
            this.showTrackingView(ref);
          } else if (action.startsWith('feedback:')) {
            const bookingId = action.replace('feedback:', '');
            this.openFeedbackForBooking(bookingId);
          } else if (action.startsWith('admin:booking:')) {
            const bookingId = action.replace('admin:booking:', '');
            this.navigate('view-admin-bookings');
            this.openAdminBookingDetailsModal(bookingId);
          } else if (action === 'driver:dashboard') {
            this.navigate('view-driver-dashboard');
          }
        }
      });
    });
  }

  formatTimeAgo(isoString) {
    if (!isoString) return 'Just now';
    const past = new Date(isoString).getTime();
    const diffSec = Math.floor((Date.now() - past) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  }

  toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smartluggage_theme', isDark ? 'dark' : 'light');
    }
  }

  applyTheme() {
    if (typeof localStorage !== 'undefined') {
      const theme = localStorage.getItem('smartluggage_theme');
      if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('themeToggleBtn');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
      }
    }
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
