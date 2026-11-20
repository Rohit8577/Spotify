# 🎵 Music Streaming Web & Mobile App

A full-stack SangeetX-style music streaming application with authentication,
user-specific playlists, and **personalized music recommendations**
based on user interaction history.

This project is built with a **scalable backend** that supports both
**web and mobile clients**.

For the Render Firebase startup repair and the verified Expo 1.1.1 release, see
[deployment settings](DEPLOYMENT.md) and [mobile delivery](mobile/DELIVERY.md).
The backend uses email/JWT authentication and does not need Firebase Admin keys.

---

## 📸 Screenshots

### 🌐 Web App
<p align="center">
  <img src="Screenshots/home.png" width="800"/>
  <br/><br/>
  <img src="Screenshots/login.png" width="800"/>
  <br/><br/>
  <img src="Screenshots/playlist.png" width="800"/>
</p>

### 📱 Mobile App
<p align="center">
  <img src="Screenshots/mobile.jpg" width="300"/>
</p>

---

## 🚀 Features

- 🔐 User Authentication (JWT based)
- 🎶 Stream and browse songs
- 🎧 Play YouTube audio inside the Expo player, including pasted YouTube links
- 📂 Create & manage playlists
- ❤️ Track user interactions (likes, plays, skips)
- 🧠 Personal music recommendations based on recent user activity
- 📱 Mobile-friendly & Android app support
- 🌐 REST APIs reusable across platforms

---

## 🛠 Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication

### Frontend (Web)
- EJS / HTML / CSS / JavaScript

### Mobile App
- React Native / Expo SDK 58 (Android, iOS, web)

Android OTA updates, GitHub Actions, media notifications and push setup:
[Mobile delivery guide](mobile/DELIVERY.md).

---

## 🧩 Recommendation Logic

- User interactions are logged (play, like, skip, artist preference)
- Only the **latest 50 interactions** are stored to optimize performance
- Recommendations are generated dynamically based on recent behavior
- This avoids heavy ML models while still providing personalization

---

## 📱 Mobile Version

The mobile application consumes the same backend APIs used by the web app,
ensuring consistency across platforms.

---

## 📂 Project Structure
backend/
 ├── routes
 ├── models
 ├── middleware

frontend/
 ├── views
 ├── public

mobile/
 ├── src/app            # Expo Router screens
 ├── src/context        # Session and native audio player


## 🌍 Live Demo

- 🚀 **Deployed Version**  
  http://sangeetx.online

> The application is deployed on both **AWS EC2** and **Render** to demonstrate
real-world deployment, scalability, and environment handling.




---

## ⚙️ Installation & Setup

```bash
git clone https://github.com/Rohit8577/SangeetX.git
cd sangeetX
npm install
npm run setup:youtube
npm run dev
``` 

YouTube playback requires Python 3, Node.js 22+, and the backend extractor installed
by `npm run setup:youtube`. Configure `YOUTUBE_API_KEY` for YouTube search. See
[backend deployment](DEPLOYMENT.md) and [mobile setup](mobile/README.md).

For the Expo playback test results, bug fixes and device testing limits, see
[the testing report](reports/expo-testing-2026-11-19/REPORT.md).

---

## 👨‍💻 Author

**Rohit Bind**  
🎓 Computer Science Engineering Student  
💻 Full Stack Web Developer  

**Skills & Tools:**  
- JavaScript, Node.js, Express.js  
- MongoDB, JWT Authentication  
- HTML, CSS, EJS  
- Flutter (Android)  
- Git & GitHub  

**Projects:**  
- SangeetX-style Music Streaming Web & Mobile App  
- Public Distribution System (PDS) Management System  

📫 **GitHub:** https://github.com/Rohit8577

> This project was built to understand real-world backend architecture,
API design, authentication, deployment, and personalization systems.
