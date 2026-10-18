"""Create the first administrator from a trusted local operator shell.

Usage (from backend/): python -m app.create_admin
The password is read interactively and is never placed in shell history.
"""
from __future__ import annotations

import getpass
import uuid

from pydantic import ValidationError
from sqlalchemy import func, select

from .db import SessionLocal, init_db
from .models import User
from .routers.auth import EmailCredentials
from .services.auth import hash_password


def main() -> int:
    try:
        email = EmailCredentials(email=input("Admin email: ").strip()).email
    except (ValidationError, EOFError, KeyboardInterrupt):
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
        existing = db.execute(
            select(User).where(func.lower(User.email) == email)
        ).scalar_one_or_none()
        if existing:
            print("That email already has an account. Use bootstrap_admin to grant its role.")
            return 1

        db.add(User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=hash_password(password),
            is_guest=False,
            is_admin=True,
            display_name="管理员",
        ))
        db.commit()
        print(f"Administrator account created for {email}.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
