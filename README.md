# 🎓 GradeMate

### Student Academic Portal

GradeMate is a free student academic web application designed to make academic calculations simple and easy.

It helps students calculate and track:

- 📊 SGPA
- 📈 CGPA
- 📉 Percentage
- 📚 Semester-wise Results
- 👤 Student Profile

## 🚀 Live Demo

https://grade-mate-sand.vercel.app/

## ✨ Features

### 🔐 Authentication
- Student Registration
- Student Login
- Secure authentication using Supabase
- Student-specific data

### 🧮 SGPA Calculator
- Add multiple subjects
- Enter subject credits
- Select subject type
- Select grades
- Supports Regular, NPTEL and Non-Credit subjects
- Automatic SGPA calculation
- Save semester results
- Edit saved results
- Delete saved results

### 📊 CGPA Calculator
- Automatically calculates overall CGPA
- Uses saved semester results
- Displays total semesters
- Displays total credits

### 📈 Percentage Calculator
- Converts CGPA into percentage
- Displays the calculated percentage

### 📋 My Results
- View all saved semester results
- View subject details
- Edit semester results
- Update semester results
- Delete semester results

### 👤 Student Profile
- Registration ID
- Full Name
- Course
- Branch
- Pass-out Year
- College
- Profile data is saved securely

### 📱 Responsive Design
- Desktop support
- Mobile support
- Responsive dashboard
- Mobile-friendly calculators and result pages

## 🛠️ Technologies Used

- React.js
- Vite
- JavaScript
- HTML5
- CSS3
- Supabase
- PostgreSQL
- Git
- GitHub
- Vercel

## 📁 Project Structure

```text
GradeMate/
│
├── public/
│
├── src/
│   ├── App.jsx
│   ├── App.css
│   ├── supabaseClient.js
│   └── main.jsx
│
├── .gitignore
├── index.html
├── package.json
└── README.md