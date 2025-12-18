# Frontend Context Pack (React MVP)

## Backend API Contract
- Base URL: set via `API_BASE_URL` (HTTPS on Render).
- Auth
  - `POST /auth/register` `{ email, password, name }` → `201 { user, token, refreshToken (cookie) }`
  - `POST /auth/login` `{ email, password }` → `200 { user, token, refreshToken (cookie) }`
  - `GET /auth/me` (Bearer access token) → `200 user`
  - `POST /auth/logout` (Bearer access token; clears refresh cookie if present) → `200 { message }`
  - `POST /auth/refresh` (needs refresh cookie) → `200 { user, token }` (sets new refresh cookie)
- Applications (Bearer access token required)
  - `POST /applications` `{ position, company, url, status? }` → `201 application` (status defaults to `APPLIED`)
  - `GET /applications?status=&sortBy=date|status&sortOrder=asc|desc&page=1&pageSize=20` → `200 { items, page, pageSize, total, totalPages }`
  - `PATCH /applications/:id` `{ position?, company?, status? }` → `200 application` (URL immutable)
  - `DELETE /applications/:id` → `204`
- Status enum: `APPLIED`, `INTERVIEWING`, `REJECTED`, `OFFER`, `ACCEPTED`
- Defaults: sort by recency (appliedAt desc), status filter optional.

## Auth/Token Behavior
- Access token: JWT, short-lived (`JWT_EXPIRES_IN`, e.g., 3600s), stored in memory on frontend.
- Refresh token: httpOnly cookie (`refresh_token` by default), rotated on `/auth/refresh`. On 401 from an API call, attempt one refresh then retry; if refresh fails, logout.
- Logout: blacklists access token, revokes provided refresh token (if cookie set), clears cookie.
- Do not store tokens in localStorage; keep access token in memory, rely on refresh cookie.

## CORS & Cookies
- Backend expects `CORS_ORIGINS` to include the frontend origin. Use `credentials: 'include'` for refresh calls (refresh cookie).
- HTTPS in production; cookies are `httpOnly`, `sameSite=lax`, `secure` in production.

## Validation Rules (mirror in frontend)
- Register: email required/valid; password 8–15 chars, 1 capital, 1 symbol; name non-empty (trimmed).
- Login: email/password required.
- Applications: position/company trimmed non-empty; url required valid URL; status in enum; pagination page/pageSize capped (pageSize ≤ 100).

## Frontend MVP Scope (React)
- Routing: public login/register; protected applications page.
- State: auth store (user, access token, refresh flow), queries for applications (cache by filters/pagination).
- Applications UI: list with pagination, status filter, sort date/status; add form (status default APPLIED), edit position/company/status (URL read-only), delete with confirm; empty/loading/error states.
- Error handling: show validation/API errors; retry once after refresh on 401.
- Env for frontend: `VITE_API_BASE_URL` (or equivalent), optionally `VITE_APP_NAME`, feature flags.

## Backend Env Vars (for reference)
- Required:
  - `NODE_ENV=production`
  - `DATABASE_URL`
  - `JWT_SECRET` (>=32 chars)
  - `BCRYPT_SALT_ROUNDS` (10–12)
  - `JWT_EXPIRES_IN` (e.g., 3600)
  - `REFRESH_TOKEN_DAYS` (e.g., 30)
  - `REFRESH_TOKEN_COOKIE_NAME` (default `refresh_token`)
  - `CORS_ORIGINS` (comma-separated, include frontend URL)
- Rate limits (recommended defaults):
  - `RATE_LIMIT_WINDOW_MS=900000`
  - `RATE_LIMIT_MAX_GENERAL=100`
  - `RATE_LIMIT_MAX_LOGIN=5`
  - `RATE_LIMIT_MAX_REGISTER=3`
  - `RATE_LIMIT_MAX_LOGOUT=10`
  - `RATE_LIMIT_MAX_APP_READ=200`
  - `RATE_LIMIT_MAX_APP_WRITE=50`
  - `RATE_LIMIT_MAX_REFRESH=20`

## Health Checks
- `/health` and `/health/db` available.
- DB migrations applied (Prisma) including `RevokedToken` and `RefreshToken` tables; `ApplicationStatus` includes OFFER/ACCEPTED.

## Quick Frontend Workflow
1) Configure `.env` with API base URL; ensure CORS origin matches frontend URL.  
2) Implement API client with access token in memory + refresh interceptor (uses cookie).  
3) Build auth pages (register/login), call `/auth/me` on load if token exists.  
4) Build applications page (list/filter/sort/paginate/add/edit/delete).  
5) Add logout and refresh flows globally; handle 401 with one refresh retry.  
6) Smoke test against backend: register/login/me/logout/refresh, applications CRUD, CORS/cookie behavior.

