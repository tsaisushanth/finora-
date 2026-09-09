import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "expenses.db")

DEFAULT_CATEGORIES = [
    "Food",
    "Transportation",
    "Tickets",
    "Stationery",
    "Shopping",
    "Education",
    "Bills",
    "Entertainment",
    "Health",
    "Other"
]

DEFAULT_PAYMENT_METHODS = [
    "Cash",
    "UPI",
    "Bank",
    "Card",
    "Other"
]

MONEY_SOURCES = [
    "Pocket Money",
    "Salary",
    "Parents",
    "Scholarship",
    "Gift",
    "Other"
]

# Goal configuration constants
GOAL_CATEGORIES = [
    "Electronics",
    "Travel",
    "Education",
    "Shopping",
    "Entertainment",
    "Personal",
    "Emergency",
    "Other"
]

GOAL_PRIORITIES = ["High", "Medium", "Low"]

GOAL_STATUSES = ["Active", "Completed", "Paused", "Archived"]

def get_db_connection():
    """Ensure data directory exists and return SQLite connection."""
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables if they do not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Expenses table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            note TEXT,
            expense_date TEXT NOT NULL,
            expense_time TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # 2. Settings table (key-value store for app settings like wallet_balance)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    """)
    
    # 3. Wallet Transactions History Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS wallet_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            transaction_date TEXT NOT NULL,
            source_or_person TEXT,
            note TEXT,
            reference_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # 4. Money Lent Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS money_lent (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person TEXT NOT NULL,
            original_amount REAL NOT NULL,
            remaining_amount REAL NOT NULL,
            start_date TEXT NOT NULL,
            expected_date TEXT,
            note TEXT,
            status TEXT NOT NULL DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # 5. Money Borrowed Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS money_borrowed (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person TEXT NOT NULL,
            original_amount REAL NOT NULL,
            remaining_amount REAL NOT NULL,
            start_date TEXT NOT NULL,
            due_date TEXT,
            note TEXT,
            status TEXT NOT NULL DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # 6. Users Table (for future multi-user support)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # 7. Goals (Bucket List) Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            saved_amount REAL NOT NULL DEFAULT 0,
            category TEXT NOT NULL DEFAULT 'Other',
            priority TEXT NOT NULL DEFAULT 'Medium',
            target_date TEXT,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    
    # 8. Goal Transactions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS goal_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            transaction_type TEXT NOT NULL,  -- 'contribution', 'removal'
            source TEXT,
            note TEXT,
            transaction_date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (goal_id) REFERENCES goals(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    
    # Initialize default wallet_balance if missing
    cursor.execute("SELECT value FROM settings WHERE key = 'wallet_balance'")
    if cursor.fetchone() is None:
        cursor.execute("INSERT INTO settings (key, value) VALUES ('wallet_balance', '0.0')")
    
    # Create default user if no users exist and set as current user
    cursor.execute("SELECT COUNT(*) AS cnt FROM users")
    if cursor.fetchone()["cnt"] == 0:
        cursor.execute("INSERT INTO users (username) VALUES (?)", ("Default User",))
        default_user_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO settings (key, value) VALUES ('current_user_id', ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (str(default_user_id),)
        )
    else:
        cursor.execute("SELECT value FROM settings WHERE key = 'current_user_id'")
        if cursor.fetchone() is None:
            cursor.execute("SELECT id FROM users ORDER BY id LIMIT 1")
            first_user = cursor.fetchone()
            cursor.execute(
                "INSERT INTO settings (key, value) VALUES ('current_user_id', ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (str(first_user["id"]),)
            )
        
    conn.commit()
    conn.close()


# =====================================================================
# USER SYSTEM (for future multi-user support)
# =====================================================================

def get_current_user_id() -> int:
    """Return the ID of the currently active user. Falls back to default user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = 'current_user_id'")
    row = cursor.fetchone()
    if row and row["value"]:
        try:
            uid = int(row["value"])
        except ValueError:
            uid = None
    else:
        uid = None
    
    if uid is None:
        cursor.execute("SELECT id FROM users ORDER BY id LIMIT 1")
        first = cursor.fetchone()
        uid = first["id"] if first else None
        if uid is not None:
            cursor.execute(
                "INSERT INTO settings (key, value) VALUES ('current_user_id', ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (str(uid),)
            )
            conn.commit()
    conn.close()
    return uid if uid is not None else 1

def set_current_user(user_id: int):
    """Switch the active user (for multi-user support)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO settings (key, value) VALUES ('current_user_id', ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (str(user_id),)
    )
    conn.commit()
    conn.close()

def get_wallet_balance() -> float:
    """Retrieve current wallet balance."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = 'wallet_balance'")
    row = cursor.fetchone()
    conn.close()
    if row and row["value"]:
        try:
            return float(row["value"])
        except ValueError:
            return 0.0
    return 0.0

def set_wallet_balance(new_balance: float) -> float:
    """Set an explicit wallet balance."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO settings (key, value) VALUES ('wallet_balance', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (str(round(new_balance, 2)),)
    )
    conn.commit()
    conn.close()
    return round(new_balance, 2)

def adjust_wallet_balance(amount_delta: float) -> float:
    """Adjust wallet balance by adding/subtracting amount_delta."""
    current = get_wallet_balance()
    new_bal = current + amount_delta
    return set_wallet_balance(new_bal)

def add_expense(
    amount: float,
    category: str,
    note: str,
    expense_date: str,
    expense_time: str,
    payment_method: str
) -> int:
    """
    Insert a new expense into SQLite, deduct amount from wallet balance,
    and log an 'expense' entry in wallet_transactions.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO expenses (amount, category, note, expense_date, expense_time, payment_method)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (amount, category, note.strip() if note else "", expense_date, expense_time, payment_method))
    
    expense_id = cursor.lastrowid
    
    # Log transaction in wallet_transactions
    cursor.execute("""
        INSERT INTO wallet_transactions (type, amount, transaction_date, source_or_person, note, reference_id)
        VALUES ('expense', ?, ?, ?, ?, ?)
    """, (amount, expense_date, f"{category} ({payment_method})", note.strip() if note else "", expense_id))
    
    conn.commit()
    conn.close()
    
    # Automatically subtract expense amount from wallet balance
    adjust_wallet_balance(-amount)
    
    return expense_id

def delete_expense(expense_id: int) -> bool:
    """
    Delete an expense, remove its wallet transaction log, and restore amount to wallet.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT amount FROM expenses WHERE id = ?", (expense_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
        
    amount = float(row["amount"])
    cursor.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    cursor.execute("DELETE FROM wallet_transactions WHERE type = 'expense' AND reference_id = ?", (expense_id,))
    
    conn.commit()
    conn.close()
    
    # Refund expense amount back to wallet balance
    adjust_wallet_balance(amount)
    return True

def get_all_expenses() -> List[Dict[str, Any]]:
    """Retrieve all expenses sorted newest first."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, amount, category, note, expense_date, expense_time, payment_method, created_at
        FROM expenses
        ORDER BY expense_date DESC, expense_time DESC, id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_filtered_expenses(
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search_query: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Filter expenses dynamically based on criteria."""
    query = "SELECT id, amount, category, note, expense_date, expense_time, payment_method, created_at FROM expenses WHERE 1=1"
    params: List[Any] = []
    
    if category and category != "All":
        query += " AND category = ?"
        params.append(category)
        
    if payment_method and payment_method != "All":
        query += " AND payment_method = ?"
        params.append(payment_method)
        
    if start_date:
        query += " AND expense_date >= ?"
        params.append(start_date)
        
    if end_date:
        query += " AND expense_date <= ?"
        params.append(end_date)
        
    if search_query and search_query.strip():
        query += " AND (note LIKE ? OR category LIKE ?)"
        params.append(f"%{search_query.strip()}%")
        params.append(f"%{search_query.strip()}%")
        
    query += " ORDER BY expense_date DESC, expense_time DESC, id DESC"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# =====================================================================
# WALLET V2 EXTENDED LOGIC
# =====================================================================

def add_money_transaction(amount: float, source: str, date_str: str, note: str) -> int:
    """Increase wallet balance and record 'add_money' transaction."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO wallet_transactions (type, amount, transaction_date, source_or_person, note)
        VALUES ('add_money', ?, ?, ?, ?)
    """, (amount, date_str, source, note.strip() if note else ""))
    
    tx_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    adjust_wallet_balance(amount)
    return tx_id

def lend_money(person: str, amount: float, date_str: str, expected_date_str: Optional[str], note: str) -> int:
    """
    Record money lent to another person:
    - Available Wallet decreases by amount.
    - Money to Receive increases (new record in money_lent).
    - Logs 'money_lent' transaction.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO money_lent (person, original_amount, remaining_amount, start_date, expected_date, note, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    """, (person.strip(), amount, amount, date_str, expected_date_str if expected_date_str else "", note.strip() if note else ""))
    
    lent_id = cursor.lastrowid
    
    cursor.execute("""
        INSERT INTO wallet_transactions (type, amount, transaction_date, source_or_person, note, reference_id)
        VALUES ('money_lent', ?, ?, ?, ?, ?)
    """, (amount, date_str, person.strip(), note.strip() if note else "", lent_id))
    
    conn.commit()
    conn.close()
    
    # Available wallet decreases
    adjust_wallet_balance(-amount)
    return lent_id

def borrow_money(person: str, amount: float, date_str: str, due_date_str: Optional[str], note: str) -> int:
    """
    Record money borrowed from another person:
    - Available Wallet increases by amount.
    - Money Borrowed increases (new record in money_borrowed).
    - Logs 'money_borrowed' transaction.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO money_borrowed (person, original_amount, remaining_amount, start_date, due_date, note, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    """, (person.strip(), amount, amount, date_str, due_date_str if due_date_str else "", note.strip() if note else ""))
    
    borrow_id = cursor.lastrowid
    
    cursor.execute("""
        INSERT INTO wallet_transactions (type, amount, transaction_date, source_or_person, note, reference_id)
        VALUES ('money_borrowed', ?, ?, ?, ?, ?)
    """, (amount, date_str, person.strip(), note.strip() if note else "", borrow_id))
    
    conn.commit()
    conn.close()
    
    # Available wallet increases
    adjust_wallet_balance(amount)
    return borrow_id

def receive_lent_repayment(lent_id: int, amount_received: float, date_str: str, note: str) -> bool:
    """
    Record repayment received for money lent:
    - Available Wallet increases by amount_received.
    - Money to Receive decreases (remaining_amount on money_lent decreases).
    - Status updated to 'Paid' or 'Partially Paid'.
    - Logs 'money_received' transaction.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT person, remaining_amount FROM money_lent WHERE id = ?", (lent_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
        
    person = row["person"]
    current_rem = float(row["remaining_amount"])
    
    if amount_received <= 0 or amount_received > current_rem:
        conn.close()
        return False
        
    new_rem = current_rem - amount_received
    new_status = "Paid" if new_rem == 0 else "Partially Paid"
    
    cursor.execute("""
        UPDATE money_lent
        SET remaining_amount = ?, status = ?
        WHERE id = ?
    """, (round(new_rem, 2), new_status, lent_id))
    
    cursor.execute("""
        INSERT INTO wallet_transactions (type, amount, transaction_date, source_or_person, note, reference_id)
        VALUES ('money_received', ?, ?, ?, ?, ?)
    """, (amount_received, date_str, person, note.strip() if note else f"Repayment from {person}", lent_id))
    
    conn.commit()
    conn.close()
    
    # Available wallet increases
    adjust_wallet_balance(amount_received)
    return True

def repay_borrowed_loan(borrowed_id: int, amount_repaid: float, date_str: str, note: str) -> bool:
    """
    Record repayment made towards money borrowed:
    - Available Wallet decreases by amount_repaid.
    - Money Borrowed decreases (remaining_amount on money_borrowed decreases).
    - Status updated to 'Paid' or 'Partially Paid'.
    - Logs 'money_repaid' transaction.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT person, remaining_amount FROM money_borrowed WHERE id = ?", (borrowed_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
        
    person = row["person"]
    current_rem = float(row["remaining_amount"])
    
    if amount_repaid <= 0 or amount_repaid > current_rem:
        conn.close()
        return False
        
    new_rem = current_rem - amount_repaid
    new_status = "Paid" if new_rem == 0 else "Partially Paid"
    
    cursor.execute("""
        UPDATE money_borrowed
        SET remaining_amount = ?, status = ?
        WHERE id = ?
    """, (round(new_rem, 2), new_status, borrowed_id))
    
    cursor.execute("""
        INSERT INTO wallet_transactions (type, amount, transaction_date, source_or_person, note, reference_id)
        VALUES ('money_repaid', ?, ?, ?, ?, ?)
    """, (amount_repaid, date_str, person, note.strip() if note else f"Repayment to {person}", borrowed_id))
    
    conn.commit()
    conn.close()
    
    # Available wallet decreases
    adjust_wallet_balance(-amount_repaid)
    return True

def get_wallet_summary() -> Dict[str, float]:
    """Calculate and return 4 core wallet metrics."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Available Wallet
    available_wallet = get_wallet_balance()
    
    # 2. Money to Receive (Sum of remaining_amount from money_lent where status != 'Paid')
    cursor.execute("SELECT SUM(remaining_amount) AS total FROM money_lent WHERE status != 'Paid'")
    row_lent = cursor.fetchone()
    money_to_receive = float(row_lent["total"]) if row_lent and row_lent["total"] is not None else 0.0
    
    # 3. Money Borrowed (Sum of remaining_amount from money_borrowed where status != 'Paid')
    cursor.execute("SELECT SUM(remaining_amount) AS total FROM money_borrowed WHERE status != 'Paid'")
    row_borrowed = cursor.fetchone()
    money_borrowed = float(row_borrowed["total"]) if row_borrowed and row_borrowed["total"] is not None else 0.0
    
    conn.close()
    
    # 4. Net Worth = Available Wallet + Money to Receive - Money Borrowed
    net_worth = available_wallet + money_to_receive - money_borrowed
    
    return {
        "available_wallet": available_wallet,
        "money_to_receive": money_to_receive,
        "money_borrowed": money_borrowed,
        "net_worth": net_worth
    }

def get_active_lent_records() -> List[Dict[str, Any]]:
    """Retrieve all pending or partially paid money_lent records."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, person, original_amount, remaining_amount, start_date, expected_date, note, status, created_at
        FROM money_lent
        WHERE status != 'Paid'
        ORDER BY start_date DESC, id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_active_borrowed_records() -> List[Dict[str, Any]]:
    """Retrieve all pending or partially paid money_borrowed records."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, person, original_amount, remaining_amount, start_date, due_date, note, status, created_at
        FROM money_borrowed
        WHERE status != 'Paid'
        ORDER BY start_date DESC, id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_wallet_transaction_history(
    type_filter: str = "All",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieve unified wallet transaction history with filtering."""
    query = """
        SELECT id, type, amount, transaction_date, source_or_person, note, reference_id, created_at
        FROM wallet_transactions
        WHERE 1=1
    """
    params: List[Any] = []
    
    type_map = {
        "Money Added": "add_money",
        "Expenses": "expense",
        "Lent": "money_lent",
        "Received": "money_received",
        "Borrowed": "money_borrowed",
        "Repaid": "money_repaid"
    }
    
    if type_filter in type_map:
        query += " AND type = ?"
        params.append(type_map[type_filter])
        
    if start_date:
        query += " AND transaction_date >= ?"
        params.append(start_date)
        
    if end_date:
        query += " AND transaction_date <= ?"
        params.append(end_date)
        
    query += " ORDER BY transaction_date DESC, id DESC"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# =====================================================================
# BUCKET LIST (GOALS) LOGIC
# =====================================================================

def create_goal(
    user_id: int,
    name: str,
    target_amount: float,
    category: str = "Other",
    priority: str = "Medium",
    target_date: Optional[str] = None,
    description: str = ""
) -> int:
    """Create a new financial goal for a user. Returns the new goal id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO goals (user_id, name, target_amount, saved_amount, category, priority, target_date, description, status)
        VALUES (?, ?, ?, 0, ?, ?, ?, ?, 'Active')
    """, (
        user_id,
        name.strip(),
        round(target_amount, 2),
        category,
        priority,
        target_date if target_date else None,
        description.strip() if description else ""
    ))
    goal_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return goal_id


def get_user_goals(
    user_id: int,
    status: Optional[str] = None,
    category: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieve all goals belonging to a specific user, newest first."""
    query = "SELECT * FROM goals WHERE user_id = ?"
    params: List[Any] = [user_id]
    
    if status and status != "All":
        query += " AND status = ?"
        params.append(status)
    if category and category != "All":
        query += " AND category = ?"
        params.append(category)
        
    query += " ORDER BY created_at DESC, id DESC"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_goal(goal_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve a single goal by its id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM goals WHERE id = ?", (goal_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_goal(
    goal_id: int,
    name: str,
    target_amount: float,
    category: str,
    priority: str,
    target_date: Optional[str],
    description: str
) -> bool:
    """
    Update a goal's editable fields. If saved_amount now equals or exceeds the new
    target, the goal is automatically marked Completed (rather than creating invalid
    saved > target data).
    """
    goal = get_goal(goal_id)
    if not goal:
        return False
    
    saved = float(goal.get("saved_amount", 0.0))
    status = goal.get("status", "Active")
    
    if target_amount <= 0:
        return False
    
    if saved >= target_amount:
        status = "Completed"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE goals
        SET name = ?, target_amount = ?, category = ?, priority = ?, target_date = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (
        name.strip(),
        round(target_amount, 2),
        category,
        priority,
        target_date if target_date else None,
        description.strip() if description else "",
        status,
        goal_id
    ))
    conn.commit()
    conn.close()
    return True


def delete_goal(goal_id: int, user_id: int) -> Dict[str, Any]:
    """
    Delete a goal and return its saved amount so the caller can restore it to the
    wallet. The saved amount is NOT silently lost — it is returned to the wallet.
    Returns dict with 'saved_amount' and 'name'.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, saved_amount FROM goals WHERE id = ? AND user_id = ?", (goal_id, user_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"saved_amount": 0.0, "name": None}
    
    name = row["name"]
    saved_amount = float(row["saved_amount"])
    
    cursor.execute("DELETE FROM goal_transactions WHERE goal_id = ?", (goal_id,))
    cursor.execute("DELETE FROM goals WHERE id = ?", (goal_id,))
    
    # Also remove the corresponding wallet transactions for this goal's contributions
    cursor.execute(
        "DELETE FROM wallet_transactions WHERE type IN ('goal_allocation', 'goal_removal') AND reference_id = ?",
        (goal_id,)
    )
    
    conn.commit()
    conn.close()
    return {"saved_amount": saved_amount, "name": name}


def _update_goal_saved_amount(goal_id: int, new_saved: float, new_status: str):
    """Internal helper to update a goal's saved_amount and status."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE goals
        SET saved_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (round(new_saved, 2), new_status, goal_id))
    conn.commit()
    conn.close()


def update_goal_status(goal_id: int, new_status: str) -> bool:
    """Set a goal's status directly (e.g. Pause, Resume, Complete, Archive)."""
    valid = {"Active", "Paused", "Completed", "Archived"}
    if new_status not in valid:
        return False
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE goals
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (new_status, goal_id))
    conn.commit()
    conn.close()
    return True


def add_goal_contribution(
    goal_id: int,
    user_id: int,
    amount: float,
    source: str,
    transaction_date: str,
    note: str
) -> bool:
    """
    Add money toward a goal. Deducts from the available wallet balance, increases
    the goal's saved_amount, records a goal_transaction, and logs a wallet transaction.
    Returns True on success, False if invalid (e.g. not enough wallet balance).
    """
    goal = get_goal(goal_id)
    if not goal or int(goal.get("user_id", 0)) != user_id:
        return False
    
    if amount <= 0:
        return False
    
    saved = float(goal.get("saved_amount", 0.0))
    target = float(goal.get("target_amount", 0.0))
    
    available = get_wallet_balance()
    
    # The contribution comes from the wallet, so it must not exceed available balance.
    if available < amount:
        return False
    
    new_saved = saved + amount
    status = goal.get("status", "Active")
    if new_saved >= target:
        new_saved = target  # do not exceed target
        status = "Completed"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Record goal transaction
    cursor.execute("""
        INSERT INTO goal_transactions (goal_id, user_id, amount, transaction_type, source, note, transaction_date)
        VALUES (?, ?, ?, 'contribution', ?, ?, ?)
    """, (goal_id, user_id, round(amount, 2), source, note.strip() if note else "", transaction_date))
    
    # Log wallet transaction (deduct from wallet)
    cursor.execute("""
        INSERT INTO wallet_transactions (type, amount, transaction_date, source_or_person, note, reference_id)
        VALUES ('goal_allocation', ?, ?, ?, ?, ?)
    """, (round(amount, 2), transaction_date, f"Goal: {goal['name']}", note.strip() if note else f"Saved toward {goal['name']}", goal_id))
    
    conn.commit()
    conn.close()
    
    # Update wallet (decrease) and goal saved amount
    adjust_wallet_balance(-amount)
    _update_goal_saved_amount(goal_id, new_saved, status)
    
    return True


def remove_goal_contribution(
    goal_id: int,
    user_id: int,
    transaction_id: int
) -> bool:
    """
    Reverse/remove a single goal contribution. Returns the amount to the wallet,
    decreases the goal's saved_amount, marks the goal as Active if it was Completed
    and now falls below target. Returns True on success.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM goal_transactions WHERE id = ? AND goal_id = ? AND user_id = ? AND transaction_type = 'contribution'",
        (transaction_id, goal_id, user_id)
    )
    tx = cursor.fetchone()
    if not tx:
        conn.close()
        return False
    
    goal = get_goal(goal_id)
    if not goal:
        conn.close()
        return False
    
    amount = float(tx["amount"])
    saved = float(goal.get("saved_amount", 0.0))
    target = float(goal.get("target_amount", 0.0))
    
    new_saved = max(0.0, saved - amount)
    
    # Delete the contribution transaction
    cursor.execute("DELETE FROM goal_transactions WHERE id = ?", (transaction_id,))
    
    # Log a wallet transaction representing the reversal (money returned to wallet)
    cursor.execute("""
        INSERT INTO wallet_transactions (type, amount, transaction_date, source_or_person, note, reference_id)
        VALUES ('goal_removal', ?, ?, ?, ?, ?)
    """, (round(amount, 2), tx["transaction_date"], f"Goal: {goal['name']}", f"Reversed contribution to {goal['name']}", goal_id))
    
    conn.commit()
    conn.close()
    
    # Return money to wallet and update goal
    adjust_wallet_balance(amount)
    status = goal.get("status", "Active")
    if status == "Completed" and new_saved < target:
        status = "Active"
    _update_goal_saved_amount(goal_id, new_saved, status)
    
    return True


def get_goal_transactions(goal_id: int) -> List[Dict[str, Any]]:
    """Retrieve the contribution history for a specific goal, newest first."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, goal_id, user_id, amount, transaction_type, source, note, transaction_date, created_at
        FROM goal_transactions
        WHERE goal_id = ?
        ORDER BY transaction_date DESC, id DESC
    """, (goal_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_total_allocated_to_goals(user_id: int) -> float:
    """Sum of all saved amounts across a user's non-archived goals."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT SUM(saved_amount) AS total FROM goals WHERE user_id = ? AND status != 'Archived'",
        (user_id,)
    )
    row = cursor.fetchone()
    conn.close()
    return float(row["total"]) if row and row["total"] is not None else 0.0
