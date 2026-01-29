const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ExcelJS = require('exceljs');

const app = express();
const PORT = 3000;

// ==================== MIDDLEWARE ====================

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// ==================== IN-MEMORY DATABASE ====================

let events = [
    {
        id: '1',
        name: 'Tech Hackathon 2026',
        description: 'Join us for a 24-hour coding marathon where you can build innovative solutions and win exciting prizes!',
        date: '2026-02-15',
        capacity: 100,
        createdAt: new Date().toISOString()
    },
    {
        id: '2',
        name: 'AI/ML Workshop',
        description: 'Learn the fundamentals of Machine Learning and build your first AI model in this hands-on workshop.',
        date: '2026-02-20',
        capacity: 50,
        createdAt: new Date().toISOString()
    }
];

let registrations = [];
let announcements = [];

// In-memory users and token store for simple auth
let users = [];
let tokens = {}; // token -> userId

// create a default admin user
const defaultAdmin = {
    id: 'admin-1',
    name: 'Administrator',
    email: 'admin@local',
    password: 'admin123', // plain-text for demo only
    role: 'admin',
    createdAt: new Date().toISOString()
};
users.push(defaultAdmin);

// ==================== VALIDATION MIDDLEWARE ====================

const validateEventData = (req, res, next) => {
    const { name, description, date, capacity } = req.body;
    const errors = {};

    if (!name || name.trim().length < 3) {
        errors.name = 'Event name must be at least 3 characters';
    }

    if (!description || description.trim().length < 10) {
        errors.description = 'Description must be at least 10 characters';
    }

    if (!date) {
        errors.date = 'Event date is required';
    } else {
        const eventDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (eventDate < today) {
            errors.date = 'Event date cannot be in the past';
        }
    }

    if (!capacity || capacity < 1) {
        errors.capacity = 'Capacity must be at least 1';
    } else if (capacity > 10000) {
        errors.capacity = 'Capacity cannot exceed 10,000';
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors
        });
    }

    next();
};

const validateRegistrationData = (req, res, next) => {
    const { name, email, phone } = req.body;
    const errors = {};

    if (!name || name.trim().length < 2) {
        errors.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        errors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
        errors.email = 'Please enter a valid email address';
    }

    const phoneRegex = /^\d{10}$/;
    if (!phone) {
        errors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
        errors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors
        });
    }

    next();
};

const validateAnnouncement = (req, res, next) => {
    const { message } = req.body;
    const errors = {};

    if (!message || message.trim().length < 5) {
        errors.message = 'Announcement must be at least 5 characters';
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors
        });
    }

    next();
};

// Authorization middleware: check for valid token and admin role
const authorizationMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Authorization header required (Bearer <token>)'
        });
    }

    const token = parts[1];
    const userId = tokens[token];

    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'User not found'
        });
    }

    if (user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Admin role required for this action'
        });
    }

    req.user = user;
    next();
};

// ==================== EVENT ROUTES ====================

// ==================== AUTH ROUTES (simple in-memory) ====================

// Helper: generate a simple token
function generateTokenForUser(userId) {
    const token = Buffer.from(`${userId}|${Date.now()}`).toString('base64');
    tokens[token] = userId;
    return token;
}

// Signup
app.post('/api/auth/signup', (req, res) => {
    try {
        const { name, email, password } = req.body;
        const errors = {};
        if (!name || name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) errors.email = 'Valid email is required';
        if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters';

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, error: 'Validation failed', errors });
        }

        const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            return res.status(409).json({ success: false, error: 'Email already registered' });
        }

        const newUser = {
            id: `user-${Date.now()}`,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password, // demo only
            role: 'participant',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        const token = generateTokenForUser(newUser.id);

        res.status(201).json({ success: true, message: 'Signup successful', data: { user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }, token } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Signup failed', message: error.message });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const token = generateTokenForUser(user.id);

        res.json({ success: true, message: 'Login successful', data: { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Login failed', message: error.message });
    }
});

// Get current user by token
app.get('/api/auth/me', (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const parts = auth.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const token = parts[1];
        const userId = tokens[token];
        if (!userId) return res.status(401).json({ success: false, error: 'Invalid token' });
        const user = users.find(u => u.id === userId);
        if (!user) return res.status(401).json({ success: false, error: 'User not found' });
        res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch user', message: error.message });
    }
});


// Get all events
app.get('/api/events', (req, res) => {
    try {
        res.json({
            success: true,
            data: events
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch events',
            message: error.message
        });
    }
});

// Get single event
app.get('/api/events/:id', (req, res) => {
    try {
        const event = events.find(e => e.id === req.params.id);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        res.json({
            success: true,
            data: event
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch event',
            message: error.message
        });
    }
});

// Create event
app.post('/api/events', authorizationMiddleware, validateEventData, (req, res) => {
    try {
        const { name, description, date, capacity } = req.body;

        const newEvent = {
            id: Date.now().toString(),
            name: name.trim(),
            description: description.trim(),
            date,
            capacity: parseInt(capacity),
            createdAt: new Date().toISOString()
        };

        events.push(newEvent);

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: newEvent
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create event',
            message: error.message
        });
    }
});

// Update event
app.put('/api/events/:id', authorizationMiddleware, validateEventData, (req, res) => {
    try {
        const eventIndex = events.findIndex(e => e.id === req.params.id);
        
        if (eventIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const { name, description, date, capacity } = req.body;

        events[eventIndex] = {
            ...events[eventIndex],
            name: name.trim(),
            description: description.trim(),
            date,
            capacity: parseInt(capacity),
            updatedAt: new Date().toISOString()
        };

        res.json({
            success: true,
            message: 'Event updated successfully',
            data: events[eventIndex]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update event',
            message: error.message
        });
    }
});

// Delete event
app.delete('/api/events/:id', authorizationMiddleware, (req, res) => {
    try {
        const eventIndex = events.findIndex(e => e.id === req.params.id);
        
        if (eventIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const eventId = req.params.id;
        
        // Remove event
        events.splice(eventIndex, 1);
        
        // Remove related registrations and announcements
        registrations = registrations.filter(r => r.eventId !== eventId);
        announcements = announcements.filter(a => a.eventId !== eventId);

        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete event',
            message: error.message
        });
    }
});

// ==================== REGISTRATION ROUTES ====================

// Get all registrations for an event
app.get('/api/events/:id/registrations', (req, res) => {
    try {
        const event = events.find(e => e.id === req.params.id);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const eventRegistrations = registrations.filter(r => r.eventId === req.params.id);

        res.json({
            success: true,
            data: eventRegistrations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch registrations',
            message: error.message
        });
    }
});

// Register for event
app.post('/api/events/:id/register', validateRegistrationData, (req, res) => {
    try {
        const event = events.find(e => e.id === req.params.id);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const { name, email, phone } = req.body;

        // Check for duplicate registration
        const existingReg = registrations.find(r => 
            r.eventId === req.params.id && r.email === email
        );

        if (existingReg) {
            return res.status(409).json({
                success: false,
                error: 'You are already registered for this event',
                data: existingReg
            });
        }

        // Check capacity
        const confirmedCount = registrations.filter(r => 
            r.eventId === req.params.id && r.status === 'confirmed'
        ).length;

        if (confirmedCount >= event.capacity) {
            return res.status(400).json({
                success: false,
                error: 'Event is at full capacity'
            });
        }

        const newRegistration = {
            id: Date.now().toString(),
            eventId: req.params.id,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            status: 'confirmed',
            registeredAt: new Date().toISOString()
        };

        registrations.push(newRegistration);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: newRegistration
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to register',
            message: error.message
        });
    }
});

// Update registration status
app.patch('/api/registrations/:id/status', (req, res) => {
    try {
        const { status } = req.body;

        if (!['confirmed', 'pending', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be confirmed, pending, or rejected'
            });
        }

        const regIndex = registrations.findIndex(r => r.id === req.params.id);
        
        if (regIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            });
        }

        const registration = registrations[regIndex];

        // Check capacity if confirming
        if (status === 'confirmed' && registration.status !== 'confirmed') {
            const event = events.find(e => e.id === registration.eventId);
            const confirmedCount = registrations.filter(r => 
                r.eventId === registration.eventId && r.status === 'confirmed'
            ).length;
            
            if (confirmedCount >= event.capacity) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot confirm - event is at capacity'
                });
            }
        }

        registrations[regIndex].status = status;
        registrations[regIndex].updatedAt = new Date().toISOString();

        res.json({
            success: true,
            message: 'Registration status updated',
            data: registrations[regIndex]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update status',
            message: error.message
        });
    }
});

// Check registration status by email
app.get('/api/events/:id/check-registration', (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email parameter is required'
            });
        }

        const registration = registrations.find(r => 
            r.eventId === req.params.id && r.email === email.toLowerCase()
        );

        res.json({
            success: true,
            data: registration || null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to check registration',
            message: error.message
        });
    }
});

// ==================== ANNOUNCEMENT ROUTES ====================

// Get announcements for an event
app.get('/api/events/:id/announcements', (req, res) => {
    try {
        const event = events.find(e => e.id === req.params.id);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const eventAnnouncements = announcements.filter(a => a.eventId === req.params.id);

        res.json({
            success: true,
            data: eventAnnouncements
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch announcements',
            message: error.message
        });
    }
});

// Create announcement
app.post('/api/events/:id/announcements', authorizationMiddleware, validateAnnouncement, (req, res) => {
    try {
        const event = events.find(e => e.id === req.params.id);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const { message } = req.body;

        const newAnnouncement = {
            id: Date.now().toString(),
            eventId: req.params.id,
            message: message.trim(),
            sentAt: new Date().toISOString()
        };

        announcements.push(newAnnouncement);

        const participantCount = registrations.filter(r => r.eventId === req.params.id).length;

        res.status(201).json({
            success: true,
            message: `Announcement sent to ${participantCount} participant(s)`,
            data: newAnnouncement
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to send announcement',
            message: error.message
        });
    }
});

// ==================== EXCEL EXPORT ROUTES ====================

// Download participants as Excel
app.get('/api/events/:id/download-participants', async (req, res) => {
    try {
        const event = events.find(e => e.id === req.params.id);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const eventRegistrations = registrations.filter(r => r.eventId === req.params.id);

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Participants');

        // Add title
        worksheet.mergeCells('A1:D1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `${event.name} - Participants List`;
        titleCell.font = { bold: true, size: 14 };
        titleCell.alignment = { horizontal: 'center', vertical: 'center' };
        worksheet.getRow(1).height = 25;

        // Add event details
        worksheet.mergeCells('A2:D2');
        const detailsCell = worksheet.getCell('A2');
        detailsCell.value = `Event Date: ${event.date} | Total Capacity: ${event.capacity}`;
        detailsCell.font = { size: 11, italic: true };
        detailsCell.alignment = { horizontal: 'center' };
        worksheet.getRow(2).height = 20;

        // Add headers
        const headerRow = worksheet.getRow(4);
        headerRow.values = ['S.No', 'Name', 'Email', 'Phone', 'Status', 'Registration Date'];
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667EEA' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'center' };
        worksheet.getRow(4).height = 20;

        // Set column widths
        worksheet.columns = [
            { width: 8 },   // S.No
            { width: 25 },  // Name
            { width: 30 },  // Email
            { width: 15 },  // Phone
            { width: 12 },  // Status
            { width: 20 }   // Registration Date
        ];

        // Add participant data
        eventRegistrations.forEach((participant, index) => {
            const row = worksheet.getRow(5 + index);
            row.values = [
                index + 1,
                participant.name,
                participant.email,
                participant.phone,
                participant.status.toUpperCase(),
                new Date(participant.registeredAt).toLocaleDateString()
            ];

            // Alternate row colors
            if (index % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
            }

            // Center align status and S.No
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(5).alignment = { horizontal: 'center' };

            // Color-code status
            const statusCell = row.getCell(5);
            if (participant.status === 'confirmed') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
                statusCell.font = { color: { argb: 'FF006100' } };
            } else if (participant.status === 'pending') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
                statusCell.font = { color: { argb: 'FF9C6500' } };
            } else {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
                statusCell.font = { color: { argb: 'FF9C0006' } };
            }
        });

        // Add summary row
        const summaryRowNum = 5 + eventRegistrations.length + 1;
        const summaryRow = worksheet.getRow(summaryRowNum);
        summaryRow.values = [
            '',
            `Total Participants: ${eventRegistrations.length}`,
            `Confirmed: ${eventRegistrations.filter(r => r.status === 'confirmed').length}`,
            `Pending: ${eventRegistrations.filter(r => r.status === 'pending').length}`,
            `Rejected: ${eventRegistrations.filter(r => r.status === 'rejected').length}`
        ];
        summaryRow.font = { bold: true };
        summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };

        // Generate Excel file
        const filename = `${event.name.replace(/\s+/g, '_')}_Participants_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Excel generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate Excel file',
            message: error.message
        });
    }
});

// ==================== STATISTICS ROUTES ====================

app.get('/api/stats', (req, res) => {
    try {
        const stats = {
            totalEvents: events.length,
            totalRegistrations: registrations.length,
            totalAnnouncements: announcements.length,
            upcomingEvents: events.filter(e => new Date(e.date) >= new Date()).length
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.url}`
    });
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║  Event & Club Management System - Backend Server      ║
║  Server running on http://localhost:${PORT}             ║
║                                                        ║
║  API Endpoints:                                        ║
║  - GET    /api/events                                  ║
║  - POST   /api/events                                  ║
║  - GET    /api/events/:id                              ║
║  - PUT    /api/events/:id                              ║
║  - DELETE /api/events/:id                              ║
║  - GET    /api/events/:id/registrations                ║
║  - POST   /api/events/:id/register                     ║
║  - PATCH  /api/registrations/:id/status                ║
║  - GET    /api/events/:id/announcements                ║
║  - POST   /api/events/:id/announcements                ║
║  - GET    /api/stats                                   ║
╚════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
