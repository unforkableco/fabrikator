# Account Seeding Guide

This project currently relies on manually created accounts so that testers can log in without a self-service signup flow. Follow the steps below to create or update accounts in the database.

## 1. Prerequisites

- PostgreSQL is running and reachable via the `DATABASE_URL` in `backend/.env`.
- All Prisma migrations are applied:

```bash
cd backend
npx prisma migrate deploy
```

## 2. Create or Update Accounts

Use the helper script from the `backend` directory to insert accounts with hashed passwords and default quotas:

```bash
cd backend
npm run create:account -- \
  --email=user@example.com \
  --password=StrongPass123 \
  --credits=6 \
  --maxProjects=6 \
  --role=user \
  --status=active
```

Script flags:

| Flag | Required | Description |
| ---- | -------- | ----------- |
| `--email` | ✅ | Unique login email. Lowercase is enforced. |
| `--password` | ✅ | Plaintext password; the script hashes it before storage. |
| `--credits` | optional | Initial credit balance (default `6`). |
| `--maxProjects` | optional | Maximum simultaneous projects (default `6`). |
| `--role` | optional | Role label, defaults to `user`. |
| `--status` | optional | Account status (`active`, `disabled`, etc.). |

Running the script with an email that already exists will abort without changing the existing account. To rotate a password, delete the existing row in the `Account` table or add a dedicated update script.

## 3. Verify Access

After seeding, you can confirm the account works by logging in via the frontend or calling the login endpoint directly:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"StrongPass123"}'
```

A successful response returns a JWT token and the account summary (credits, quota, etc.).

---
Keep this document up to date whenever the account creation flow changes (e.g., new flags, default values, or additional verification steps).
