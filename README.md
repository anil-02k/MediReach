# MediReach

MediReach is a full-stack healthcare application built to mangage Medicines. It ensures modern UI design, scalable architecture, and reliable communication features.

---

# Preview

<p align="center">
  <img src="./Screenshot%202025-10-28%20183553.png" alt="MediReach App Screenshot" width="600"/>
</p>

---

## Features

- Secure user authentication (Signup, Login, OTP, Reset Password)  
- Email-based OTP verification  
- Role-based user management (Patients, Doctors, Admins)  
- Modern React Native UI with onboarding flow  
- Scalable modular backend with REST APIs  
- Environment-based configuration and security

---

## Tech Stack

**Frontend:** React Native (Expo)  
**Backend:** Node.js, Express.js  
**Database:** MySQL  
**Tools & Libraries:** Nodemailer, JWT, dotenv

---

## Setup Guide

### 1. Clone the Repository
```
git clone https://github.com/anil-02k/MediReach.git
cd MediReach
```

### 2. Install Dependencies
```
cd client && npm install
cd ../server && npm install
```

### 3. Environment Configuration
Create a `.env` file in the `server/` directory and configure your credentials:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=medireach
JWT_SECRET=your_jwt_secret
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your_app_password
```

### 4. Run the Application
```
# Start frontend (React Native)
 npx expo start -c

# Start backend (Node.js)
cd server
npm run dev
```

---

## Project Structure
```
MediReach/
 ├── client/    # React Native frontend (Expo)
 └── server/    # Node.js backend with Express and MySQL
```

---

## Future Enhancements

- Real-time chat between patients and doctors
- Appointment scheduling system  
- Push notifications for reminders and alerts  
- Integration of telemedicine API  

---
