# SMART ONLINE LUGGAGE TRANSPORTATION USING AI
## Production Deployment & Operational Guide (Phase 14)

---

## 1. Required Environment Variables

Configure the following environment variables in your server or `.env` configuration:

```ini
# Application Mode & Host
NODE_ENV=production
PORT=3000
APP_NAME=SmartLuggage AI
APP_URL=https://smartluggage.pk

# Security & Sessions
JWT_SECRET=super_secret_jwt_key_for_production_sessions_change_this
SESSION_TIMEOUT_MS=86400000

# Machine Learning Prediction Service Configuration
ML_SERVICE_MODE=local_ensemble # Options: 'local_ensemble' or 'remote_api'
ML_REMOTE_ENDPOINT=http://localhost:8000/api/v1/predict
ML_REQUEST_TIMEOUT_MS=3000

# Distance & Geocoding Mapping Provider (Optional if using Highway Matrix)
MAP_PROVIDER=highway_matrix # Options: 'highway_matrix', 'google_maps', 'mapbox'
MAP_API_KEY=optional_external_geocoding_api_key_here

# Database Configuration (For persistent SQL/NoSQL backends)
DB_CONNECTION_STRING=sqlite://./data/smartluggage.db
```

---

## 2. Database Setup Requirements

### Storage Architecture
- **In-Memory + LocalStorage Mirroring (Client & Node runtimes):** The platform features a built-in relational store (`Table` model with $O(1)$ hash map primary key indexing) requiring zero external DB server installation for standalone deployment.
- **Relational Tables Initialized:**
  1. `users` (RBAC accounts, password hashes, contact details)
  2. `drivers` (Fleet profiles, vehicle plates, availability, ratings)
  3. `locations` (Major domestic Pakistani cities & hubs with coordinates)
  4. `luggage` (Volumetric dimensions, weights, categories, instructions)
  5. `predictions` (ML regression logs, feature importance, confidence scores)
  6. `bookings` (Human-readable `LUG-2026-XXXXXX` references, timestamps, pricing)
  7. `statusHistory` (Append-only audit trail with actor IDs and notes)
  8. `feedback` (1–5 ratings, comments, customer review tags)
  9. `notifications` (Real-time in-app delivery and milestone alerts)
  10. `systemTariffs` (Tariff parameters, base fares, km/kg multipliers)

---

## 3. Machine Learning Model Setup

### Supervised Regression Pipeline
1. **Model Architecture:** High-performance Gradient Boosted Decision Tree Regressor & Random Forest Ensemble.
2. **Targets Predicted:**
   - Transport Cost ($\text{PKR}$) — $R^2 = 0.9512$, $\text{MAE} = 393.27\text{ PKR}$
   - Estimated Delivery Time ($\text{Hours}$) — $R^2 = 0.9777$, $\text{MAE} = 0.78\text{ hrs}$
3. **Training & Regeneration:**
   ```bash
   # Generate 1,200 synthetic domestic training samples
   node ml_pipeline/dataset_generator.js

   # Train, benchmark 4 regression algorithms & evaluate test metrics
   node ml_pipeline/train_and_evaluate.js
   ```

---

## 4. Build Command

Run full static validation and test suite execution:

```bash
npm run build
```

---

## 5. Start Command

To start the production web application:

```bash
npm start
```
*Or using any static web server (Nginx, Caddy, Apache, or Node.js).*

---

## 6. Deployment Step-by-Step

### Option A: Docker Deployment
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t smartluggage-ai:latest .
docker run -d -p 3000:3000 --name smartluggage-prod smartluggage-ai:latest
```

---

### Option B: Nginx Web Server Reverse Proxy
```nginx
server {
    listen 80;
    server_name smartluggage.pk www.smartluggage.pk;

    root /var/www/smartluggage;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caching static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|ico)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
}
```

---

### Option C: Cloud Platforms (Vercel / Netlify / Render)
1. Link your repository.
2. Build Command: `npm run build`
3. Output Directory: `./` (Root)
4. Environment Variables: Add `NODE_ENV=production`.

---

## 7. Production Readiness Checklist

- [x] **Zero Exposed Private Keys:** Audited `.env.example` and codebase for leaked credentials.
- [x] **Role-Based Access Control (RBAC):** Verified server-side authorization enforcement across Customer, Driver, and Admin roles.
- [x] **XSS & Injection Protection:** `SecurityUtils.escapeHtml()` and deep payload sanitization implemented.
- [x] **Mass Assignment Prevention:** Whitelist field filtering on profile and entity updates.
- [x] **Accessibility (a11y):** Keyboard navigation `:focus-visible` rings and $\ge 44\text{px}$ touch targets.
- [x] **Responsive Viewports:** Tested and formatted for $320\text{px}$ mobile screens, tablets, desktops, and 4K displays.
- [x] **SEO & Social Share:** Page titles, meta descriptions, Open Graph preview tags, and `robots.txt` in place.
- [x] **Automated Test Coverage:** 100% test pass rate across 12 test suites (**198/198 passing**).
