# DutyDeck - Complete Staff Management Platform

DutyDeck is an all-in-one platform for Staff Management (SMS), Booking System, Point of Sale (POS), and Business Analytics designed specifically for Australian businesses with built-in compliance features.

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (version 14.0 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Web Browser** (Chrome, Firefox, Safari, or Edge)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/VINAYPULAMALA/clcokin-clockout.git
   cd clcokin-clockout
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Initialize Database**
   ```bash
   # The SQLite database will be created automatically on first run
   # Database file: backend/database.sqlite
   ```

4. **Start the Backend Server**
   ```bash
   node server.js
   ```

   You should see:
   ```
   Server running on http://localhost:4000
   Database connected successfully
   ```

5. **Access the Application**

   Open your web browser and navigate to:

   - **Main Application**: `http://localhost:4000/`
   - **Admin Portal**: `http://localhost:4000/admin.html`
   - **Staff Portal**: `http://localhost:4000/staff.html`
   - **Master Portal**: `http://localhost:4000/master.html`
   - **Investor Presentation**: `http://localhost:4000/investors/`

## 🏗️ Project Structure

```
dutydeck/
├── backend/
│   ├── server.js           # Express server & API endpoints
│   ├── db.js              # Database operations
│   ├── schema.sql         # Database structure
│   ├── database.sqlite    # SQLite database (auto-created)
│   ├── package.json       # Backend dependencies
│   └── node_modules/      # Backend packages
├── frontend/
│   ├── index.html         # Login/authentication page
│   ├── admin.html         # Staff management console
│   ├── staff.html         # Employee clock-in/out portal
│   ├── master.html        # Business & venue management
│   ├── *.css              # Styling files
│   ├── *.js               # Frontend JavaScript
│   └── public-holidays-config.js # Australian holidays
├── investors/
│   ├── index.html         # Investor presentation
│   ├── style.css          # Presentation styling
│   ├── script.js          # Presentation functionality
│   └── images/            # Logo and assets
└── README.md              # This file
```

## 🎯 Platform Features

### Three-Tier Management System

1. **Master Portal** (`/master.html`)
   - Business owners and system administrators
   - Manage multiple businesses and venues
   - Performance analytics and oversight

2. **Admin Console** (`/admin.html`)
   - Operations managers
   - Staff management and scheduling
   - Payroll calculations and reporting

3. **Staff Portal** (`/staff.html`)
   - Frontline employees
   - Clock in/out functionality
   - Personal dashboard and schedule viewing

### Core Functionality

- ✅ **Staff Management** - Complete employee lifecycle management
- ✅ **Time Tracking** - Real-time clock in/out with GPS support
- ✅ **Payroll Calculation** - Automatic pay rate calculations (weekday/Saturday/Sunday/holiday)
- ✅ **Australian Compliance** - Built-in public holiday system and award rates
- ✅ **Multi-Business Support** - Manage multiple businesses and venues
- ✅ **Real-time Analytics** - Performance dashboards and reporting

## 👥 Default Login Credentials

### Test Accounts

- **Manager Account**
  - Username: `bondi_manager`
  - Password: `password123`

- **Staff Account**
  - Username: `alice`
  - Password: `password123`

## 🗄️ Database Schema

The platform uses a normalized SQLite database with the following structure:

- **businesses** - Business information and settings
- **venues** - Venue details linked to businesses
- **staff** - Employee personal information
- **staff_employment** - Job roles and pay rates
- **staff_compliance** - Tax and banking details
- **staff_shifts** - Time tracking and shift records
- **users** - Authentication and access control

## 🔧 Configuration

### Environment Setup

The application runs on:
- **Backend**: `http://localhost:4000`
- **Database**: SQLite (file-based, no additional setup required)

### Public Holidays

Australian public holidays are configured in `frontend/public-holidays-config.js`. You can modify this file to add or update holiday dates.

### Database Customization

To reset or modify the database:
1. Stop the server
2. Delete `backend/database.sqlite`
3. Modify `backend/schema.sql` if needed
4. Restart the server (database will be recreated)

## 🚀 Deployment

### Local Development
```bash
cd backend
node server.js
```

### Production Deployment
1. Set up a VPS or cloud server
2. Install Node.js and dependencies
3. Configure environment variables for production
4. Use PM2 or similar process manager:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "dutydeck"
   ```

## 📱 API Endpoints

### Authentication
- `POST /login` - User authentication

### Business Management
- `GET /api/businesses` - List all businesses
- `POST /api/businesses` - Create new business
- `PUT /api/businesses/:id` - Update business
- `DELETE /api/businesses/:id` - Delete business

### Venue Management
- `GET /api/venues` - List venues
- `POST /api/venues` - Create venue
- `PUT /api/venues/:id` - Update venue
- `DELETE /api/venues/:id` - Delete venue

### Staff Management
- `GET /api/staff` - List staff members
- `GET /api/staff/:id` - Get staff details
- `POST /api/staff` - Create staff member
- `PUT /api/staff/:id` - Update staff member
- `DELETE /api/staff/:id` - Delete staff member

### Shift Management
- `GET /api/shifts` - List shifts
- `POST /api/shifts` - Create shift (clock in)
- `PUT /api/shifts/:id` - Update shift (clock out)

## 🛠️ Troubleshooting

### Common Issues

1. **Server won't start**
   - Check if Node.js is installed: `node --version`
   - Ensure port 4000 is available
   - Install dependencies: `npm install`

2. **Database errors**
   - Delete `backend/database.sqlite` and restart
   - Check file permissions in backend folder

3. **Login issues**
   - Use default credentials listed above
   - Check browser console for errors
   - Ensure backend server is running

4. **Blank pages**
   - Check browser console for JavaScript errors
   - Ensure all CSS/JS files are loading correctly
   - Clear browser cache

### Development Mode

For development with auto-restart:
```bash
npm install -g nodemon
cd backend
nodemon server.js
```

## 🎨 Investor Presentation

Access the professional investor presentation at:
`http://localhost:4000/investors/`

Features:
- Complete business overview and market analysis
- Interactive charts and animations
- Future roadmap and growth projections
- Investment opportunity details

## 📞 Support

For issues, questions, or contributions:

- **Email**: investors@dutydeck.com
- **Phone**: +61 40667 3639
- **Location**: Tasmania, Australia

## 📄 License

This project is proprietary software. All rights reserved.

---

**Last Updated**: September 2025
**Version**: 2.0
**Status**: Production Ready

## 🎯 Next Steps After Installation

1. **Explore the Platform**
   - Start with the investor presentation (`/investors/`)
   - Login to admin console to see staff management
   - Test the staff portal for clock in/out functionality

2. **Customize for Your Business**
   - Add your business information in master portal
   - Configure venues and locations
   - Set up staff members and pay rates

3. **Production Setup**
   - Configure proper authentication
   - Set up backup procedures
   - Implement SSL certificates for security

---

**🚀 You're now ready to run DutyDeck!**

Start the backend server and open `http://localhost:4000` to begin exploring the platform.