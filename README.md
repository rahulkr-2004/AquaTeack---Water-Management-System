# AquaTrack 💧 - Water Management System

AquaTrack is a full-stack water billing and management application. It provides a modern web interface to track water usage, manage billing reports, and handle system alerts efficiently.

## 🚀 Tech Stack

*   **Frontend:** React, Vite, Tailwind CSS, Recharts, Lucide React
*   **Backend:** Java, Spring Boot, Spring Security (JWT), RESTful APIs, JDBC
*   **Database:** MySQL 8.0 (Flyway for migrations)
*   **Infrastructure:** Docker & Docker Compose

## 🛠️ Getting Started

### Prerequisites

*   [Docker](https://www.docker.com/get-started) and Docker Compose installed on your machine.
*   (Optional) Node.js and Maven if you wish to run services locally outside of Docker.

### Installation & Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/rahulkr-2004/AquaTeack---Water-Management-System.git
    cd AquaTeack---Water-Management-System
    ```

2.  Start the application using Docker Compose:
    ```bash
    docker-compose up --build
    ```
    *This will spin up the MySQL database, the Spring Boot backend, and the React frontend.*

3.  Access the application:
    *   **Frontend UI:** [http://localhost:5173](http://localhost:5173)
    *   **Backend API:** [http://localhost:8080](http://localhost:8080)
    *   **Database:** `localhost:3306`

## 📂 Project Structure

*   `/frontend` - React application built with Vite containing the user interface, routing, and data visualization.
*   `/water` - Spring Boot application containing the core business logic, JWT security, and API endpoints.
*   `docker-compose.yml` - Configuration for containerizing the database, backend, and frontend.

## 🔑 Key Features

*   **User Authentication:** Secure JWT-based authentication and role management.
*   **Billing & Usage Tracking:** Monitor water usage logs and manage automated billing cycles.
*   **Household & Apartment Management:** Track water consumption at the household and apartment level.
*   **Tariff Management:** Maintain and apply dynamic tariff plans for billing.
*   **Alerting System:** Automated system alerts for usage anomalies or important billing events.
