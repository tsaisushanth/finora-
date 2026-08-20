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
    
    # Initialize default wallet_balance if missing
    cursor.execute("SELECT value FROM settings WHERE key = 'wallet_balance'")
    if cursor.fetchone() is None:
        cursor.execute("INSERT INTO settings (key, value) VALUES ('wallet_balance', '0.0')")
        
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
