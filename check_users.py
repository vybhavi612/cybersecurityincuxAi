import sqlite3

conn = sqlite3.connect("database/traffic.db")

cursor = conn.cursor()

cursor.execute("SELECT id, username FROM users")

users = cursor.fetchall()

print(users)

conn.close()