# 🎵 Music Streaming Web & Mobile App

A full-stack Spotify-style music streaming application with authentication,
user-specific playlists, and **personalized music recommendations**
based on user interaction history.

This project is built with a **scalable backend** that supports both
**web and mobile clients**.

---

## 🚀 Features

- 🔐 User Authentication (JWT based)
- 🎶 Stream and browse songs
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
- Flutter (Android)

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

