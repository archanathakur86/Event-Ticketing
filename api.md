# REST API DESIGN

---
## 🔐 Authentication & Authorization

### **Auth**

| Method | Endpoint                    | Description          |
| ------ | --------------------------- | -------------------- |
| POST   | `/api/auth/login`           | Login user           |
| POST   | `/api/auth/logout`          | Logout user          |
| POST   | `/api/auth/register`        | Student registration |
| POST   | `/api/auth/forgot-password` | Password reset       |
| GET    | `/api/auth/profile`         | Get logged-in user   |

**Auth Type:** JWT / Session-based
**Access Control:** Role-based middleware

---

## 👤 User Management (Admin / Super Admin)

| Method | Endpoint                 | Description           |
| ------ | ------------------------ | --------------------- |
| GET    | `/api/users`             | List all users        |
| POST   | `/api/users`             | Create user           |
| GET    | `/api/users/{id}`        | Get user details      |
| PUT    | `/api/users/{id}`        | Update user           |
| PATCH  | `/api/users/{id}/status` | Enable / Disable user |
| DELETE | `/api/users/{id}`        | Remove user           |

---

## 🎭 Roles

| Method | Endpoint     |
| ------ | ------------ |
| GET    | `/api/roles` |

---

## 📅 Events

| Method | Endpoint           | Description   |
| ------ | ------------------ | ------------- |
| POST   | `/api/events`      | Create event  |
| GET    | `/api/events`      | List events   |
| GET    | `/api/events/{id}` | Event details |
| PUT    | `/api/events/{id}` | Update event  |
| DELETE | `/api/events/{id}` | Delete event  |

---

## 🎟 Tickets

| Method | Endpoint                               | Description          |
| ------ | -------------------------------------- | -------------------- |
| POST   | `/api/tickets/book`                    | Book ticket          |
| GET    | `/api/tickets`                         | View tickets         |
| GET    | `/api/tickets/{id}`                    | Ticket details       |
| GET    | `/api/tickets/download/{id}`           | Download ticket      |
| GET    | `/api/tickets/bulk-download/{eventId}` | Bulk ticket download |

---

## 💳 Payments (PayU)

| Method | Endpoint                   | Description    |
| ------ | -------------------------- | -------------- |
| POST   | `/api/payments/initiate`   | Start payment  |
| POST   | `/api/payments/callback`   | PayU callback  |
| GET    | `/api/payments/{ticketId}` | Payment status |

---

## 🪪 ID Cards / Templates

| Method | Endpoint                      | Description        |
| ------ | ----------------------------- | ------------------ |
| POST   | `/api/id-templates`           | Upload template    |
| GET    | `/api/id-templates/{eventId}` | Get event template |

---

## 📊 Attendance

| Method | Endpoint                           | Description     |
| ------ | ---------------------------------- | --------------- |
| POST   | `/api/attendance/mark`             | Mark attendance |
| GET    | `/api/attendance/{eventId}`        | View attendance |
| GET    | `/api/attendance/export/{eventId}` | Export sheet    |

---

## 📧 Notifications (Emails)

| Method | Endpoint                       | Description             |
| ------ | ------------------------------ | ----------------------- |
| POST   | `/api/notifications/send`      | Send bulk email         |
| GET    | `/api/notifications/{eventId}` | View sent notifications |

---

## 🕒 Login / Logout Tracking

| Method | Endpoint           | Description |
| ------ | ------------------ | ----------- |
| POST   | `/api/logs/login`  | Log login   |
| POST   | `/api/logs/logout` | Log logout  |
| GET    | `/api/logs`        | View logs   |

---
