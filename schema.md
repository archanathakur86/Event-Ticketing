# ER Diagram (Conceptual Design)

---
## **Core Entities**

* User
* Role
* Event
* Ticket
* Payment
* Attendance
* IDCardTemplate
* LoginLog
* Notification (Email)

---

## **ER Relationships**

```
Role 1 ────< User
User 1 ────< Ticket >──── 1 Event
Ticket 1 ────1 Payment
Ticket 1 ────1 Attendance
Event 1 ────< Ticket
Event 1 ────< IDCardTemplate
User 1 ────< LoginLog
Event 1 ────< Notification
```

---

## **Entity Descriptions**

### **Role**

* Defines access level (Super Admin, Coordinator, Student, Administration)

### **User**

* Stores login and profile details
* Each user belongs to **one role**

### **Event**

* Event details like date, location, capacity

### **Ticket**

* Connects **User ↔ Event**
* Represents registration

### **Payment**

* Stores PayU transaction details

### **Attendance**

* Tracks event participation

### **IDCardTemplate**

* Uploaded template for bulk ticket/ID generation

### **LoginLog**

* Tracks login/logout with location

### **Notification**

* Email updates sent to attendees

---

# 2. Database Schema (Relational Model)

Below is a **normalized SQL-style schema**.

---

## **roles**

```sql
role_id (PK)
role_name (UNIQUE)
```

---

## **users**

```sql
user_id (PK)
role_id (FK → roles.role_id)
full_name
email (UNIQUE)
phone
password_hash
status (active/inactive)
created_at
```

---

## **events**

```sql
event_id (PK)
event_name
event_description
event_date
location
created_by (FK → users.user_id)
created_at
```

---

## **tickets**

```sql
ticket_id (PK)
user_id (FK → users.user_id)[nullable]
event_id (FK → events.event_id)
ticket_type
price
ticket_code (UNIQUE)
qr_code
status (purchased/refunded/unbought)
created_at
deleted_at
```

---

## **payments**

```sql
payment_id (PK)
ticket_id (FK → tickets.ticket_id)
payment_gateway (PayU)
transaction_id
amount
payment_status (success/failed/pending)
payment_date
```

---

## **attendance**

```sql
attendance_id (PK)
ticket_id (FK → tickets.ticket_id)
event_id (FK → events.event_id)
status (present/absent)
marked_by (FK → users.user_id)
marked_at
```

---

## **id_card_templates**

```sql
template_id (PK)
event_id (FK → events.event_id)
template_file_path
uploaded_by (FK → users.user_id)
uploaded_at
```

---

## **login_logs**

```sql
log_id (PK)
user_id (FK → users.user_id)
login_time
logout_time
location
```

---

## **notifications**

```sql
notification_id (PK)
event_id (FK → events.event_id)
subject
message_body
sent_by (FK → users.user_id)
sent_at
```

---
