"""Grant the first administrator from an operator-controlled shell.

Usage (from backend/): python -m app.bootstrap_admin person@example.org
This intentionally requires an existing registered account and never exposes an
HTTP endpoint that could be claimed by an unverified email address.
"""
from __future__ import annotations

import sys

from sqlalchemy import func, select

from .db import SessionLocal
from .models import User


def main() -> int:
    if len(sys.argv) != 2 or "@" not in sys.argv[1]:
        print("Usage: python -m app.bootstrap_admin <registered-email>", file=sys.stderr)
        return 2
    email = sys.argv[1].strip().lower()
    db = SessionLocal()
    try:
        user = db.execute(select(User).where(func.lower(User.email) == email)).scalar_one_or_none()
        if not user:
            print("No registered account found for that email.", file=sys.stderr)
            return 1
        user.is_admin = True
        db.commit()
        print(f"Administrator role granted to {user.email}.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
