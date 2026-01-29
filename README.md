# Event & Club Management System

A full-stack web application for managing campus events with participant registration, admin controls, and announcements.

## 🚀 Features

### Participant Features
- Browse upcoming events
- Register for events with form validation
- View registration status (confirmed/pending/rejected)
- Receive event announcements and updates
- Email-based registration tracking

### Admin Features
- Create and manage events
- View all registrations per event
- Update participant status (confirm/pending/reject)
- Send announcements to participants
- Delete events with cascade deletion
- Real-time capacity tracking

### Error Handling
- **Form Validation**: Client-side and server-side validation for all inputs
- **Field-level Errors**: Specific error messages for each form field
- **API Error Handling**: Proper HTTP status codes and error messages
- **Capacity Management**: Prevents overbooking with real-time checks
- **Duplicate Prevention**: Stops duplicate registrations
- **Connection Status**: Visual indicator for backend connectivity
- **User-friendly Messages**: Clear success/error/warning notifications

## 🛠️ Tech Stack

**Backend:**
- Node.js
- Express.js
- In-memory data storage (easily replaceable with a database)

**Frontend:**
- Vanilla JavaScript
- HTML5/CSS3
- Fetch API for backend communication

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## 🔧 Installation & Setup

1. **Navigate to the project directory:**
   ```bash
   cd event-management-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   ```
   http://localhost:3000
   ```

The server will start on port 3000, and the frontend will be served automatically.

## 📁 Project Structure

```
event-management-system/
├── server.js              # Express backend with REST API
├── public/
│   └── index.html        # Frontend application
├── package.json          # Dependencies and scripts
└── README.md            # Documentation
```

## 🔌 API Endpoints

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event
- `GET /api/events/:id` - Get single event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Registrations
- `GET /api/events/:id/registrations` - Get event registrations
- `POST /api/events/:id/register` - Register for event
- `PATCH /api/registrations/:id/status` - Update registration status
- `GET /api/events/:id/check-registration` - Check if email is registered

### Announcements
- `GET /api/events/:id/announcements` - Get event announcements
- `POST /api/events/:id/announcements` - Create announcement

### Statistics
- `GET /api/stats` - Get system statistics

## 🎯 Usage Guide

### As a Participant:
1. Open the application (defaults to Participant View)
2. Browse available upcoming events
3. Click "Register Now" on any event
4. Fill in your details (name, email, phone)
5. Submit registration
6. View your registration status on the event card
7. Check for announcements from organizers

### As an Admin:
1. Switch to "Admin View" using the toggle button
2. Click "+ Create Event" to add a new event
3. Fill in event details (name, description, date, capacity)
4. Click "View Participants" to see all registrations
5. Update participant status as needed (confirm/pending/reject)
6. Click "Send Update" to send announcements to participants
7. Delete events if needed

## ⚠️ Error Handling Examples

### Form Validation Errors:
- Name too short (< 2 characters)
- Invalid email format
- Invalid phone number (not 10 digits)
- Event date in the past
- Capacity < 1 or > 10,000

### Business Logic Errors:
- Duplicate registration attempts
- Event at full capacity
- Invalid status updates
- Missing required fields

### System Errors:
- Backend server not running
- Network connection issues
- Invalid API responses

## 🔒 Data Persistence

Currently uses in-memory storage. Data will be reset when the server restarts.

**To add a database:**
1. Install database driver (e.g., `npm install mongoose` for MongoDB)
2. Replace the in-memory arrays with database models
3. Update CRUD operations to use database queries

## 🎨 Customization

### Styling:
- All styles are in `public/index.html` within `<style>` tags
- Modify CSS variables for color scheme
- Adjust grid layout for different screen sizes

### Validation Rules:
- Update `validateEventData()` in `server.js`
- Modify frontend validation in `public/index.html`

### Sample Data:
- Edit the initial `events` array in `server.js`

## 🐛 Troubleshooting

**Frontend not loading:**
- Ensure server is running (`npm start`)
- Check console for errors
- Verify port 3000 is not in use

**Cannot register for events:**
- Check backend connection status indicator
- Verify server is running
- Check browser console for API errors

**Events not showing:**
- Ensure events have future dates
- Check browser console for errors
- Verify API responses in Network tab

## 📝 Future Enhancements

- [ ] User authentication and authorization
- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Email notifications
- [ ] File uploads for event posters
- [ ] Advanced search and filtering
- [ ] Calendar integration
- [ ] Export participant lists
- [ ] Event categories and tags
- [ ] Payment integration
- [ ] Mobile responsive improvements

## 👥 Contributing

Feel free to fork this project and submit pull requests for improvements!

## 📄 License

ISC License

---

**Developed for campus event management needs** 🎓
