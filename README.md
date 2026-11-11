# 孔子平台 / Kongzi Platform

## Fresh install (Windows)

The source archive does **not** contain a database or a shared login. Create your own admin account before signing in:

1. In PowerShell, prepare the backend:

   ```powershell
   cd backend
   py -m venv .venv
   .\.venv\Scripts\python -m pip install -r requirements.txt
   Copy-Item .env.example .env
   ```

2. Edit `backend/.env` and set a unique `JWT_SECRET` with at least 32 characters.
3. From the `backend` directory, run `.\.venv\Scripts\python -m app.create_admin`. Enter the email and password you want to use. Passwords must contain 10–128 characters; input is hidden and is not saved in shell history.
4. Add the email printed by the setup command to `ADMIN_EMAILS` in `backend/.env`. Keep existing addresses, separated by commas. Start the backend from `backend` (restart it if it was already running):

   ```powershell
   .\.venv\Scripts\python -m uvicorn app.main:app --port 8000
   ```

5. In another terminal, start the frontend:

   ```powershell
   cd frontend
   npm ci
   npm run dev
   ```

6. Open [the admin login](http://localhost:3000/login?next=/admin) and sign in with the lowercase email printed in step 3 and your password.

Run the admin setup and backend from the same `backend` directory so they use the same `.env` and database. If your account already exists, skip account creation, add your address to `ADMIN_EMAILS`, restart the backend, and sign in with your existing credentials. The backend checks this list at each login.

For API and deployment details, see [backend/README.md](backend/README.md). The admin setup utility and credentials do not create a public registration endpoint or a shared default password.
