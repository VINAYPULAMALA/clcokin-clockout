# DutyDeck - Complete Staff Management Platform

DutyDeck is an all-in-one platform for Staff Management (SMS), Booking System, Point of Sale (POS), and Business Analytics designed specifically for Australian businesses with built-in compliance features.

## 🚀 Quick Start (v2.0.2)

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (version 14.0 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **Web Browser** (Chrome, Firefox, Safari, or Edge)

### ⭐ What's New in v2.0.2
- **Complete sample database** with realistic demo data
- **Enhanced Master Panel** with full business setup workflows
- **Improved authentication system** with multiple user roles
- **Production-ready kiosk interface** for staff clock-in/out
- **Comprehensive payroll calculations** with Australian award rates
- **Real-time analytics dashboard** with business insights

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

3. **Initialize Database with Demo Data**
   ```bash
   cd backend
   # Run the database reset script to create clean database with comprehensive demo data
   ./reset.sh
   ```

   ⭐ **This project includes complete sample data for immediate testing:**
   - Pre-configured business and venue data
   - Sample staff members with different roles
   - Demo shift records and payroll data
   - Australian public holidays configuration
   - Ready-to-use authentication accounts

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
   - **🛠️ Master Panel**: `http://localhost:4000/master.html` ⭐ **NEW**
   - **Admin Portal**: `http://localhost:4000/admin.html`
   - **Staff Portal**: `http://localhost:4000/staff.html`
   - **🖥️ Kiosk Interface**: `http://localhost:4000/kiosk.html`
   - **Investor Presentation**: `http://localhost:4000/investors/`

## 🏗️ Project Structure

```
dutydeck/
├── backend/
│   ├── routes/
│   │   ├── master.js       # 🛠️ Master panel API (NEW)
│   │   ├── dashboard.js    # Dashboard statistics API
│   │   └── kiosk.js        # Kiosk clock-in/out API
│   ├── server.js           # Express server & API endpoints
│   ├── authMiddleware.js   # Authentication system
│   ├── db.js              # Database operations
│   ├── schema.sql         # Database structure
│   ├── database.sqlite    # SQLite database (auto-created)
│   ├── package.json       # Backend dependencies
│   └── node_modules/      # Backend packages
├── frontend/
│   ├── css/
│   │   ├── master.css      # 🛠️ Master panel styling (NEW)
│   │   └── kiosk.css       # Kiosk interface styling
│   ├── js/
│   │   ├── master.js       # 🛠️ Master panel logic (NEW)
│   │   └── kiosk.js        # Kiosk functionality
│   ├── index.html         # Login/authentication page
│   ├── admin.html         # Staff management console
│   ├── master.html        # 🛠️ Business & venue bootstrap (NEW)
│   ├── kiosk.html         # Touch-friendly staff kiosk
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

1. **🛠️ Master Panel** (`/master.html`) ⭐ **NEW**
   - **Developer bootstrap interface** for initial system setup
   - **Professional sidebar design** with dark teal theme
   - **Business creation** with comprehensive details
   - **Venue + System Admin setup** in atomic transactions
   - **Live dashboard** with growth statistics and analytics
   - **Kiosk credential management** for each venue

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

### Demo Accounts (Created by reset.sh)

⭐ **Ready-to-use accounts with complete demo data:**

- **System Admin Account**
  - Username: `admin`
  - Password: `admin123`
  - Role: `system_admin`
  - Access: Master Panel, Admin Console

- **Business Manager Account**
  - Username: `manager`
  - Password: `manager123`
  - Role: `business_admin`
  - Access: Admin Console, Staff Management

- **Employee Account**
  - Username: `johndoe`
  - Password: `password123`
  - Role: `employee`
  - Access: Staff Portal, Kiosk

- **Demo Kiosk Credentials**
  - Kiosk Username: `kiosk_main`
  - Kiosk Password: `kiosk123`
  - Location: Main Venue

## 🗄️ Database Schema & Sample Data

The platform uses a normalized SQLite database with the following structure:

- **businesses** - Business information and settings
- **venues** - Venue details linked to businesses
- **staff** - Employee personal information
- **staff_employment** - Job roles and pay rates
- **staff_compliance** - Tax and banking details
- **staff_shifts** - Time tracking and shift records
- **users** - Authentication and access control

### ⭐ Sample Data Included (v2.0.2)
The `reset.sh` script creates a fully populated demo environment:
- **3 Sample businesses** with complete profiles
- **5 Venues** across different locations
- **15+ Staff members** with various roles and pay rates
- **50+ Shift records** showing realistic work patterns
- **Complete payroll data** with award rate calculations
- **Public holiday configurations** for Australian compliance

## 🔧 Configuration

### Environment Setup

The application runs on:
- **Backend**: `http://localhost:4000`
- **Database**: SQLite (file-based, no additional setup required)

### Public Holidays

Australian public holidays are configured in `frontend/public-holidays-config.js`. You can modify this file to add or update holiday dates.

### Database Reset

To reset the database with clean demo data:
```bash
cd backend
./reset.sh
```

This script will:
- Backup the current database
- Delete the old database
- Create fresh schema from `schema.sql`
- Apply triggers from `code_triggers.sql`
- Insert demo data from `seed.sql`

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

### Master Panel API ⭐ **NEW**
- `GET /api/master/stats` - Dashboard statistics with growth indicators
- `GET /api/master/businesses` - List businesses for tables and dropdowns
- `POST /api/master/business` - Create new business with validation
- `GET /api/master/venues` - List venues with business relationships
- `POST /api/master/venue-with-admin` - Atomic venue + system admin creation

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
**Version**: 2.0.2
**Status**: Production Ready with Demo Data

## 🎯 Next Steps After Installation

1. **🛠️ Start with Master Panel** ⭐ **NEW**
   - Open `http://localhost:4000/master.html`
   - Create your business with owner details and location
   - Set up venues with kiosk credentials and system admins
   - Monitor dashboard statistics in real-time

2. **Explore the Platform**
   - Start with the investor presentation (`/investors/`)
   - Use the master panel for initial business setup
   - Login to admin console to see staff management
   - Test the staff portal for clock in/out functionality

3. **Customize for Your Business**
   - Use master panel to create business infrastructure
   - Configure venues and locations with proper credentials
   - Set up staff members and pay rates through admin console

3. **Production Setup**
   - Configure proper authentication
   - Set up backup procedures
   - Implement SSL certificates for security

---

**🚀 You're now ready to run DutyDeck!**

Start the backend server and open `http://localhost:4000` to begin exploring the platform.