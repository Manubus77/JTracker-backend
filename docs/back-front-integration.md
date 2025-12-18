Frontend–Backend Integration Plan
Step-by-Step Actions
1) Gather backend facts

Identify backend repo URL/branch to use.
Collect deployed base URLs per env (dev/stage/prod): https://<backend-env>/.
Note backend cookie name (default refresh_token), sameSite, secure, domain settings.
Confirm status enum values and pagination caps match frontend assumptions.
2) Set frontend env vars

Copy env.example → .env.
Set VITE_API_BASE_URL=<backend_base_url> (e.g., https://api.dev.example.com).
Optionally set VITE_APP_NAME if a custom display name is needed.
3) Align CORS and cookies on backend

In backend env, set CORS_ORIGINS to include the frontend URL(s) (e.g., https://frontend.dev.example.com and local http://localhost:5173).
Ensure refresh cookie flags: httpOnly=true, sameSite=lax, secure=true in prod; set DOMAIN/cookie domain if backend uses it for subdomain sharing.
4) Verify auth endpoints contract

Test against backend with real calls (Postman/curl):
POST /auth/register with { email, password, name } → returns { user, token } and sets refresh cookie.
POST /auth/login with { email, password } → returns { user, token } and sets refresh cookie.
GET /auth/me with Bearer token → returns user.
POST /auth/refresh with refresh cookie → returns { user, token } and rotates cookie.
POST /auth/logout with Bearer token → returns message and clears cookie.
Confirm access token TTL and refresh rotation behavior match frontend retry logic (one refresh then retry).
5) Configure frontend HTTP behavior

Ensure api/client.js uses credentials: 'include' on refresh and attaches Bearer token for others (already in place).
Keep access token in memory only (no storage changes needed).
6) Applications API alignment

Validate backend supports:
POST /applications { position, company, url, status? } (status defaults to APPLIED).
GET /applications with status, sortBy=date|status, sortOrder=asc|desc, page, pageSize (cap at 100).
PATCH /applications/:id allowing position/company/status (URL immutable).
DELETE /applications/:id.
Confirm status enum: APPLIED, INTERVIEWING, REJECTED, OFFER, ACCEPTED.
7) Local end-to-end smoke (dev)

Run backend locally with matching env (CORS includes http://localhost:5173).
Frontend: npm install (done) then npm run dev with .env pointing to local backend (e.g., http://localhost:3000).
Browser tests:
Register → redirected to Applications.
Login with bad creds shows error; good creds loads list.
Refresh flow: let token expire or force 401; first API call should refresh once and retry; failed refresh logs out.
CRUD: create (URL required), edit (URL disabled), delete (confirm), filters/sort/pagination work; pageSize capped at 100.
Logout clears session and redirects to login; no tokens in storage; refresh cookie present only when expected.
8) Prod/stage readiness

Define per-env matrix in README/Context: frontend URL, backend API URL, CORS_ORIGINS, cookie domain, secure flag, sameSite.
Ensure backend HTTPS and certs in place; update VITE_API_BASE_URL for each env at deploy time.
9) Optional hardening

Add a lightweight health check call to /health on app load to surface connectivity issues.
Add a preflight script or README note to verify .env is set before npm run build.
Variables to Align (frontend ↔ backend)
VITE_API_BASE_URL (frontend) ↔ backend public base URL.
Backend: CORS_ORIGINS includes frontend origins.
Backend: refresh cookie name (REFRESH_TOKEN_COOKIE_NAME if configurable), sameSite, secure, domain as needed.
Backend: token TTLs (JWT_EXPIRES_IN, REFRESH_TOKEN_DAYS)—inform QA for refresh timing.
Status enum and pagination caps (pageSize ≤ 100) consistent on both sides.
Outcome
Frontend points to the backend repo’s deployed endpoints per environment with correct CORS/cookie settings, and passes local browser smoke tests for auth and applications CRUD.