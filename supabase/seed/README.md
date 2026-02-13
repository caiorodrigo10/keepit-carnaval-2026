# Seed Data

## Test Photographers

To create test photographers for development, follow these steps:

### Step 1: Create Auth Users in Supabase Dashboard

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add user" > "Create new user"
3. Create the following users:

| Email | Password |
|-------|----------|
| fotografo1@keepit.com | Keepit@2026 |
| fotografo2@keepit.com | Keepit@2026 |
| fotografo3@keepit.com | Keepit@2026 |

Make sure to check "Auto Confirm User" to skip email verification.

### Step 2: Link Users to Photographers Table

After creating the auth users, run the SQL in `photographers.sql` via:
- Supabase Dashboard > SQL Editor, or
- The Supabase MCP `execute_sql` tool

The SQL will automatically find the auth users by email and link them to the photographers table.

### Quick Test

After seeding, you can test login at:
- `/fotografo/login`

Use any of the test credentials above.
