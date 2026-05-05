# Elite Maintenance Backend

This project adds a local Node.js backend and SQLite database for the booking form in `contact.html`.

## Setup

1. Open a terminal in `leon.rough`.
2. Run `npm install`.
3. Start the server with `npm start`.
4. Open `http://localhost:3000/contact.html` in your browser.
5. Go to `http://localhost:3000/login.html` and sign in.
   - Default username: `admin`
   - Default password: `Elite@123`
6. View submissions at `http://localhost:3000/admin.html` after login.

## Notes

- The server stores booking submissions in `bookings.db`.
- The page `admin.html` fetches booking records from `/api/bookings`.
- This is a simple local backend for development and testing.
