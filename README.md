# REUNLY — Smart Campus Lost and Found Portal

A full-stack campus lost-and-found application built for the Web Technology and Internet Programming individual project.

## Technology
- Frontend: HTML5, CSS3, JavaScript
- Backend: Node.js and Express.js
- Database: MongoDB Atlas with Mongoose (to be configured)
- API testing: Postman

## Setup

1. Install Node.js (LTS).
2. Open this folder in VS Code.
3. In the terminal, install dependencies:

   ```bash
   npm install express mongoose dotenv cors bcryptjs jsonwebtoken multer
   npm install --save-dev nodemon
   ```

4. Copy `.env.example` to `.env` and fill in your own values.
5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open http://localhost:3000

## Initial API check
- `GET /api/health` — confirms that the Express server is running.

## Project status
This is the starter scaffold. Authentication, MongoDB models, item reports, claims, dashboards, validation, and tests will be implemented step by step.
