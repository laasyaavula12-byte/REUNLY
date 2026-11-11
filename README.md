# REUNLY — Smart Campus Lost and Found Portal

**Lost something? Let's reunite.**

REUNLY is a web-based campus lost and found platform designed to help students report lost belongings, discover found items, connect with other students, and recover their belongings through a simple and secure system.

## Features

- **Student Authentication:** Registration, login, logout, and password recovery.
- **Student Profiles:** Student details and account information.
- **Report Items:** Submit lost and found item reports.
- **Browse Items:** Explore and search active listings.
- **Image Uploads:** Attach images to item reports.
- **Claim Management:** Submit, approve, and reject claims.
- **Found Item Responses:** Allow students to respond to lost-item reports.
- **Recovery Tracking:** Track item status from active to claimed and returned.
- **Student Dashboard:** Manage reports, claims, and found-item responses.

## Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js

### Database and Authentication
- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage

### Development Tools
- Visual Studio Code
- Git and GitHub
- npm

## Project Structure

```text
REUNLY/
├── config/
├── controllers/
├── middleware/
├── models/
├── public/
│   ├── images/
│   ├── uploads/
│   ├── index.html
│   ├── browse.html
│   ├── report.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── forgot-password.html
│   └── reset-password.html
├── routes/
├── tests/
├── utils/
├── server.js
├── package.json
├── package-lock.json
├── .env.example
└── README.md
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/laasyaavula12-byte/REUNLY.git
cd REUNLY
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root using `.env.example` as a reference.

Configure the following variables:

```env
PORT=3000

SUPABASE_URL=your_supabase_project_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key

JWT_SECRET=your_jwt_secret

PASSWORD_RESET_REDIRECT_URL=http://localhost:3000/reset-password.html
```

Never commit your `.env` file or expose secret keys.

### 4. Run the application

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

### 5. Open the application

Visit:

```text
http://localhost:3000
```

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/register` | POST | Student registration |
| `/api/auth/login` | POST | Student login |
| `/api/auth/me` | GET | Retrieve student profile |
| `/api/auth/logout` | POST | Student logout |
| `/api/auth/forgot-password` | POST | Request password recovery |
| `/api/auth/reset-password` | POST | Update password |
| `/api/items` | GET / POST | Browse and report items |
| `/api/claims` | GET / POST / PATCH | Manage claims |
| `/api/dashboard` | GET | Retrieve dashboard data |
| `/api/found-responses` | GET / POST / PATCH | Manage found-item responses |

## Project Objective

The objective of REUNLY is to simplify the campus lost and found process by providing a centralized platform that connects students and makes recovering lost belongings easier, more organized, and more transparent.

## Developer

**Laasya Avula**

B.Tech — Computer Science

GitHub: [laasyaavula12-byte](https://github.com/laasyaavula12-byte)

---

**REUNLY — Lost something? Let's reunite.**