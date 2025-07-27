/**
 * Wedding Memories - Main Application
 * Handles initialization, routing, and core functionality
 */

class WeddingMemoriesApp {
    constructor() {
        this.currentPage = 'home';
        this.currentUser = null;
        this.currentEvent = null;
        this.socket = null;
        this.eventPassword = null;
        
        // Initialize application
        this.init();
    }

    async init() {
        try {
            // Initialize Socket.IO
            this.initializeSocket();
            
            // Load event data from URL
            await this.loadEventFromURL();
            
            // Initialize authentication
            await this.initializeAuth();
            
            // Initialize navigation
            this.initializeNavigation();
            
            // Initialize theme toggle
            this.initializeTheme();
            
            // Initialize modals
            this.initializeModals();
            
            // Initialize components
            this.initializeComponents();
            
            // Load initial page
            await this.loadInitialPage();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            console.log('Wedding Memories app initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showToast('Error loading application', 'error');
        }
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            if (this.currentEvent) {
                this.socket.emit('join-event', this.currentEvent._id);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        // Real-time event handlers
        this.socket.on('new-media', (data) => {
            this.handleNewMedia(data);
        });

        this.socket.on('new-guestbook-entry', (data) => {
            this.handleNewGuestbookEntry(data);
        });

        this.socket.on('media-liked', (data) => {
            this.handleMediaLiked(data);
        });

        this.socket.on('new-comment', (data) => {
            this.handleNewComment(data);
        });
    }

    async loadEventFromURL() {
        const path = window.location.pathname;
        const eventMatch = path.match(/\/event\/([a-f\d]{24})/);
        
        if (eventMatch) {
            const eventId = eventMatch[1];
            try {
                const response = await API.get(`/events/public/${eventId}`);
                if (response.success) {
                    this.currentEvent = response.data.event;
                    document.title = `${this.currentEvent.title} - Wedding Memories`;
                    this.updateHeroSection();
                }
            } catch (error) {
                if (error.status === 401 && error.data?.requiresPassword) {
                    this.showPasswordModal(eventId);
                } else {
                    console.error('Error loading event:', error);
                    this.showToast('Event not found or not available', 'error');
                }
            }
        }
    }

    async initializeAuth() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const response = await API.get('/auth/profile');
                if (response.success) {
                    this.currentUser = response.data.user;
                    this.updateAuthUI();
                }
            } catch (error) {
                localStorage.removeItem('authToken');
                console.error('Invalid auth token:', error);
            }
        }
    }

    initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = link.id.replace('nav-', '');
                this.navigateToPage(pageId);
            });
        });

        // Login/logout buttons
        const loginBtn = document.getElementById('login-btn');
        const logoutLink = document.getElementById('logout-link');

        loginBtn?.addEventListener('click', () => {
            this.showModal('login-modal');
        });

        logoutLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Hero action buttons
        const uploadPhotosBtn = document.getElementById('upload-photos-btn');
        const viewGalleryBtn = document.getElementById('view-gallery-btn');

        uploadPhotosBtn?.addEventListener('click', () => {
            this.navigateToPage('upload');
        });

        viewGalleryBtn?.addEventListener('click', () => {
            this.navigateToPage('gallery');
        });
    }

    initializeTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('theme') || 'light';
        
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);

        themeToggle?.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.updateThemeIcon(newTheme);
        });
    }

    updateThemeIcon(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        const icon = themeToggle?.querySelector('i');
        
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    initializeModals() {
        // Modal close handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close')) {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            }

            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });

        // Login form
        const loginForm = document.getElementById('login-form');
        loginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(new FormData(loginForm));
        });

        // Password form
        const passwordForm = document.getElementById('password-form');
        passwordForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEventPassword(new FormData(passwordForm));
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal:not(.hidden)');
                if (openModal) {
                    this.hideModal(openModal.id);
                }
            }
        });
    }

    initializeComponents() {
        // Initialize gallery component
        if (window.GalleryComponent) {
            this.gallery = new GalleryComponent(this);
        }

        // Initialize guestbook component
        if (window.GuestbookComponent) {
            this.guestbook = new GuestbookComponent(this);
        }

        // Initialize upload component
        if (window.UploadComponent) {
            this.upload = new UploadComponent(this);
        }

        // Initialize slideshow component
        if (window.SlideshowComponent) {
            this.slideshow = new SlideshowComponent(this);
        }

        // Initialize audio component
        if (window.AudioComponent) {
            this.audio = new AudioComponent(this);
        }
    }

    async loadInitialPage() {
        // Determine initial page based on URL or default to home
        const path = window.location.pathname;
        
        if (path.includes('/gallery')) {
            this.navigateToPage('gallery');
        } else if (path.includes('/guestbook')) {
            this.navigateToPage('guestbook');
        } else if (path.includes('/upload')) {
            this.navigateToPage('upload');
        } else if (path.includes('/admin') && this.currentUser) {
            this.navigateToPage('admin');
        } else {
            this.navigateToPage('home');
        }

        // Load event statistics
        if (this.currentEvent) {
            await this.loadEventStats();
        }
    }

    navigateToPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;

            // Update navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });

            const navLink = document.getElementById(`nav-${pageId}`);
            if (navLink) {
                navLink.classList.add('active');
            }

            // Load page-specific content
            this.loadPageContent(pageId);

            // Update URL without page reload
            const newPath = pageId === 'home' ? '/' : `/${pageId}`;
            const fullPath = this.currentEvent ? `/event/${this.currentEvent._id}${newPath}` : newPath;
            history.pushState({ page: pageId }, '', fullPath);
        }
    }

    async loadPageContent(pageId) {
        try {
            switch (pageId) {
                case 'gallery':
                    if (this.gallery) {
                        await this.gallery.loadGallery();
                    }
                    break;
                
                case 'guestbook':
                    if (this.guestbook) {
                        await this.guestbook.loadEntries();
                    }
                    break;
                
                case 'upload':
                    if (this.upload) {
                        this.upload.initialize();
                    }
                    break;
                
                case 'admin':
                    if (this.currentUser) {
                        await this.loadAdminDashboard();
                    }
                    break;
                
                case 'home':
                default:
                    await this.loadHomePage();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${pageId} page:`, error);
            this.showToast(`Error loading ${pageId} page`, 'error');
        }
    }

    async loadHomePage() {
        if (this.currentEvent) {
            // Load featured photos
            await this.loadFeaturedPhotos();
        }
    }

    async loadFeaturedPhotos() {
        try {
            const response = await API.get(`/media/event/${this.currentEvent._id}?featured=true&limit=6`);
            if (response.success) {
                this.renderFeaturedPhotos(response.data.media);
            }
        } catch (error) {
            console.error('Error loading featured photos:', error);
        }
    }

    renderFeaturedPhotos(photos) {
        const container = document.getElementById('featured-gallery');
        if (!container) return;

        container.innerHTML = photos.map(photo => `
            <div class="featured-photo" data-media-id="${photo._id}">
                <img src="${photo.thumbnailUrl || photo.url}" alt="${photo.caption || 'Wedding photo'}" loading="lazy">
                <div class="featured-photo-overlay">
                    <div class="featured-photo-info">
                        <p>${photo.caption || ''}</p>
                        <div class="featured-photo-stats">
                            <span><i class="fas fa-heart"></i> ${photo.likeCount || 0}</span>
                            <span><i class="fas fa-comment"></i> ${photo.commentCount || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.featured-photo').forEach(photo => {
            photo.addEventListener('click', () => {
                const mediaId = photo.dataset.mediaId;
                this.openPhotoModal(mediaId);
            });
        });
    }

    async loadEventStats() {
        if (!this.currentEvent) return;

        try {
            const response = await API.get(`/media/event/${this.currentEvent._id}?limit=1`);
            if (response.success) {
                this.updateStatsDisplay({
                    photos: this.currentEvent.statistics?.totalPhotos || 0,
                    videos: this.currentEvent.statistics?.totalVideos || 0,
                    likes: this.currentEvent.statistics?.totalLikes || 0,
                    comments: this.currentEvent.statistics?.totalGuestbookEntries || 0
                });
            }
        } catch (error) {
            console.error('Error loading event stats:', error);
        }
    }

    updateStatsDisplay(stats) {
        const elements = {
            photos: document.getElementById('stats-photos'),
            videos: document.getElementById('stats-videos'),
            likes: document.getElementById('stats-likes'),
            comments: document.getElementById('stats-comments')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                this.animateNumber(elements[key], stats[key] || 0);
            }
        });
    }

    animateNumber(element, target) {
        const start = parseInt(element.textContent) || 0;
        const duration = 1000;
        const increment = (target - start) / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            element.textContent = Math.round(current);

            if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
                element.textContent = target;
                clearInterval(timer);
            }
        }, 16);
    }

    updateHeroSection() {
        if (!this.currentEvent) return;

        const elements = {
            title: document.getElementById('hero-title'),
            subtitle: document.getElementById('hero-subtitle'),
            date: document.getElementById('hero-date-text'),
            location: document.getElementById('hero-location-text'),
            image: document.getElementById('hero-image')
        };

        if (elements.title) {
            elements.title.textContent = this.currentEvent.title;
        }

        if (elements.subtitle) {
            elements.subtitle.textContent = `${this.currentEvent.coupleNames.partner1} & ${this.currentEvent.coupleNames.partner2}`;
        }

        if (elements.date) {
            const eventDate = new Date(this.currentEvent.eventDate);
            elements.date.textContent = eventDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        if (elements.location && this.currentEvent.venue?.name) {
            elements.location.textContent = this.currentEvent.venue.name;
        }

        if (elements.image && this.currentEvent.coverPhoto) {
            elements.image.src = this.currentEvent.coverPhoto;
        }
    }

    async handleLogin(formData) {
        try {
            const email = formData.get('email');
            const password = formData.get('password');

            const response = await API.post('/auth/login', { email, password });
            
            if (response.success) {
                this.currentUser = response.data.user;
                localStorage.setItem('authToken', response.data.token);
                this.updateAuthUI();
                this.hideModal('login-modal');
                this.showToast('Login successful!', 'success');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(error.data?.message || 'Login failed', 'error');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('authToken');
        this.updateAuthUI();
        this.showToast('Logged out successfully', 'success');
        
        // Redirect to home if on admin page
        if (this.currentPage === 'admin') {
            this.navigateToPage('home');
        }
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('login-btn');
        const userMenu = document.getElementById('user-menu');
        const adminNav = document.getElementById('nav-admin');
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar-img');

        if (this.currentUser) {
            loginBtn?.classList.add('hidden');
            userMenu?.classList.remove('hidden');
            
            if (userName) {
                userName.textContent = this.currentUser.firstName;
            }
            
            if (userAvatar && this.currentUser.profilePhoto) {
                userAvatar.src = this.currentUser.profilePhoto;
            }

            // Show admin nav for hosts and photographers
            if (['host', 'photographer', 'admin'].includes(this.currentUser.role)) {
                adminNav?.classList.remove('hidden');
            }
        } else {
            loginBtn?.classList.remove('hidden');
            userMenu?.classList.add('hidden');
            adminNav?.classList.add('hidden');
        }
    }

    async handleEventPassword(formData) {
        try {
            const password = formData.get('event-password');
            const eventId = this.getEventIdFromURL();

            const response = await API.get(`/events/public/${eventId}`, {
                headers: { 'X-Event-Password': password }
            });

            if (response.success) {
                this.currentEvent = response.data.event;
                this.eventPassword = password;
                this.hideModal('password-modal');
                this.updateHeroSection();
                await this.loadEventStats();
                this.showToast('Access granted!', 'success');
            }
        } catch (error) {
            console.error('Password error:', error);
            this.showToast('Invalid password', 'error');
        }
    }

    getEventIdFromURL() {
        const match = window.location.pathname.match(/\/event\/([a-f\d]{24})/);
        return match ? match[1] : null;
    }

    showPasswordModal(eventId) {
        this.showModal('password-modal');
    }

    openPhotoModal(mediaId) {
        if (window.PhotoModal) {
            new PhotoModal(this, mediaId);
        }
    }

    // Real-time event handlers
    handleNewMedia(data) {
        // Update stats
        this.loadEventStats();
        
        // Refresh gallery if visible
        if (this.currentPage === 'gallery' && this.gallery) {
            this.gallery.addNewMedia(data.media);
        }
        
        this.showToast('New photo added!', 'info');
    }

    handleNewGuestbookEntry(data) {
        // Refresh guestbook if visible
        if (this.currentPage === 'guestbook' && this.guestbook) {
            this.guestbook.addNewEntry(data.entry);
        }
        
        this.showToast('New message added!', 'info');
    }

    handleMediaLiked(data) {
        // Update like counts in gallery
        const mediaElement = document.querySelector(`[data-media-id="${data.mediaId}"]`);
        if (mediaElement) {
            const likeCount = mediaElement.querySelector('.like-count');
            if (likeCount) {
                likeCount.textContent = data.likeCount;
            }
        }
    }

    handleNewComment(data) {
        // Update comment displays
        const mediaElement = document.querySelector(`[data-media-id="${data.mediaId}"]`);
        if (mediaElement) {
            const commentCount = mediaElement.querySelector('.comment-count');
            if (commentCount) {
                commentCount.textContent = parseInt(commentCount.textContent) + 1;
            }
        }
    }

    // Modal utilities
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const mainNav = document.getElementById('main-nav');
        
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        
        if (mainNav) {
            mainNav.classList.remove('hidden');
        }
    }

    // Toast notifications
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto hide
        const hideToast = () => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        };

        setTimeout(hideToast, duration);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', hideToast);
    }

    getToastIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Admin dashboard
    async loadAdminDashboard() {
        if (!this.currentUser) return;
        
        // This would load admin-specific content
        console.log('Loading admin dashboard...');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WeddingMemoriesApp();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
        window.app.navigateToPage(e.state.page);
    }
});