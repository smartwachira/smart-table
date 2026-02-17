# SmartTable 🍽️
> **QR-Driven Real-Time Ordering System for Modern Venues.**

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Node Version](https://img.shields.io/badge/node-v18%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-development-orange)

## 📸 Screenshots

## 🛠️ Tech Stack
This project utilizes a **PERN** stack architecture with real-time capabilities and payment integration.

* **Frontend:** React.js (Vite), Tailwind CSS, Lucide React
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL (Sequelize ORM)
* **Real-Time Engine:** Socket.io (WebSockets)
* **Payments:** Safaricom Daraja API (M-Pesa)

## 🏗️ Architecture
The system follows a **Model-View-Controller (MVC)** design to ensure scalability and code maintainability.

* **REST API** Handles standard CRUD operations for Venues, Menus, and Orders using Express controllers
* **WebSocket Layer**: A dedicated Socket.io layer manages "Rooms" for each venue. This allows instant communication between the **Customer' Phone** and the **Kitchen Tablet** (Dashboard) without page reloads.
* **Database Integrity**: Uses ACID-compliant transactions in PostgreSQL to ensure that complex orders are processed safely (all-or-nothing).

## 🚀 Local Setup & Installation
Follow these steps to get the system running locally for development

### 1. Prerequisites
* Node.js (v18 or higher)
* PostgreSQL installed and running
* Git

### 2. Installation
We have a unified script to install dependencies for both the client and server.

```bash
# Clone the repository
git clone [https://github.com/your-username/smart-table.git](https://github.com/your-username/smart-table.git)

# Enter the directory
cd smart-table

# Install all dependencies (Root, Client, and Server)
npm run install-all