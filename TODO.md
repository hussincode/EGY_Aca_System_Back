# Backend EGY Sporting Club — Implementation TODO

## Plan phases

### Phase 1 — Project Setup
- [ ] Create backend folder structure (if missing)
- [ ] Add `egy-aca-back/package.json` with ES Modules (`"type":"module"`)
- [x] Install dependencies

- [x] Add `.env.example`

- [x] Implement `server.js` with all middleware + error handling


### Phase 2 — Database Schema
- [ ] Create `database/schema.sql` with the 10 T-SQL CREATE TABLE statements in the required order
- [ ] Create `database/seed.sql` with minimal seed data

### Phase 3 — Auth System
- [x] Implement auth controller + routes
- [x] Implement `protect` and `authorizeRoles` middleware

### Phase 4 — All API Endpoints
- [ ] Implement CRUD controllers/routes for: players, staff, branches, games, subscriptions, attendance, finance, dashboard, ambassadors, users, leads

### Phase 5 — window.api Bridge
- [ ] Create `public/api-bridge.js` that injects `window.api` with fetch calls

### Phase 6 — CORS & Security
- [ ] Enforce CORS origin via env
- [ ] Add rate limiting and express-validator

### Phase 7 — Documentation
- [ ] Create `DOCUMENTATION.md` per requirements


