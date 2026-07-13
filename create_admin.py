from authentication.auth import register_user

success = register_user(
    "admin",
    "Admin@123"
)

if success:
    print("Admin user created successfully.")
else:
    print("Admin user already exists.")