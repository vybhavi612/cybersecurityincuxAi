import sqlite3
import hashlib
import os

DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "database",
    "traffic.db"
)


def get_connection():
    return sqlite3.connect(DB_PATH)


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def register_user(username, password):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        cursor.execute(
            """
            INSERT INTO users
            (
                username,
                password
            )

            VALUES
            (
                ?,?
            )
            """,
            (
                username,
                hash_password(password)
            )
        )

        conn.commit()

        return True

    except sqlite3.IntegrityError:

        return False

    finally:

        conn.close()


def login_user(username, password):

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            id,
            username
        FROM users

        WHERE username=?
        AND password=?
        """,
        (
            username,
            hash_password(password)
        )
    )

    user = cursor.fetchone()

    conn.close()

    return user


def user_exists(username):

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id
        FROM users

        WHERE username=?
        """,
        (
            username,
        )
    )

    user = cursor.fetchone()

    conn.close()

    return user is not None


def total_users():

    conn = get_connection()

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT COUNT(*)
        FROM users
        """
    )

    total = cursor.fetchone()[0]

    conn.close()

    return total