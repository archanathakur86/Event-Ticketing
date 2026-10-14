# Backend Setup

This document explains the backend layout and how to set up and run the backend locally.

## Overview

The backend is a Node.js + Express server using MongoDB (Mongoose) for persistence and JWT for authentication.

## File tree (backend)

- index.js
- package.json
- setup.md
- src/
  - config/
    - db.js
  - controllers/
    - AuthController.js
  - middleware/
    - AuthMiddleware.js
  - models/
    - User.js
  - routes/
    - AuthRoute.js

## Prerequisites

- Node.js (recommended v16+ or latest LTS)
- npm (comes with Node)
- A MongoDB instance (local or MongoDB Atlas)

## Environment variables

Create a `.env` file in the `backend` folder with the following variables (example):

```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/mydb?retryWrites=true&w=majority
PORT=5000
JWT_SECRET=your_jwt_secret_here

# PayU Configuration (Test Mode)
PAYU_MERCHANT_KEY=your_test_merchant_key
PAYU_MERCHANT_SALT=your_test_merchant_salt
PAYU_BASE_URL=https://test.payu.in

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
```

## Install & run

1. Open a terminal in the `backend` folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Run development (if using `nodemon`):

```bash
npm run dev
```

4. Run production mode:

```bash
npm start
```

By default the server listens on the port in `PORT` (defaults to `5000` if not set).

## API Endpoints

All auth routes are mounted under `/api/auth` in `index.js`.

- **POST /api/auth/register:** Register a new user.
  - Method: POST
  - Route: `/api/auth/register`
  - Body (JSON): `{ fullName, email, phone, password }`
  - Description: Creates a new user, returns `token` and `user` on success and sets a `jwt` cookie.

- **POST /api/auth/login:** Authenticate a user.
  - Method: POST
  - Route: `/api/auth/login`
  - Body (JSON): `{ email, password }`
  - Description: Verifies credentials, returns `token` and `user` on success and sets a `jwt` cookie.

- **GET /api/auth/profile:** Get authenticated user info.
  - Method: GET
  - Route: `/api/auth/profile`
  - Auth: Requires authentication (JWT cookie or token via `verifyToken` middleware).
  - Description: Returns the user's information.

- **POST /api/auth/logout:** Logout the current user.
  - Method: POST
  - Route: `/api/auth/logout`
  - Description: Clears the `jwt` cookie and returns a success message.
