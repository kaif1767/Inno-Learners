// ==================== API CONFIGURATION ====================

const API_BASE_URL = 'http://localhost:3000/api';

// ==================== NAVIGATION ====================

function goToHomePage() {
    window.location.href = '/landing.html';
}

// ==================== ERROR HANDLING SYSTEM ====================

class ErrorHandler {
    static showError(message, elementId = 'globalMessage', autoHide = true) {
        const msgEl = document.getElementById(elementId);
        msgEl.className = 'message error show';
        msgEl.textContent = '❌ ' + message;
        
        if (autoHide) {
            setTimeout(() => {
                msgEl.className = 'message error';
            }, 5000);
        }
    }

    static showSuccess(message, elementId = 'globalMessage', autoHide = true) {
        const msgEl = document.getElementById(elementId);
        msgEl.className = 'message success show';
        msgEl.textContent = '✓ ' + message;
        
        if (autoHide) {
            setTimeout(() => {
                msgEl.className = 'message success';
            }, 5000);
        }
    }

    static showWarning(message, elementId = 'globalMessage', autoHide = true) {
        const msgEl = document.getElementById(elementId);
        msgEl.className = 'message warning show';
        msgEl.textContent = '⚠️ ' + message;
        
        if (autoHide) {
            setTimeout(() => {
                msgEl.className = 'message warning';
            }, 5000);
        }
    }

    static showFieldError(fieldId, message) {
        const errorEl = document.getElementById(fieldId + 'Error');
        const inputEl = document.getElementById(fieldId);
        
        if (errorEl && inputEl) {
            errorEl.textContent = message;
            errorEl.className = 'field-error show';
            inputEl.classList.add('error-input');
        }
    }

    static clearFieldError(fieldId) {
        const errorEl = document.getElementById(fieldId + 'Error');
        const inputEl = document.getElementById(fieldId);
        
        if (errorEl && inputEl) {
            errorEl.className = 'field-error';
            inputEl.classList.remove('error-input');
        }
    }

    static clearAllFieldErrors(formId) {
        const form = document.getElementById(formId);
        if (form) {
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                this.clearFieldError(input.id);
            });
        }
    }

    static handleApiError(error, elementId = 'globalMessage') {
        console.error('API Error:', error);
        
        if (error.errors) {
            // Validation errors
            for (const [field, message] of Object.entries(error.errors)) {
                // Map backend field names to frontend IDs
                const fieldMap = {
                    'name': 'eventName',
                    'description': 'eventDescription',
                    'date': 'eventDate',
                    'capacity': 'eventCapacity',
                    'email': 'participantEmail',
                    'phone': 'participantPhone',
                    'message': 'announcementMessage'
                };
                
                const frontendField = fieldMap[field] || field;
                this.showFieldError(frontendField, message);
            }
            this.showError(error.error || 'Please fix the errors in the form', elementId);
        } else if (error.error) {
            this.showError(error.error, elementId);
        } else if (error.message) {
            this.showError(error.message, elementId);
        } else {
            this.showError('An unexpected error occurred', elementId);
        }
    }

    static updateConnectionStatus(isConnected) {
        const statusEl = document.getElementById('connectionStatus');
        if (isConnected) {
            statusEl.className = 'connection-status connected';
            statusEl.textContent = '✓ Connected to server';
        } else {
            statusEl.className = 'connection-status disconnected';
            statusEl.textContent = '✗ Cannot connect to server - Make sure the backend is running on port 3000';
        }
    }
}

// ==================== API CLIENT ====================
 
class API {
    static async request(endpoint, options = {}) {
        try {
            const token = localStorage.getItem('userToken');
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            // Add token to Authorization header if present
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw data;
            }

            ErrorHandler.updateConnectionStatus(true);
            return data;
        } catch (error) {
            if (error.message === 'Failed to fetch') {
                ErrorHandler.updateConnectionStatus(false);
                throw {
                    error: 'Cannot connect to server',
                    message: 'Please make sure the backend server is running on port 3000'
                };
            }
            throw error;
        }
    }

    // Event endpoints
    static async getEvents() {
        return this.request('/events');
    }

    static async createEvent(eventData) {
        return this.request('/events', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
    }

    static async deleteEvent(eventId) {
        return this.request(`/events/${eventId}`, {
            method: 'DELETE'
        });
    }

    // Registration endpoints
    static async getEventRegistrations(eventId) {
        return this.request(`/events/${eventId}/registrations`);
    }

    static async registerForEvent(eventId, registrationData) {
        return this.request(`/events/${eventId}/register`, {
            method: 'POST',
            body: JSON.stringify(registrationData)
        });
    }

    static async updateRegistrationStatus(registrationId, status) {
        return this.request(`/registrations/${registrationId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    static async checkRegistration(eventId, email) {
        return this.request(`/events/${eventId}/check-registration?email=${encodeURIComponent(email)}`);
    }

    // Announcement endpoints
    static async getEventAnnouncements(eventId) {
        return this.request(`/events/${eventId}/announcements`);
    }

    static async createAnnouncement(eventId, message) {
        return this.request(`/events/${eventId}/announcements`, {
            method: 'POST',
            body: JSON.stringify({ message })
        });
    }

    // Auth endpoints
    static async signup(data) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async login(data) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async me(token) {
        return this.request('/auth/me', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    // Excel export endpoint
    static downloadParticipantsExcel(eventId) {
        const link = document.createElement('a');
        link.href = `${API_BASE_URL}/events/${eventId}/download-participants`;
        link.download = true;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ==================== APPLICATION STATE ====================
 
let currentRole = 'participant';
let events = [];
let registrations = {};
let announcements = {};
let currentTab = 'browse';

// ==================== UI FUNCTIONS ====================
 
function switchRole(role) {
    currentRole = role;

    // Update toggle option styles
    const options = document.querySelectorAll('.role-toggle .toggle-option');
    options.forEach(opt => {
        if (opt.dataset.role === role) opt.classList.add('active');
        else opt.classList.remove('active');
    });

    // Move indicator
    const indicator = document.querySelector('.role-toggle .toggle-indicator');
    if (indicator) {
        const index = Array.from(options).findIndex(o => o.dataset.role === role);
        indicator.style.transform = `translateX(${index * 100}%)`;
    }

    // Update views
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));

    // Update container class for CSS styling
    const container = document.querySelector('.container');
    if (role === 'admin') {
        container.classList.add('admin-active');
    } else {
        container.classList.remove('admin-active');
    }

    if (role === 'participant') {
        document.getElementById('participantView').classList.add('active');
        loadParticipantEvents();
    } else {
        document.getElementById('adminView').classList.add('active');
        loadAdminEvents();
    }
}

function initRoleToggle() {
    const toggle = document.getElementById('roleToggle');
    if (!toggle) return;
    const options = toggle.querySelectorAll('.toggle-option');
    const indicator = toggle.querySelector('.toggle-indicator');

    // set indicator width based on options count
    if (indicator && options.length > 0) {
        indicator.style.width = `${100 / options.length}%`;
        indicator.style.transform = 'translateX(0%)';
    }

    options.forEach(opt => {
        opt.addEventListener('click', () => {
            const role = opt.dataset.role;
            switchRole(role);
        });
    });
}

// Tab switching for Browse / My Registrations
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (tab === 'browse') {
        document.getElementById('navBrowse').classList.add('active');
        document.getElementById('participantView').classList.add('active');
        document.getElementById('myRegistrationsView').classList.remove('active');
        loadParticipantEvents();
    } else if (tab === 'my-registrations') {
        document.getElementById('navMyRegs').classList.add('active');
        document.getElementById('participantView').classList.remove('active');
        document.getElementById('myRegistrationsView').classList.add('active');
        renderMyRegistrations();
    }
}

function renderMyRegistrations() {
    const list = document.getElementById('myRegsList');
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        list.innerHTML = '<div class="empty-state">No registrations found. Please register for an event.</div>';
        document.getElementById('myRegCount').textContent = '0';
        return;
    }

    // Collect user's registrations from the cached registrations object
    const userRegs = [];
    for (const eventId of Object.keys(registrations)) {
        const regs = registrations[eventId] || [];
        regs.forEach(r => {
            if (r.email === userEmail) {
                const event = events.find(e => e.id === eventId) || { name: 'Unknown Event' };
                userRegs.push({ ...r, eventName: event.name, eventDate: event.date });
            }
        });
    }

    document.getElementById('myRegCount').textContent = String(userRegs.length);

    if (userRegs.length === 0) {
        list.innerHTML = '<div class="empty-state">No registrations found for your email.</div>';
        return;
    }

    list.innerHTML = userRegs.map(r => `
        <div class="registration-card">
            <div>
                <div style="font-weight:700">${r.eventName}</div>
                <div class="meta">${new Date(r.registeredAt).toLocaleDateString()} • ${r.eventDate}</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
                <div class="badge ${r.status==='confirmed'? 'badge-success': r.status==='pending'? 'badge-warning': 'badge-danger'}">${r.status}</div>
                <div class="reg-actions">
                    <button class="btn btn-danger" onclick="cancelMyRegistration('${r.id}')">Cancel Registration</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function cancelMyRegistration(regId) {
    if (!confirm('Cancel this registration?')) return;
    try {
        // re-use update status endpoint (set to 'rejected')
        const response = await API.updateRegistrationStatus(regId, 'rejected');
        // refresh data
        await loadParticipantEvents();
        if (currentTab === 'my-registrations') renderMyRegistrations();
        ErrorHandler.showSuccess(response.message, 'myRegsMessage');
    } catch (err) {
        ErrorHandler.handleApiError(err, 'myRegsMessage');
    }
}

async function loadParticipantEvents() {
    try {
        const response = await API.getEvents();
        events = response.data;

        // Load announcements for all events
        for (const event of events) {
            const announcementsResponse = await API.getEventAnnouncements(event.id);
            announcements[event.id] = announcementsResponse.data;
            
            const registrationsResponse = await API.getEventRegistrations(event.id);
            registrations[event.id] = registrationsResponse.data;
        }

        renderParticipantEvents();
    } catch (error) {
        ErrorHandler.handleApiError(error, 'participantMessage');
        document.getElementById('eventsGrid').innerHTML = 
            '<div class="empty-state">Failed to load events. Please check if the server is running.</div>';
    }
}

async function loadAdminEvents() {
    try {
        const response = await API.getEvents();
        events = response.data;

        // Load registrations for all events
        for (const event of events) {
            const registrationsResponse = await API.getEventRegistrations(event.id);
            registrations[event.id] = registrationsResponse.data;
        }

        renderAdminEvents();
    } catch (error) {
        ErrorHandler.handleApiError(error, 'adminMessage');
        document.getElementById('adminEventsGrid').innerHTML = 
            '<div class="empty-state">Failed to load events. Please check if the server is running.</div>';
    }
}

function renderParticipantEvents() {
    const grid = document.getElementById('eventsGrid');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= today;
    });

    if (upcomingEvents.length === 0) {
        grid.innerHTML = '<div class="empty-state">No upcoming events available at the moment.</div>';
        return;
    }

    const userEmail = localStorage.getItem('userEmail');

    grid.innerHTML = upcomingEvents.map(event => {
        const eventRegistrations = registrations[event.id] || [];
        const confirmedCount = eventRegistrations.filter(r => r.status === 'confirmed').length;
        const userRegistration = userEmail ? eventRegistrations.find(r => r.email === userEmail) : null;
        const isFull = confirmedCount >= event.capacity;
        
        const eventAnnouncements = announcements[event.id] || [];
        
            // Use a simple colored placeholder image based on event id
            const hue = (parseInt(event.id, 10) * 37) % 360;
            const bg = `linear-gradient(135deg,hsl(${hue} 70% 65%), hsl(${(hue+40)%360} 65% 55%))`;

            return `
                <div class="event-card">
                    <div class="card-image" style="background: ${bg};"></div>
                    <div class="card-body">
                        <h3>${event.name}</h3>
                        <div class="card-meta-row">
                            <div class="card-meta">📅 ${new Date(event.date).toLocaleDateString()}</div>
                            <div class="card-meta">📍 ${event.venue || 'Main Hall'}</div>
                            <div class="card-meta">👥 ${confirmedCount}/${event.capacity}</div>
                        </div>
                        <p style="margin-top:10px;color:#475569">${event.description}</p>
                    </div>
                    <div class="event-actions">
                        ${eventAnnouncements.length > 0 ? `<div style="flex:1;color:#475569">${eventAnnouncements[eventAnnouncements.length-1].message}</div>` : ''}
                        ${!userRegistration ? `
                            <button class="btn ${isFull ? 'btn-secondary' : 'btn-primary'}" onclick="openRegistrationModal('${event.id}')" ${isFull? 'disabled':''}>${isFull? 'Event Full':'Register'}</button>
                        ` : `<span class="badge ${userRegistration.status==='confirmed'?'badge-success':userRegistration.status==='pending'?'badge-warning':'badge-danger'}">${userRegistration.status}</span>`}
                    </div>
                </div>
            `;
    }).join('');
}

function renderAdminEvents() {
    const grid = document.getElementById('adminEventsGrid');
    
    if (events.length === 0) {
        grid.innerHTML = '<div class="empty-state">No events created yet. Click "Create Event" to get started!</div>';
        return;
    }

    grid.innerHTML = events.map(event => {
        const eventRegistrations = registrations[event.id] || [];
        const confirmedCount = eventRegistrations.filter(r => r.status === 'confirmed').length;
        
            const hue = (parseInt(event.id, 10) * 37) % 360;
            const bg = `linear-gradient(135deg,hsl(${hue} 70% 65%), hsl(${(hue+40)%360} 65% 55%))`;
            return `
                <div class="event-card">
                    <div class="card-image" style="background: ${bg};"></div>
                    <div class="card-body">
                        <h3>${event.name}</h3>
                        <div class="card-meta-row">
                            <div class="card-meta">📅 ${new Date(event.date).toLocaleDateString()}</div>
                            <div class="card-meta">📍 ${event.venue || 'Main Hall'}</div>
                            <div class="card-meta">Capacity: ${event.capacity}</div>
                        </div>
                        <p style="margin-top:10px;color:#475569">${event.description}</p>
                    </div>
                    <div class="event-actions" style="flex-wrap:wrap">
                        <button class="btn btn-primary" onclick="viewParticipants('${event.id}')">View Participants</button>
                        <button class="btn btn-info" onclick="API.downloadParticipantsExcel('${event.id}')">📥 Excel</button>
                        <button class="btn btn-success" onclick="openAnnouncementModal('${event.id}')">Announce</button>
                        <button class="btn btn-danger" onclick="deleteEvent('${event.id}')">Delete</button>
                    </div>
                </div>
            `;
    }).join('');
}

// ==================== EVENT MANAGEMENT ====================
 
function openCreateEventModal() {
    ErrorHandler.clearAllFieldErrors('createEventForm');
    document.getElementById('createEventForm').reset();
    document.getElementById('createEventModal').classList.add('show');
}

function closeCreateEventModal() {
    document.getElementById('createEventModal').classList.remove('show');
}

document.getElementById('createEventForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    ErrorHandler.clearAllFieldErrors('createEventForm');

    const formData = {
        name: document.getElementById('eventName').value,
        description: document.getElementById('eventDescription').value,
        date: document.getElementById('eventDate').value,
        capacity: parseInt(document.getElementById('eventCapacity').value)
    };

    try {
        const response = await API.createEvent(formData);
        closeCreateEventModal();
        await loadAdminEvents();
        ErrorHandler.showSuccess(response.message, 'adminMessage');
    } catch (error) {
        ErrorHandler.handleApiError(error, 'adminMessage');
    }
});

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This will also remove all registrations.')) {
        return;
    }

    try {
        const response = await API.deleteEvent(eventId);
        await loadAdminEvents();
        ErrorHandler.showSuccess(response.message, 'adminMessage');
    } catch (error) {
        ErrorHandler.handleApiError(error, 'adminMessage');
    }
}

// ==================== REGISTRATION ====================
 
function openRegistrationModal(eventId) {
    ErrorHandler.clearAllFieldErrors('registrationForm');
    document.getElementById('registrationForm').reset();
    document.getElementById('regEventId').value = eventId;
    
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
        document.getElementById('participantEmail').value = savedEmail;
    }
    
    document.getElementById('registrationModal').classList.add('show');
}

function closeRegistrationModal() {
    document.getElementById('registrationModal').classList.remove('show');
}

document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    ErrorHandler.clearAllFieldErrors('registrationForm');

    const eventId = document.getElementById('regEventId').value;
    const formData = {
        name: document.getElementById('participantName').value,
        email: document.getElementById('participantEmail').value,
        phone: document.getElementById('participantPhone').value
    };

    try {
        const response = await API.registerForEvent(eventId, formData);
        localStorage.setItem('userEmail', formData.email);
        closeRegistrationModal();
        await loadParticipantEvents();
        ErrorHandler.showSuccess(response.message, 'participantMessage');
    } catch (error) {
        if (error.error === 'You are already registered for this event') {
            ErrorHandler.showWarning(error.error, 'participantMessage');
            closeRegistrationModal();
            await loadParticipantEvents();
        } else if (error.error === 'Event is at full capacity') {
            ErrorHandler.showError(error.error, 'participantMessage');
            closeRegistrationModal();
            await loadParticipantEvents();
        } else {
            ErrorHandler.handleApiError(error, 'participantMessage');
        }
    }
});

// ==================== PARTICIPANT MANAGEMENT ====================
 
async function viewParticipants(eventId) {
    try {
        const event = events.find(e => e.id === eventId);
        const response = await API.getEventRegistrations(eventId);
        const eventRegistrations = response.data;
        
        const content = document.getElementById('participantsContent');
        
        if (eventRegistrations.length === 0) {
            content.innerHTML = '<div class="empty-state">No registrations yet for this event.</div>';
        } else {
            content.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${eventRegistrations.map(reg => `
                            <tr>
                                <td>${reg.name}</td>
                                <td>${reg.email}</td>
                                <td>${reg.phone}</td>
                                <td>
                                    <span class="badge ${
                                        reg.status === 'confirmed' ? 'badge-success' :
                                        reg.status === 'pending' ? 'badge-warning' :
                                        'badge-danger'
                                    }">
                                        ${reg.status}
                                    </span>
                                </td>
                                <td>
                                    <select onchange="updateParticipantStatus('${reg.id}', this.value, '${eventId}')">
                                        <option value="">Change Status...</option>
                                        <option value="confirmed" ${reg.status === 'confirmed' ? 'disabled' : ''}>Confirm</option>
                                        <option value="pending" ${reg.status === 'pending' ? 'disabled' : ''}>Pending</option>
                                        <option value="rejected" ${reg.status === 'rejected' ? 'disabled' : ''}>Reject</option>
                                    </select>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        document.getElementById('participantsModal').classList.add('show');
    } catch (error) {
        ErrorHandler.handleApiError(error, 'adminMessage');
    }
}

function closeParticipantsModal() {
    document.getElementById('participantsModal').classList.remove('show');
}

async function updateParticipantStatus(registrationId, newStatus, eventId) {
    if (!newStatus) return;

    try {
        const response = await API.updateRegistrationStatus(registrationId, newStatus);
        await viewParticipants(eventId);
        await loadAdminEvents();
        ErrorHandler.showSuccess(response.message, 'adminMessage');
    } catch (error) {
        ErrorHandler.handleApiError(error, 'adminMessage');
    }
}

// ==================== ANNOUNCEMENTS ====================
 
function openAnnouncementModal(eventId) {
    ErrorHandler.clearAllFieldErrors('announcementForm');
    document.getElementById('announcementForm').reset();
    document.getElementById('announceEventId').value = eventId;
    document.getElementById('announcementModal').classList.add('show');
}

function closeAnnouncementModal() {
    document.getElementById('announcementModal').classList.remove('show');
}

document.getElementById('announcementForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    ErrorHandler.clearAllFieldErrors('announcementForm');

    const eventId = document.getElementById('announceEventId').value;
    const message = document.getElementById('announcementMessage').value;

    try {
        const response = await API.createAnnouncement(eventId, message);
        closeAnnouncementModal();
        ErrorHandler.showSuccess(response.message, 'adminMessage');
    } catch (error) {
        ErrorHandler.handleApiError(error, 'adminMessage');
    }
});

// ==================== AUTH UI & HANDLERS ====================

function openLoginModal() {
    document.getElementById('loginForm').reset();
    document.getElementById('loginModal').classList.add('show');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('show');
}

function openSignupModal() {
    document.getElementById('signupForm').reset();
    document.getElementById('signupModal').classList.add('show');
}

function closeSignupModal() {
    document.getElementById('signupModal').classList.remove('show');
}

function updateHeaderUser() {
    const token = localStorage.getItem('userToken');
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');
    const authActions = document.querySelector('.auth-actions');
    const userPanel = document.getElementById('userPanel');

    if (token && name && email) {
        // hide auth buttons
        if (authActions) authActions.style.display = 'none';
        if (userPanel) {
            userPanel.innerHTML = `<div class="user-meta"><div class="user-name">${name}</div><div class="user-email">${email}</div></div><button class="auth-btn outline" onclick="signOut()">Sign Out</button>`;
        }
    } else {
        if (authActions) authActions.style.display = 'flex';
        if (userPanel) {
            userPanel.innerHTML = `<div class="user-meta"><div class="user-name">Guest</div><div class="user-email">Not signed in</div></div>`;
        }
    }
}

function signOut() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    updateHeaderUser();
    switchRole('participant');
    ErrorHandler.showSuccess('Signed out');
}

// Signup form submit
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const resp = await API.signup({ name, email, password });
        const { token, user } = resp.data;
        localStorage.setItem('userToken', token);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.name);
        localStorage.setItem('userRole', user.role);
        closeSignupModal();
        updateHeaderUser();
        ErrorHandler.showSuccess('Account created and signed in');
        if (user.role === 'admin') switchRole('admin');
    } catch (err) {
        ErrorHandler.handleApiError(err, 'globalMessage');
    }
});

// Login form submit
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const resp = await API.login({ email, password });
        const { token, user } = resp.data;
        localStorage.setItem('userToken', token);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.name);
        localStorage.setItem('userRole', user.role);
        closeLoginModal();
        updateHeaderUser();
        ErrorHandler.showSuccess('Signed in successfully');
        if (user.role === 'admin') switchRole('admin');
    } catch (err) {
        ErrorHandler.handleApiError(err, 'globalMessage');
    }
});

// ==================== INITIALIZATION ====================
 
// Initialize toggles and initial load
initRoleToggle();
switchRole(currentRole);
updateHeaderUser();
loadParticipantEvents();

// Clear field errors on input
document.querySelectorAll('input, textarea, select').forEach(input => {
    input.addEventListener('input', function() {
        ErrorHandler.clearFieldError(this.id);
    });
});

// Close modals on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('show');
        }
    });
});

console.log('Event & Club Management System Frontend initialized!');

// Expose initial tab state
switchTab('browse');
