# API Reference for Frontend Engineers

This document provides a comprehensive reference for all backend APIs available for the ticketing platform frontend.

---

## Base URL

```
http://localhost:5000/api
```

---

## Authentication

Most endpoints require authentication via JWT token stored in cookies. The token is automatically set when logging in or registering.

---

## API Endpoints

### Auth APIs (`/api/auth`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/register` | No | Register a new user account |
| POST | `/api/auth/login` | No | Login with email and password |
| GET | `/api/auth/profile` | Yes | Get current user profile information |
| POST | `/api/auth/logout` | No | Logout and clear JWT cookie |

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "yourpassword"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": { "id": "...", "fullName": "...", "email": "...", "role": "student" }
}
```

---

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "yourpassword"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": { "id": "...", "fullName": "...", "email": "...", "role": "student" }
}
```

---

#### GET `/api/auth/profile`
Get current authenticated user's profile.

**Response (200):**
```json
{
  "success": true,
  "message": "User information retrieved successfully",
  "token": "jwt_token_here",
  "user": { "id": "...", "fullName": "...", "email": "...", "role": "student" }
}
```

---

#### POST `/api/auth/logout`
Logout and clear the JWT cookie.

**Response (200):**
```
Logout successfully.
```

---

### Event APIs (`/api/events`)

| Method | Endpoint | Auth Required | Admin Only | Description |
|--------|----------|---------------|------------|-------------|
| GET | `/api/events` | Yes | No | Get all events |
| GET | `/api/events/:id` | Yes | No | Get event details by ID |
| POST | `/api/events` | Yes | Yes | Create a new event |
| PUT | `/api/events/:id` | Yes | Yes | Update an existing event |
| DELETE | `/api/events/:id` | Yes | Yes | Delete an event |

#### GET `/api/events`
Fetch all events.

**Response (200):**
```json
{
  "count": 5,
  "events": [
    {
      "_id": "...",
      "event_name": "Tech Conference 2026",
      "event_description": "Annual tech conference",
      "event_date": "2026-03-15T10:00:00.000Z",
      "location": "Main Hall",
      "capacity": 500,
      "price": 100,
      "created_at": "..."
    }
  ]
}
```

---

#### GET `/api/events/:id`
Get a specific event by ID.

**Response (200):**
```json
{
  "event": {
    "_id": "...",
    "event_name": "Tech Conference 2026",
    "event_description": "Annual tech conference",
    "event_date": "2026-03-15T10:00:00.000Z",
    "location": "Main Hall",
    "capacity": 500,
    "created_at": "..."
  }
}
```

---

#### POST `/api/events` (Admin Only)
Create a new event.

**Request Body:**
```json
{
  "event_name": "Tech Conference 2026",
  "event_description": "Annual tech conference",
  "event_date": "2026-03-15T10:00:00.000Z",
  "location": "Main Hall",
  "capacity": 500,
  "price": 100
}
```

**Response (201):**
```json
{
  "message": "Event created successfully",
  "event": { ... }
}
```

---

#### PUT `/api/events/:id` (Admin Only)
Update an existing event.

**Request Body (partial update allowed):**
```json
{
  "event_name": "Updated Event Name",
  "capacity": 600
}
```

**Response (200):**
```json
{
  "message": "Event updated successfully",
  "event": { ... }
}
```

---

#### DELETE `/api/events/:id` (Admin Only)
Delete an event.

**Response (200):**
```json
{
  "message": "Event deleted successfully"
}
```

---

### Ticket APIs (`/api/tickets`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/tickets/book` | Yes | Book a ticket for an event |
| GET | `/api/tickets` | Yes | Get all tickets (filtered by user role) |
| GET | `/api/tickets/:id` | Yes | Get ticket details by ID |
| GET | `/api/tickets/download/:id` | Yes | Download ticket as PDF |
| GET | `/api/tickets/bulk-download/:eventId` | Yes | Bulk download all tickets for an event |
| PATCH | `/api/tickets/:id/cancel` | Yes | Cancel a ticket |

#### POST `/api/tickets/book`
Book a ticket for an event (for free events only, use payment API for paid events).

**Request Body:**
```json
{
  "event_id": "event_object_id",
  "ticket_type": "regular"
}
```
*ticket_type options: "regular", "vip", "early_bird"*

**Response (201):**
```json
{
  "message": "Ticket booked successfully",
  "ticket": {
    "_id": "...",
    "ticket_code": "TKT-ABC123",
    "status": "booked",
    "event_id": { "event_name": "...", "event_date": "...", "location": "..." },
    "user_id": { "fullName": "...", "email": "..." }
  }
}
```

---

#### GET `/api/tickets`
Get all tickets. Students see only their tickets, admins/coordinators see all.

**Query Parameters (optional):**
- `event_id` - Filter by event ID
- `status` - Filter by status (pending, booked, cancelled)

**Response (200):**
```json
{
  "count": 10,
  "tickets": [
    {
      "_id": "...",
      "ticket_code": "TKT-ABC123",
      "status": "booked",
      "ticket_type": "regular",
      "event_id": { "event_name": "...", "event_date": "...", "location": "..." },
      "user_id": { "fullName": "...", "email": "..." },
      "created_at": "..."
    }
  ]
}
```

---

#### GET `/api/tickets/:id`
Get details of a specific ticket.

**Response (200):**
```json
{
  "ticket": {
    "_id": "...",
    "ticket_code": "TKT-ABC123",
    "qr_code": "...",
    "status": "booked",
    "event_id": { ... },
    "user_id": { ... }
  }
}
```

---

#### GET `/api/tickets/download/:id`
Download a ticket as PDF.

**Response:** PDF file download

---

#### GET `/api/tickets/bulk-download/:eventId`
Download all tickets for an event as a ZIP file containing PDFs.

**Response:** ZIP file download

---

#### PATCH `/api/tickets/:id/cancel`
Cancel a ticket.

**Response (200):**
```json
{
  "message": "Ticket cancelled successfully",
  "ticket": { ... }
}
```

---

### Payment APIs (`/api/payments`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/payments/initiate` | Yes | Initiate payment for a paid event |
| POST | `/api/payments/callback/success` | No | PayU success callback (server-to-server) |
| POST | `/api/payments/callback/failure` | No | PayU failure callback (server-to-server) |
| GET | `/api/payments/:ticketId` | Yes | Get payment status for a ticket |
| GET | `/api/payments` | Yes | Get all payments |

#### POST `/api/payments/initiate`
Initiate payment for a paid event ticket.

**Request Body:**
```json
{
  "event_id": "event_object_id",
  "ticket_type": "regular"
}
```

**Response (200) - For Paid Events:**
```json
{
  "message": "Payment initiated",
  "payment_id": "...",
  "ticket_id": "...",
  "payu_url": "https://test.payu.in/_payment",
  "payu_params": {
    "key": "...",
    "txnid": "TXN-...",
    "amount": "100.00",
    "productinfo": "Ticket for Tech Conference",
    "firstname": "John",
    "email": "john@example.com",
    "phone": "9876543210",
    "surl": "...",
    "furl": "...",
    "hash": "..."
  }
}
```

**Response (201) - For Free Events:**
```json
{
  "message": "Free ticket booked successfully",
  "ticket": { ... },
  "is_free": true
}
```

---

#### GET `/api/payments/:ticketId`
Get payment status for a specific ticket.

**Response (200):**
```json
{
  "payment": {
    "_id": "...",
    "amount": 100,
    "payment_status": "completed",
    "payment_gateway": "PayU",
    "payu_txnid": "TXN-..."
  }
}
```

---

#### GET `/api/payments`
Get all payments (for current user or all for admins).

**Response (200):**
```json
{
  "count": 5,
  "payments": [
    {
      "_id": "...",
      "amount": 100,
      "payment_status": "completed",
      "ticket_id": "...",
      "event_id": "...",
      "created_at": "..."
    }
  ]
}
```

---

## Features Requiring Backend API Development

The following features are currently implemented in the frontend using **mock/local storage** but have **no corresponding backend APIs** yet:

### 1. User Management APIs (REMAINING)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users (admin) |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create a new user (admin) |
| PUT | `/api/users/:id` | Update user details |
| DELETE | `/api/users/:id` | Delete a user |

### 2. Profile Management APIs (REMAINING)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/auth/profile` | Update current user profile |
| PUT | `/api/auth/change-password` | Change user password |
| GET | `/api/auth/check-email/:email` | Check if email is available |

### 3. Attendance Management APIs (REMAINING)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attendance` | Get all attendance records |
| GET | `/api/attendance/:eventId` | Get attendance for an event |
| POST | `/api/attendance/checkin` | Check-in a ticket/user |
| PUT | `/api/attendance/:id` | Update attendance record |
| PUT | `/api/attendance/bulk` | Bulk update attendance |

### 4. Notification APIs (REMAINING)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications for current user |
| POST | `/api/notifications` | Send a notification |
| PUT | `/api/notifications/:id/read` | Mark notification as read |
| DELETE | `/api/notifications/:id` | Delete a notification |

### 5. Activity Log APIs (REMAINING)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs` | Get all activity logs (admin) |
| GET | `/api/logs/user/:userId` | Get logs for a specific user |
| POST | `/api/logs` | Create a log entry |

---

## Notes for Frontend Engineers

1. **Authentication**: JWT tokens are stored in HTTP-only cookies. Include `credentials: 'include'` in your fetch requests.

2. **Error Handling**: All endpoints return appropriate HTTP status codes:
   - `400` - Bad Request (validation errors)
   - `401` - Unauthorized (not logged in)
   - `403` - Forbidden (insufficient permissions)
   - `404` - Not Found
   - `409` - Conflict (e.g., duplicate email)
   - `500` - Internal Server Error

3. **Role-Based Access**:
   - `student` - Can view events, book tickets, view own tickets
   - `coordinator` - Can view all tickets for their events
   - `admin` - Full access to all resources

4. **Payment Flow**:
   1. Call `POST /api/payments/initiate` with event_id
   2. For paid events, redirect user to PayU using returned `payu_url` and `payu_params`
   3. PayU redirects back to frontend success/failure pages
   4. Backend handles PayU callbacks to update payment/ticket status

---

## Quick Reference

```javascript
// Example API calls using fetch

// Login
const login = async (email, password) => {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });
  return res.json();
};

// Get Events
const getEvents = async () => {
  const res = await fetch('http://localhost:5000/api/events', {
    credentials: 'include'
  });
  return res.json();
};

// Book Ticket
const bookTicket = async (eventId) => {
  const res = await fetch('http://localhost:5000/api/tickets/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ event_id: eventId, ticket_type: 'regular' })
  });
  return res.json();
};
```

---

*Last Updated: February 2026*
