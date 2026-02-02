# Firebase Authentication - Admin Setup Guide

## Creating an Admin User

Since you've integrated Firebase Authentication, you now need a way to create admin users. Here are your options:

### Option 1: Using MongoDB Compass or CLI (Recommended for First Admin)

1. Open MongoDB Compass or use the MongoDB CLI
2. Connect to your database: `mongodb://localhost:27017/cleancity`
3. Navigate to the `users` collection
4. Find a user by their email and update the `role` field:

```javascript
// MongoDB shell command
db.users.updateOne(
  { email: "youremail@example.com" },
  { $set: { role: "admin" } }
)
```

### Option 2: Using the API Endpoint (For Testing)

I've created a temporary endpoint for promoting users to admin. Use it like this:

```bash
# First, sign up a user through the web app
# Then get their Firebase UID and use this curl command:

curl -X PUT http://localhost:5000/api/users/<FIREBASE_UID>/makeAdmin

# Example with actual UID:
curl -X PUT http://localhost:5000/api/users/abc123xyz456/makeAdmin
```

**To find a user's Firebase UID:**
1. Sign up a user
2. Check MongoDB Compass in the `users` collection
3. Copy the `uid` field

### Option 3: Firebase Console (Most Secure)

For production, you should:
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `clean-city-63aff`
3. Navigate to Authentication > Users
4. Find the user and note their UID
5. Use Option 1 or 2 to promote them

### Verification

After promoting a user to admin:
1. Sign out and sign back in
2. Click "Municipal Admin Login" on the landing page
3. Use your admin account credentials
4. You should now access the Admin Portal

## Important Security Notes

> [!WARNING]
> The `/api/users/:uid/makeAdmin` endpoint should be protected in production. Consider:
> - Adding authentication middleware
> - Requiring an admin API key
> - Removing this endpoint and using Firebase Admin SDK with Custom Claims
> - Or simply removing it after creating your first admin

## Testing Credentials

For testing purposes, you can:

1. **Create a regular user account:**
   - Email: `user@test.com`
   - Password: `password123`
   - This user will have normal citizen access

2. **Create an admin account:**
   - Email: `admin@cleancity.com`
   - Password: `admin123`
   - Then promote to admin using one of the methods above

## Default Behavior

- All newly registered users have `role: "user"` by default
- Admins must be manually promoted
- Admin access is checked when clicking "Municipal Admin Login"
- Regular users attempting admin login will see: "Admin access denied"
