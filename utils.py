import datetime
import streamlit as st

def format_currency(amount: float) -> str:
    """Format numeric value into Indian Rupee string format."""
    if amount is None:
        return "₹0"
    if amount < 0:
        return f"-₹{abs(amount):,.2f}" if amount != int(amount) else f"-₹{abs(int(amount)):,}"
    if amount == int(amount):
        return f"₹{int(amount):,}"
    return f"₹{amount:,.2f}"

def get_date_bounds():
    """Return date objects for today, start of current week, start of current month, and last week."""
    today = datetime.date.today()
    start_of_week = today - datetime.timedelta(days=today.weekday())  # Monday
    start_of_month = today.replace(day=1)
    
    start_of_last_week = start_of_week - datetime.timedelta(days=7)
    end_of_last_week = start_of_week - datetime.timedelta(days=1)
    
    return {
        "today": today,
        "start_of_week": start_of_week,
        "start_of_month": start_of_month,
        "start_of_last_week": start_of_last_week,
        "end_of_last_week": end_of_last_week
    }

def get_category_icon(category: str) -> str:
    """Return an appropriate emoji icon for expense categories."""
    icons = {
        "Food": "🍔",
        "Transportation": "🚌",
        "Tickets": "🎟️",
        "Stationery": "📚",
        "Shopping": "🛍️",
        "Education": "🎓",
        "Bills": "💡",
        "Entertainment": "🎮",
        "Health": "🏥",
        "Other": "📦"
    }
    return icons.get(category, "💳")

def get_greeting() -> str:
    """Return a time-of-day greeting string."""
    hour = datetime.datetime.now().hour
    if hour < 12:
        return "Good morning 👋"
    elif hour < 17:
        return "Good afternoon 👋"
    else:
        return "Good evening 👋"

def apply_custom_css():
    """Inject improved Finora CSS: high-contrast branding, better typography, hover states, card elevation."""
    css = """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    /* ─── Global Base ─── */
    html, body, [class*="css"], .stApp {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background-color: #F7F5EF !important;
        color: #202522 !important;
    }

    .main .block-container {
        padding-top: 2rem;
        padding-bottom: 4rem;
        padding-left: 2.5rem;
        padding-right: 2.5rem;
        max-width: 1200px;
    }

    /* ─── Sidebar Background ─── */
    section[data-testid="stSidebar"] {
        background-color: #EFECE3 !important;
        border-right: 1px solid rgba(18, 60, 53, 0.1) !important;
    }

    /* ─── Branding Area ─── */
    .brand-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 4px;
        padding: 4px 0;
    }
    /* Logo tile: deep emerald bg with gold icon — high contrast on cream sidebar */
    .brand-logo {
        width: 44px;
        height: 44px;
        background: #0B2920;
        color: #C7A76A;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        box-shadow: 0 4px 14px rgba(11, 41, 32, 0.22);
        flex-shrink: 0;
    }
    /* Brand name: darkest teal on cream — WCAG AA+ contrast */
    /* Triple-layered override: class, sidebar-scoped, and element targeting */
    .brand-title,
    h1.brand-title,
    section[data-testid="stSidebar"] h1.brand-title,
    section[data-testid="stSidebar"] .brand-header h1.brand-title,
    section[data-testid="stSidebar"] .brand-header .brand-title {
        font-size: 2.05rem !important;
        font-weight: 800 !important;
        letter-spacing: -0.6px !important;
        color: #063B3B !important;
        margin: 0 !important;
        line-height: 1.1 !important;
        -webkit-text-fill-color: #063B3B !important;
    }
    .brand-tagline {
        font-size: 0.9rem;
        color: #4A5450;
        font-weight: 500;
        margin-top: 3px;
        margin-bottom: 26px;
        letter-spacing: 0.1px;
    }

    /* ─── Sidebar Section Labels ─── */
    .sidebar-section-label {
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: 0.9px;
        color: #5C6660;
        font-weight: 700;
        margin-top: 16px;
        margin-bottom: 6px;
    }

    /* ─── Sidebar Nav Buttons ─── */
    /* Override main button styles for sidebar only — transparent bg, text colored */
    section[data-testid="stSidebar"] .stButton > button {
        background-color: transparent !important;
        color: #1C3B34 !important;
        border: 1px solid transparent !important;
        border-radius: 10px !important;
        font-weight: 600 !important;
        font-size: 0.95rem !important;
        padding: 0.55rem 1rem !important;
        box-shadow: none !important;
        transition: background-color 0.18s ease, border-color 0.18s ease, transform 0.18s ease, color 0.18s ease !important;
        text-align: left !important;
    }
    section[data-testid="stSidebar"] .stButton > button:hover {
        background-color: rgba(11, 41, 32, 0.1) !important;
        border-color: rgba(11, 41, 32, 0.18) !important;
        color: #0B2920 !important;
        transform: translateX(3px) !important;
        box-shadow: none !important;
    }
    section[data-testid="stSidebar"] .stButton > button:active {
        background-color: rgba(11, 41, 32, 0.18) !important;
        transform: translateX(1px) !important;
    }

    /* ─── Sidebar Financial Summary Card ─── */
    .sidebar-summary-card {
        background: #FFFDF8;
        border: 1px solid rgba(18, 60, 53, 0.12);
        border-radius: 14px;
        padding: 18px;
        margin-top: 14px;
        margin-bottom: 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
    }
    .sidebar-summary-title {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: #5C6660;
        font-weight: 700;
        margin-bottom: 10px;
    }
    .sidebar-val-group {
        margin-bottom: 10px;
    }
    .sidebar-val-label {
        font-size: 0.82rem;
        color: #5C6660;
        font-weight: 500;
    }
    .sidebar-val-amount {
        font-size: 1.35rem;
        font-weight: 800;
        color: #0B2920;
    }

    /* ─── Hero Balance Card ─── */
    .hero-balance-card {
        background: linear-gradient(140deg, #123C35 0%, #1A4D45 100%);
        border-radius: 20px;
        padding: 34px;
        color: #FFFDF8;
        box-shadow: 0 12px 30px -8px rgba(18, 60, 53, 0.28);
        margin-bottom: 24px;
        position: relative;
        overflow: hidden;
        transition: box-shadow 0.22s ease, transform 0.22s ease;
    }
    .hero-balance-card:hover {
        box-shadow: 0 18px 42px -8px rgba(18, 60, 53, 0.36);
        transform: translateY(-2px);
    }
    .hero-balance-card::after {
        content: "💳";
        position: absolute;
        right: 28px;
        top: 24px;
        font-size: 3.5rem;
        opacity: 0.15;
    }
    .hero-label {
        font-size: 0.95rem;
        text-transform: uppercase;
        letter-spacing: 0.9px;
        color: #8FA99F;
        font-weight: 600;
        margin-bottom: 10px;
    }
    .hero-amount {
        font-size: 3.1rem;
        font-weight: 800;
        letter-spacing: -1.5px;
        color: #FFFDF8;
        margin-bottom: 8px;
    }
    .hero-subtext {
        font-size: 0.92rem;
        color: #C7A76A;
        font-weight: 500;
    }

    /* ─── Secondary Metric Tiles ─── */
    .metric-tile {
        background: #FFFDF8;
        border: 1px solid rgba(18, 60, 53, 0.08);
        border-radius: 18px;
        padding: 24px 26px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .metric-tile:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(18, 60, 53, 0.1);
        border-color: rgba(18, 60, 53, 0.22);
    }
    .metric-tile-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
    }
    .metric-tile-label {
        font-size: 0.88rem;
        font-weight: 600;
        color: #5C6660;
    }
    .metric-tile-icon {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: rgba(18, 60, 53, 0.07);
        color: #123C35;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.05rem;
    }
    .metric-tile-amount {
        font-size: 2rem;
        font-weight: 800;
        color: #0B2920;
        letter-spacing: -0.5px;
    }
    .metric-tile-sub {
        font-size: 0.82rem;
        color: #68716D;
        margin-top: 5px;
        font-weight: 500;
    }

    /* ─── Chart / Content Cards ─── */
    .finora-card {
        background: #FFFDF8;
        border: 1px solid rgba(18, 60, 53, 0.08);
        border-radius: 20px;
        padding: 26px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        margin-bottom: 24px;
        transition: box-shadow 0.22s ease;
    }
    .finora-card:hover {
        box-shadow: 0 10px 28px rgba(18, 60, 53, 0.08);
    }

    /* ─── Insight Cards ─── */
    .insight-card {
        background: #FFFDF8;
        border: 1px solid rgba(18, 60, 53, 0.1);
        border-left: 4px solid #123C35;
        border-radius: 14px;
        padding: 18px 22px;
        margin-bottom: 12px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .insight-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(18, 60, 53, 0.07);
    }
    .insight-text {
        color: #202522;
        font-size: 0.97rem;
        line-height: 1.55;
        font-weight: 500;
    }

    /* ─── Recent Activity Rows ─── */
    .activity-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: #FFFDF8;
        border: 1px solid rgba(18, 60, 53, 0.06);
        border-radius: 16px;
        margin-bottom: 10px;
        transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
    }
    .activity-row:hover {
        transform: translateX(4px);
        background: #F4F0E6;
        box-shadow: 0 4px 14px rgba(18, 60, 53, 0.07);
    }
    .activity-left {
        display: flex;
        align-items: center;
        gap: 16px;
    }
    .activity-icon {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: rgba(18, 60, 53, 0.07);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
    }
    .activity-desc {
        font-weight: 700;
        font-size: 1.05rem;
        color: #1A2520;
    }
    .activity-meta {
        font-size: 0.86rem;
        color: #68716D;
        margin-top: 3px;
    }
    .activity-amount {
        font-weight: 800;
        font-size: 1.18rem;
    }
    .activity-amount.out {
        color: #991B1B;
    }
    .activity-amount.in {
        color: #124B38;
    }

    /* ─── Status Badges ─── */
    .status-badge-pending {
        background: rgba(199, 167, 106, 0.18);
        color: #8A6D3B;
        border: 1px solid rgba(199, 167, 106, 0.4);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 700;
    }
    .status-badge-partial {
        background: rgba(143, 169, 159, 0.2);
        color: #123C35;
        border: 1px solid rgba(18, 60, 53, 0.2);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 700;
    }
    .status-badge-paid {
        background: rgba(18, 75, 56, 0.12);
        color: #124B38;
        border: 1px solid rgba(18, 75, 56, 0.3);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 700;
    }

    /* ─── Buttons — Main Content Area ─── */
    /* Target main content buttons without touching sidebar */
    .main .stButton > button,
    [data-testid="stMainBlockContainer"] .stButton > button {
        background-color: #123C35 !important;
        color: #FFFDF8 !important;
        border-radius: 12px !important;
        font-weight: 600 !important;
        font-size: 0.97rem !important;
        padding: 0.62rem 1.4rem !important;
        border: none !important;
        box-shadow: 0 4px 14px rgba(18, 60, 53, 0.15) !important;
        transition: all 0.2s ease !important;
    }
    .main .stButton > button:hover,
    [data-testid="stMainBlockContainer"] .stButton > button:hover {
        background-color: #1A4D45 !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 22px rgba(18, 60, 53, 0.25) !important;
    }

    /* ─── Form Cards ─── */
    .form-card {
        background: #FFFDF8;
        border: 1px solid rgba(18, 60, 53, 0.1);
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.04);
    }

    /* ─── Empty State ─── */
    .empty-state-box {
        text-align: center;
        padding: 52px 24px;
        background: #FFFDF8;
        border: 2px dashed rgba(18, 60, 53, 0.15);
        border-radius: 20px;
        margin: 24px 0;
    }
    .empty-state-icon {
        font-size: 3.2rem;
        margin-bottom: 14px;
    }
    .empty-state-title {
        font-size: 1.35rem;
        font-weight: 800;
        color: #0B2920;
        margin-bottom: 8px;
    }
    .empty-state-desc {
        font-size: 0.97rem;
        color: #68716D;
        max-width: 420px;
        margin: 0 auto 20px auto;
        line-height: 1.55;
    }

    /* ─── Responsive ─── */
    @media (max-width: 768px) {
        .hero-amount {
            font-size: 2.2rem;
        }
        .main .block-container {
            padding-left: 1.2rem;
            padding-right: 1.2rem;
        }
    }
    </style>
    """
    st.markdown(css, unsafe_allow_html=True)

def render_hero_balance(amount_str: str, subtext: str = "Available in your wallet"):
    """Render large Deep Emerald Hero Balance Card."""
    html = f"""
    <div class="hero-balance-card">
        <div class="hero-label">Available Balance</div>
        <div class="hero-amount">{amount_str}</div>
        <div class="hero-subtext">{subtext}</div>
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)

def render_metric_tile(label: str, amount_str: str, subtext: str = "", icon: str = "💸"):
    """Render a clean light metric card."""
    sub_html = f'<div class="metric-tile-sub">{subtext}</div>' if subtext else ''
    html = f"""
    <div class="metric-tile">
        <div class="metric-tile-header">
            <span class="metric-tile-label">{label}</span>
            <div class="metric-tile-icon">{icon}</div>
        </div>
        <div>
            <div class="metric-tile-amount">{amount_str}</div>
            {sub_html}
        </div>
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)

def format_transaction_type(tx_type: str):
    """Return badge/label for transaction type."""
    mapping = {
        "add_money": ("🟢 Money Added", "activity-amount in"),
        "expense": ("🔴 Expense", "activity-amount out"),
        "money_lent": ("🔴 Money Lent", "activity-amount out"),
        "money_received": ("🟢 Money Received", "activity-amount in"),
        "money_borrowed": ("🟢 Money Borrowed", "activity-amount in"),
        "money_repaid": ("🔴 Loan Repayment", "activity-amount out")
    }
    return mapping.get(tx_type, (tx_type, ""))
