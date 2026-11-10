"""Create the first administrator from a trusted local operator shell.

Usage (from backend/): python -m app.create_admin
The password is read interactively and is never placed in shell history.
"""
from __future__ import annotations

import getpass
import re
import uuid

from sqlalchemy import func, select

from .config import get_settings
from .db import SessionLocal, init_db
from .models import User
from .services.auth import hash_password


def main() -> int:
    try:
        email = input("Admin email: ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        print("Setup cancelled.")
        return 2
    if len(email) > 254 or not re.fullmatch(r"[^@\s]+@[^@.\s]+(?:\.[^@.\s]+)+", email):
        print("A valid email address is required.")
        return 2

    try:
        password = getpass.getpass("Admin password (10–128 characters): ")
        confirm = getpass.getpass("Confirm password: ")
    except (EOFError, KeyboardInterrupt):
        print("Setup cancelled.")
        return 2

    if not 10 <= len(password) <= 128:
        print("Password must be 10–128 characters.")
        return 2
    if password != confirm:
        print("Passwords do not match.")
        return 2

    # Initialize a fresh local database before creating the account. This uses
    # exactly the same DATABASE_URL as the backend when run from backend/.
    init_db()
    db = SessionLocal()
    try:
        existing = db.scalars(select(User).where(func.lower(User.email) == email)).first()
        if existing:
            print("That email already has an account. Its password has not been changed.")
            print("For admin access, include its email in ADMIN_EMAILS in backend/.env, restart the backend and sign in.")
            return 1

        is_admin = email in get_settings().admin_email_set
        db.add(User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=hash_password(password),
            is_guest=False,
            is_admin=is_admin,
            display_name="管理员",
        ))
        db.commit()
        print(f"Account created for {email}.")
        if not is_admin:
            print("Before signing in as admin, add this email to ADMIN_EMAILS in backend/.env and restart the backend.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
