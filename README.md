# PrintHub: Online Printing Shop Management System

PrintHub is a beginner-friendly full-stack web application for accepting online print requests and managing a small printing shop. It uses React, Tailwind CSS, Node.js, Express, MySQL, JWT authentication, bcrypt, and Multer.

## Included working features

- Customer registration and secure login
- Administrator/customer role-based pages and redirects
- Responsive collapsible sidebar and light/dark theme
- Administrator and customer dashboard data from MySQL
- Three-step online print order form with document/proof upload
- Automatic price estimate and order preview
- Order list, search, details, and administrator status updates
- Inventory listing, new-item form, and stock movement recording
- Automatic low-stock/out-of-stock status
- In-app notifications and mark-as-read
- Profile editing and profile-picture upload
- Protected private-file download API
- Database tables for customers, services, orders, payments, expenses, inventory, notifications, settings, and logs

Some sidebar modules are prepared as extension screens and their complete database tables are included. The most important end-to-end workflows—accounts, print orders, uploads, status handling, inventory, notifications, and profiles—are implemented.

## Requirements

- Node.js 18 or later
- MySQL 8 or later (XAMPP/WAMP MySQL is okay)
- npm

## 1. Import the database

### phpMyAdmin (XAMPP or WAMP)

1. Start **Apache** and **MySQL**.
2. Open `http://localhost/phpmyadmin`.
3. Choose **Import**.
4. Select `database/printhub.sql`.
5. Click **Import** or **Go**.

The SQL script creates the `printhub` database, tables, relationships, sample users, services, inventory, and shop settings.

## 2. Configure the backend

Open a terminal inside the `PrintHub` folder:

```bash
copy .env.example server\.env
```

On macOS/Linux, use `cp .env.example server/.env`.

Edit `server/.env` when your MySQL username or password is different. Never place secrets in the React frontend.

## 3. Install packages

```bash
npm install
npm run install:all
```

## 4. Run PrintHub

```bash
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:5000`.

## Default accounts

| Role | Login | Password |
| --- | --- | --- |
| Administrator | `admin` | `Password123!` |
| Sample customer | `maria` | `Password123!` |

Change the administrator password before real use.

## Price formula

The estimate uses the print color rate plus paper surcharge, multiplied by pages and copies. Binding, finishing, rush, and delivery fees are then added. The current starter values are easy to find in `client/src/pages/NewOrder.jsx`. For a production shop, move these values into the `service_prices` table and calculate again on the server before confirming the final price.

## Folder structure

```text
PrintHub/
├── client/             React + Vite + Tailwind frontend
├── server/             Express REST API
├── database/           MySQL schema and sample records
├── uploads/            Protected uploaded files
├── .env.example
└── README.md
```

## Security notes

- Passwords are bcrypt hashes.
- Private routes require a JWT.
- Administrator endpoints verify the role on the server.
- SQL values use prepared queries.
- Uploaded filenames are randomized and dangerous extensions are rejected.
- Uploaded documents are not exposed as a public static folder.
- In production, use HTTPS, a strong JWT secret, database backups, malware scanning, rate limiting, and an email provider for password resets.

## Build the frontend

```bash
npm run build
```

The optimized frontend will be generated in `client/dist`.
