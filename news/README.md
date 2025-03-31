# PressMatrix - Newspaper Distribution System

A comprehensive newspaper distribution and tracking system built with the MERN stack (MongoDB, Express.js, React.js, Node.js).

## Features

- Hierarchical user roles (Admin, Manufacturer, District Distributor, Area Distributor, Vendor)
- Newspaper distribution tracking
- Sales and inventory management
- Analytics and reporting
- Real-time data updates

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/pressmatrix
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=development
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd pressmatrix-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- POST /api/auth/signup - Register a new user
- POST /api/auth/login - Login user

### User Management
- GET /api/users - Get all users (Admin only)
- GET /api/users/by-role/:role - Get users by role (Admin only)
- GET /api/users/subordinates - Get subordinates
- PATCH /api/users/:id - Update user (Admin only)
- DELETE /api/users/:id - Delete user (Admin only)

### Newspaper Distribution
- POST /api/newspapers/addNewspapers - Add newspapers (Manufacturer only)
- POST /api/newspapers/distributeNewspapers - Distribute newspapers (Distributors only)
- PATCH /api/newspapers/updateUnsold/:id - Update unsold newspapers (Vendors only)
- GET /api/newspapers/history - Get distribution history

### Reports
- POST /api/reports/generate - Generate daily report
- GET /api/reports/my-reports - Get user's reports
- GET /api/reports/subordinates - Get subordinates' reports
- GET /api/reports/analytics - Get analytics data

## User Roles and Permissions

1. Admin
   - Full system access
   - User management
   - View all reports and analytics

2. Manufacturer
   - Add newspapers
   - Distribute to district distributors
   - View own reports

3. District Distributor
   - Receive from manufacturer
   - Distribute to area distributors
   - View own and subordinates' reports

4. Area Distributor
   - Receive from district distributor
   - Distribute to vendors
   - View own and subordinates' reports

5. Vendor
   - Receive from area distributor
   - Update unsold newspapers
   - View own reports

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 