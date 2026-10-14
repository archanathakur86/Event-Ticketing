# SEQUENCE DIAGRAMS

---
## 🎟 Sequence Diagram: Ticket Booking & Payment

### **Flow**

1. Student selects event
2. Books ticket
3. Payment initiated via PayU
4. PayU callback received
5. Ticket confirmed
6. Email sent

### **Mermaid Diagram**

```mermaid
sequenceDiagram
participant Student
participant Frontend
participant Backend
participant PayU
participant EmailService

Student->>Frontend: Select Event & Book Ticket
Frontend->>Backend: POST /tickets/book
Backend->>PayU: Initiate Payment
PayU-->>Backend: Payment Callback
Backend->>Backend: Verify Payment
Backend->>EmailService: Send Ticket Email
Backend-->>Frontend: Ticket Confirmed
Frontend-->>Student: Show Ticket
```

---

## 📊 Sequence Diagram: Attendance Marking

```mermaid
sequenceDiagram
participant Coordinator
participant Frontend
participant Backend
participant Database

Coordinator->>Frontend: Mark Attendance
Frontend->>Backend: POST /attendance/mark
Backend->>Database: Save Attendance
Database-->>Backend: Success
Backend-->>Frontend: Confirmation
```

---

## 📧 Sequence Diagram: Send Event Updates

```mermaid
sequenceDiagram
participant Admin
participant Frontend
participant Backend
participant EmailService

Admin->>Frontend: Compose Update
Frontend->>Backend: POST /notifications/send
Backend->>EmailService: Send Bulk Emails
EmailService-->>Backend: Delivery Status
Backend-->>Frontend: Success Message
```

---

## 🔐 Sequence Diagram: Login & Logout Tracking

```mermaid
sequenceDiagram
participant User
participant Frontend
participant Backend
participant Database

User->>Frontend: Login
Frontend->>Backend: POST /auth/login
Backend->>Database: Log Login
Backend-->>Frontend: Auth Success

User->>Frontend: Logout
Frontend->>Backend: POST /auth/logout
Backend->>Database: Log Logout
Backend-->>Frontend: Logout Success
```
---

---
# 3. Use Case Diagrams (Role-Based)

## **Use Case Diagram – Super Admin**

### **Actors**

* Super Admin

### **Use Cases**

* Login / Logout
* View Dashboard
* Create & Manage Events
* Add New Student
* View Tickets & Ticket Details
* Upload ID Card Template
* Download Bulk Tickets
* Send Email Updates
* View & Export Attendance
* Track User Login/Logout

---

## **Use Case Diagram – Coordinator**

### **Actors**

* Coordinator

### **Use Cases**

* Login / Logout
* View Tickets
* View Ticket Details
* Download Bulk Tickets
* Mark Attendance
* Export Attendance Sheet

---

## **Use Case Diagram – Student**

### **Actors**

* Student

### **Use Cases**

* Register Account
* Login / Logout
* View Events
* Book Ticket
* Make Payment (PayU)
* View Dashboard
* Download Ticket
* Receive Email Notification

---

## **Use Case Diagram – Administration**

### **Actors**

* Administration

### **Use Cases**

* Login / Logout
* Manage Users
* Assign Roles
* Enable / Disable Accounts
* View Reports
* Reset Passwords

---
