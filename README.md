# Rashed Sport Store

Rashed is a football gear e-commerce website with a React storefront, Express API, and SQL-backed catalog/order data. It supports shopping, cart checkout, account flows, admin inventory management, theme switching, and contact/admin messaging.

## Key Features

- Shop catalog with live product cards, category filters, size and color filters, sorting, pagination, and a functional price slider from 0 EGP to 1000+ EGP.
- Product detail pages with images, variants, stock-aware add-to-cart behavior, ratings summary, and related product browsing.
- Cart and checkout flows with quantity controls, customer details, order creation, and order success confirmation.
- Login, registration, password reset screen, persistent authentication option, role-based redirects, and a return-to-home action on auth pages.
- User dashboard/profile areas for authenticated customers.
- Admin dashboard with inventory, orders, messages, and catalog metrics.
- Admin inventory management for adding, editing, and deleting products with simplified fields: name, price, category, description, variants, and uploaded product image.
- Admin product image upload stores base64 images under the backend `/uploads/admin-products` path and saves the returned URL to the product gallery.
- Theme switching with dark and light mode support across storefront surfaces, including the home page brand marquee and trust grid.
- Contact form submission with admin message review and status updates.

## Tech Stack

- Frontend: React, Vite, React Router, Tailwind CSS, Axios
- Backend: Node.js, Express, SQL Server data access
- Styling: Tailwind utility classes plus global theme variables in `frontend/src/index.css`

## Project Structure

```text
backend/   Express API, controllers, routes, middleware, database config
frontend/  React application, pages, components, API clients, styles
uploads/   Runtime image uploads served by the backend
```

## Local Development

Install and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Run the backend from the backend project after configuring the database environment variables required by `backend/src/config/db.js`:

```bash
cd backend
npm install
npm run dev
```

By default, the frontend expects the API on the configured Axios base URL, and the backend allows local Vite origins such as `http://localhost:5173` and `http://localhost:5174`.

## Admin Inventory Notes

Admin product creation and editing now use a simplified catalog form:

- Category choices: Football T-shirts, Football Boots, Football Shorts, Football Balls, Accessories
- Variant fields: Size and Color only
- Variant defaults sent to the API: stock quantity `100`, price modifier `0`
- Image input: drag/drop or file picker upload with preview and remove action

Uploaded images are written to `uploads/admin-products` and served publicly from `/uploads/admin-products/<file>`.
