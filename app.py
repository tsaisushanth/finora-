import datetime
import streamlit as st
import pandas as pd

from database import (
    init_db,
    add_expense,
    get_all_expenses,
    get_filtered_expenses,
    delete_expense,
    get_wallet_balance,
    set_wallet_balance,
    add_money_transaction,
    lend_money,
    borrow_money,
    receive_lent_repayment,
    repay_borrowed_loan,
    get_wallet_summary,
    get_active_lent_records,
    get_active_borrowed_records,
    get_wallet_transaction_history,
    DEFAULT_CATEGORIES,
    DEFAULT_PAYMENT_METHODS,
    MONEY_SOURCES
)
from utils import (
    apply_custom_css,
    render_hero_balance,
    render_metric_tile,
    format_currency,
    format_transaction_type,
    get_category_icon,
    get_greeting
)
from analytics import (
    prepare_dataframe,
    get_dashboard_metrics,
    create_category_pie_chart,
    create_trend_chart,
    generate_spending_insights
)

# Set Streamlit Page Config for Finora
st.set_page_config(
    page_title="Finora — Know where your money goes",
    page_icon="💳",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Database Schema automatically on launch
init_db()

# Apply Finora Design System & Custom Styling
apply_custom_css()

# Session State Initialization for Navigation
if "nav_choice" not in st.session_state:
    st.session_state.nav_choice = "🏠 Dashboard"

# ----------------------------------------------------
# SIDEBAR REDESIGN & BRANDING
# ----------------------------------------------------
with st.sidebar:
    st.markdown("""
    <div class="brand-header">
        <div class="brand-logo">💳</div>
        <h1 class="brand-title">Finora</h1>
    </div>
    <div class="brand-tagline">Know where your money goes.</div>
    """, unsafe_allow_html=True)
    
    st.markdown('<div class="sidebar-section-label">Overview</div>', unsafe_allow_html=True)
    if st.button("🏠 Dashboard", use_container_width=True):
        st.session_state.nav_choice = "🏠 Dashboard"
        st.rerun()

    st.markdown('<div class="sidebar-section-label">Money</div>', unsafe_allow_html=True)
    if st.button("💳 Wallet", use_container_width=True):
        st.session_state.nav_choice = "💳 Wallet"
        st.rerun()

    st.markdown('<div class="sidebar-section-label">Activity</div>', unsafe_allow_html=True)
    b_col1, b_col2 = st.columns(2)
    with b_col1:
        if st.button("➕ Add Expense", use_container_width=True):
            st.session_state.nav_choice = "➕ Add Expense"
            st.rerun()
    with b_col2:
        if st.button("📋 Expenses", use_container_width=True):
            st.session_state.nav_choice = "📋 Expenses"
            st.rerun()

    st.markdown("---")
    
    # Sidebar Financial Summary Card
    wallet_summary = get_wallet_summary()
    avail_val = wallet_summary["available_wallet"]
    net_val = wallet_summary["net_worth"]
    
    st.markdown(f"""
    <div class="sidebar-summary-card">
        <div class="sidebar-summary-title">Financial Summary</div>
        <div class="sidebar-val-group">
            <div class="sidebar-val-label">Available Balance</div>
            <div class="sidebar-val-amount">{format_currency(avail_val)}</div>
        </div>
        <div class="sidebar-val-group" style="margin-bottom: 0;">
            <div class="sidebar-val-label">Net Worth</div>
            <div class="sidebar-val-amount">{format_currency(net_val)}</div>
        </div>
    </div>
    <div style="font-size: 0.75rem; color: #68716D; text-align: center;">🔒 Encrypted Local SQLite Storage</div>
    """, unsafe_allow_html=True)

nav_choice = st.session_state.nav_choice

# ----------------------------------------------------
# PAGE 1: FINORA DASHBOARD OVERHAUL
# ----------------------------------------------------
if nav_choice == "🏠 Dashboard":
    # 6. Large Page Greeting
    st.markdown(f"<h1 style='font-size: 2.5rem; font-weight: 800; color: #0B2920; margin-bottom: 2px; letter-spacing: -0.5px;'>{get_greeting()}</h1>", unsafe_allow_html=True)
    st.markdown("<p style='color: #5C6660; font-size: 1.1rem; font-weight: 500; margin-bottom: 28px;'>Here's your financial overview</p>", unsafe_allow_html=True)

    raw_expenses = get_all_expenses()
    df = prepare_dataframe(raw_expenses)
    metrics = get_dashboard_metrics(df)
    summary = get_wallet_summary()

    # 7. Hero Balance Card (44px Numbers)
    render_hero_balance(
        amount_str=format_currency(summary["available_wallet"]),
        subtext="Available in your wallet"
    )

    # 8. Secondary Financial Metrics (3 Minimalist Cards)
    m1, m2, m3 = st.columns(3)
    with m1:
        render_metric_tile(
            label="Total Spent",
            amount_str=format_currency(metrics["spent_this_month"]),
            subtext="This Month Total",
            icon="💸"
        )
    with m2:
        render_metric_tile(
            label="To Receive",
            amount_str=format_currency(summary["money_to_receive"]),
            subtext="Owed to you",
            icon="📥"
        )
    with m3:
        render_metric_tile(
            label="Borrowed",
            amount_str=format_currency(summary["money_borrowed"]),
            subtext="Owed by you",
            icon="📤"
        )

    st.write("")
    
    # 9. Quick Actions Tiles
    st.markdown("<h2 style='font-size: 1.45rem; font-weight: 800; color: #0B2920; margin-top: 10px; margin-bottom: 14px; letter-spacing: -0.2px;'>⚡ Quick Actions</h2>", unsafe_allow_html=True)
    q1, q2, q3, q4 = st.columns(4)
    
    with q1:
        if st.button("➕ Add Expense", use_container_width=True):
            st.session_state.nav_choice = "➕ Add Expense"
            st.rerun()
    with q2:
        if st.button("💵 Add Money", use_container_width=True):
            st.session_state.nav_choice = "💳 Wallet"
            st.rerun()
    with q3:
        if st.button("↗️ To Receive", use_container_width=True):
            st.session_state.nav_choice = "💳 Wallet"
            st.rerun()
    with q4:
        if st.button("↙️ Borrowed", use_container_width=True):
            st.session_state.nav_choice = "💳 Wallet"
            st.rerun()

    st.write("")

    if df.empty:
        st.markdown("""
        <div class="empty-state-box">
            <div class="empty-state-icon">💸</div>
            <div class="empty-state-title">No expenses recorded yet</div>
            <div class="empty-state-desc">Start tracking your daily spending to unlock financial analytics and category breakdowns.</div>
        </div>
        """, unsafe_allow_html=True)
        if st.button("➕ Add your first expense"):
            st.session_state.nav_choice = "➕ Add Expense"
            st.rerun()
    else:
        # 10. Analytics Section ("Your spending")
        st.write("")
        col_title, col_toggle = st.columns([3, 1.2])
        with col_title:
            st.markdown("<h2 style='font-size: 1.45rem; font-weight: 800; color: #0B2920; letter-spacing: -0.2px;'>Your spending</h2>", unsafe_allow_html=True)
        with col_toggle:
            period_selection = st.radio(
                "Timeframe",
                ["This Month", "This Week"],
                horizontal=True,
                key="dashboard_period",
                label_visibility="collapsed"
            )

        period_key = "this_week" if period_selection == "This Week" else "this_month"

        chart_col1, chart_col2 = st.columns(2)
        
        with chart_col1:
            st.markdown("<div class='finora-card'>", unsafe_allow_html=True)
            pie_fig = create_category_pie_chart(df, period=period_key)
            if pie_fig:
                st.plotly_chart(pie_fig, use_container_width=True)
            else:
                st.info(f"No category breakdown data for {period_selection.lower()}.")
            st.markdown("</div>", unsafe_allow_html=True)

        with chart_col2:
            st.markdown("<div class='finora-card'>", unsafe_allow_html=True)
            trend_fig = create_trend_chart(df, period=period_key)
            if trend_fig:
                st.plotly_chart(trend_fig, use_container_width=True)
            else:
                st.info(f"No daily spending data for {period_selection.lower()}.")
            st.markdown("</div>", unsafe_allow_html=True)

        # 12. Spending Insights Section
        st.markdown("<h2 style='font-size: 1.45rem; font-weight: 800; color: #0B2920; margin-top: 10px; margin-bottom: 14px; letter-spacing: -0.2px;'>💡 Spending Insights</h2>", unsafe_allow_html=True)
        insights = generate_spending_insights(df)
        if insights:
            for insight in insights:
                st.markdown(f"<div class='insight-card'><div class='insight-text'>{insight}</div></div>", unsafe_allow_html=True)
        else:
            st.markdown("""
            <div class='insight-card'>
                <div class='insight-text'>💡 Add a few expenses to unlock spending insights.</div>
            </div>
            """, unsafe_allow_html=True)

        # 11. Recent Activity Section
        st.markdown("---")
        h_col, btn_col = st.columns([3.2, 1.2])
        with h_col:
            st.markdown("<h2 style='font-size: 1.45rem; font-weight: 800; color: #0B2920; margin-bottom: 16px; letter-spacing: -0.2px;'>Recent activity</h2>", unsafe_allow_html=True)
        with btn_col:
            if st.button("View all expenses →"):
                st.session_state.nav_choice = "📋 Expenses"
                st.rerun()

        recent_expenses = raw_expenses[:5]
        for exp in recent_expenses:
            icon = get_category_icon(exp["category"])
            desc = exp["note"] if exp["note"] else exp["category"]
            meta_str = f"{exp['category']} · {exp['expense_date']}"
            amt_str = f"− {format_currency(exp['amount'])}"
            
            st.markdown(f"""
            <div class="activity-row">
                <div class="activity-left">
                    <div class="activity-icon">{icon}</div>
                    <div>
                        <div class="activity-desc">{desc}</div>
                        <div class="activity-meta">{meta_str} ({exp['payment_method']})</div>
                    </div>
                </div>
                <div class="activity-amount out">{amt_str}</div>
            </div>
            """, unsafe_allow_html=True)

# ----------------------------------------------------
# PAGE 2: ADD EXPENSE REDESIGN
# ----------------------------------------------------
elif nav_choice == "➕ Add Expense":
    st.markdown("<h1 style='font-size: 2.5rem; font-weight: 800; color: #0B2920; margin-bottom: 2px; letter-spacing: -0.5px;'>Add expense</h1>", unsafe_allow_html=True)
    st.markdown("<p style='color: #5C6660; font-size: 1.1rem; font-weight: 500; margin-bottom: 28px;'>Record where your money went.</p>", unsafe_allow_html=True)

    col_space1, col_main_form, col_space2 = st.columns([1, 2.4, 1])
    
    with col_main_form:
        st.markdown("<div class='form-card'>", unsafe_allow_html=True)
        with st.form("add_expense_form", clear_on_submit=True):
            st.markdown("<h3 style='margin-bottom: 20px; color: #123C35; font-weight: 800;'>Expense Details</h3>", unsafe_allow_html=True)
            
            amount_input = st.number_input(
                "Amount (₹) *",
                min_value=0.0,
                step=10.0,
                format="%.2f",
                help="Enter expense amount"
            )
            
            formatted_categories = [f"{get_category_icon(c)} {c}" for c in DEFAULT_CATEGORIES]
            cat_selected_fmt = st.selectbox(
                "Category *",
                formatted_categories,
                index=0
            )
            category_input = cat_selected_fmt.split(" ", 1)[1] if " " in cat_selected_fmt else cat_selected_fmt
            
            payment_input = st.selectbox(
                "Payment Method *",
                DEFAULT_PAYMENT_METHODS,
                index=0
            )
            
            date_input = st.date_input(
                "Date *",
                value=datetime.date.today()
            )
            
            note_input = st.text_input(
                "Note / Description (Optional)",
                placeholder="e.g. Lunch with team, Fuel, Grocery"
            )
            
            st.write("")
            submitted = st.form_submit_button("Add Expense", use_container_width=True)
            
            if submitted:
                if amount_input <= 0:
                    st.error("⚠️ Expense amount must be greater than zero.")
                else:
                    current_time = datetime.datetime.now().strftime("%H:%M:%S")
                    expense_date_str = date_input.strftime("%Y-%m-%d")
                    
                    expense_id = add_expense(
                        amount=float(amount_input),
                        category=category_input,
                        note=note_input,
                        expense_date=expense_date_str,
                        expense_time=current_time,
                        payment_method=payment_input
                    )
                    
                    st.success(f"✅ Saved expense of {format_currency(amount_input)} for {category_input}!")
                    st.balloons()
                    st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

# ----------------------------------------------------
# PAGE 3: EXPENSES REDESIGN (HISTORY & FILTERS)
# ----------------------------------------------------
elif nav_choice == "📋 Expenses":
    st.markdown("<h1 style='font-size: 2.5rem; font-weight: 800; color: #0B2920; margin-bottom: 2px; letter-spacing: -0.5px;'>Expenses</h1>", unsafe_allow_html=True)
    st.markdown("<p style='color: #5C6660; font-size: 1.1rem; font-weight: 500; margin-bottom: 28px;'>Track where your money goes.</p>", unsafe_allow_html=True)

    with st.expander("🔍 Search & Filter Controls", expanded=True):
        f_col1, f_col2, f_col3 = st.columns(3)
        with f_col1:
            cat_opts = ["All"] + [f"{get_category_icon(c)} {c}" for c in DEFAULT_CATEGORIES]
            cat_sel = st.selectbox("Category", cat_opts)
            cat_filter = "All" if cat_sel == "All" else cat_sel.split(" ", 1)[1]
        with f_col2:
            pay_filter = st.selectbox("Payment Method", ["All"] + DEFAULT_PAYMENT_METHODS)
        with f_col3:
            search_query = st.text_input("Search Description / Category", placeholder="Type keywords...")

        d_col1, d_col2 = st.columns(2)
        with d_col1:
            start_d = st.date_input("From Date", value=None)
        with d_col2:
            end_d = st.date_input("To Date", value=None)

    start_d_str = start_d.strftime("%Y-%m-%d") if start_d else None
    end_d_str = end_d.strftime("%Y-%m-%d") if end_d else None

    filtered_list = get_filtered_expenses(
        category=cat_filter,
        payment_method=pay_filter,
        start_date=start_d_str,
        end_date=end_d_str,
        search_query=search_query
    )

    if not filtered_list:
        st.markdown("""
        <div class="empty-state-box">
            <div class="empty-state-icon">🔎</div>
            <div class="empty-state-title">No expenses found</div>
            <div class="empty-state-desc">Try clearing your search query or adjusting your category/date filters.</div>
        </div>
        """, unsafe_allow_html=True)
    else:
        df_display = pd.DataFrame(filtered_list)
        total_filtered_spent = df_display["amount"].sum()
        
        st.markdown(f"<div style='font-size: 1.05rem; color: #202522; margin: 18px 0;'>Showing <strong>{len(filtered_list)}</strong> expenses | Total Spent: <strong style='color: #991B1B;'>{format_currency(total_filtered_spent)}</strong></div>", unsafe_allow_html=True)

        for row in filtered_list:
            c_icon = get_category_icon(row["category"])
            r_col1, r_col2, r_col3, r_col4, r_col5, r_col6 = st.columns([1.5, 1.5, 2.2, 1.8, 3, 1])
            with r_col1:
                st.write(row["expense_date"])
            with r_col2:
                st.caption(row["payment_method"])
            with r_col3:
                st.markdown(f"**{c_icon} {row['category']}**")
            with r_col4:
                st.markdown(f"<span style='color: #991B1B; font-weight: 800; font-size: 1.15rem;'>− {format_currency(row['amount'])}</span>", unsafe_allow_html=True)
            with r_col5:
                st.caption(row["note"] if row["note"] else "-")
            with r_col6:
                if st.button("🗑️", key=f"del_{row['id']}", help="Delete expense and restore wallet balance"):
                    delete_expense(row["id"])
                    st.toast(f"Deleted expense #{row['id']}. Wallet balance restored.")
                    st.rerun()

        st.markdown("---")
        csv_data = df_display.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Export Expenses to CSV",
            data=csv_data,
            file_name="finora_expenses_export.csv",
            mime="text/csv"
        )

# ----------------------------------------------------
# PAGE 4: WALLET PAGE REDESIGN
# ----------------------------------------------------
elif nav_choice == "💳 Wallet":
    st.markdown("<h1 style='font-size: 2.5rem; font-weight: 800; color: #0B2920; margin-bottom: 2px; letter-spacing: -0.5px;'>My Wallet</h1>", unsafe_allow_html=True)
    st.markdown("<p style='color: #5C6660; font-size: 1.1rem; font-weight: 500; margin-bottom: 28px;'>Manage your money in one place.</p>", unsafe_allow_html=True)

    summary = get_wallet_summary()
    render_hero_balance(format_currency(summary["available_wallet"]), subtext="Liquid Cash & Bank Funds")

    # 13. Three Financial Section Metric Tiles
    w1, w2, w3 = st.columns(3)
    with w1:
        render_metric_tile("Add Money", "Wallet Top-up", "Income, allowance, or gifts", icon="💵")
    with w2:
        render_metric_tile("Money to Receive", format_currency(summary["money_to_receive"]), "Track money owed to you", icon="📥")
    with w3:
        render_metric_tile("Money Borrowed", format_currency(summary["money_borrowed"]), "Track money you need to return", icon="📤")

    st.write("")
    st.markdown("<h2 style='font-size: 1.45rem; font-weight: 800; color: #0B2920; margin-bottom: 14px; letter-spacing: -0.2px;'>⚡ Wallet Actions</h2>", unsafe_allow_html=True)

    tab_add, tab_lend, tab_borrow, tab_receive, tab_repay = st.tabs([
        "➕ Add Money",
        "↗️ Lend Money",
        "↙️ Borrow Money",
        "✓ Record Money Received",
        "💳 Repay Borrowed Money"
    ])

    # Action 1: Add Money
    with tab_add:
        st.caption("Increase your wallet balance with income, allowance, or gifts.")
        with st.form("add_money_form", clear_on_submit=True):
            a_col1, a_col2 = st.columns(2)
            with a_col1:
                add_amt = st.number_input("Amount (₹) *", min_value=0.01, step=100.0, format="%.2f", key="add_m_amt")
                add_source = st.selectbox("Source *", MONEY_SOURCES, key="add_m_src")
            with a_col2:
                add_date = st.date_input("Date *", value=datetime.date.today(), key="add_m_date")
                add_note = st.text_input("Note / Description", placeholder="e.g. Monthly stipend, Birthday gift", key="add_m_note")
            
            submit_add = st.form_submit_button("Add Funds to Wallet", use_container_width=True)
            if submit_add:
                if add_amt <= 0:
                    st.error("⚠️ Amount must be greater than zero.")
                else:
                    add_money_transaction(
                        amount=float(add_amt),
                        source=add_source,
                        date_str=add_date.strftime("%Y-%m-%d"),
                        note=add_note
                    )
                    st.success(f"✅ Added {format_currency(add_amt)} from {add_source} to your wallet!")
                    st.rerun()

    # Action 2: Lend Money
    with tab_lend:
        st.caption("Record money given to someone else (Wallet decreases, Money to Receive increases).")
        with st.form("lend_money_form", clear_on_submit=True):
            l_col1, l_col2 = st.columns(2)
            with l_col1:
                lend_person = st.text_input("Person's Name *", placeholder="e.g. Rahul, Priya", key="lend_p")
                lend_amt = st.number_input("Amount (₹) *", min_value=0.01, step=50.0, format="%.2f", key="lend_amt")
            with l_col2:
                lend_date = st.date_input("Date *", value=datetime.date.today(), key="lend_date")
                lend_exp_date = st.date_input("Expected Return Date (Optional)", value=None, key="lend_exp_date")
            lend_note = st.text_input("Note (Optional)", placeholder="e.g. Dinner share, Urgent loan", key="lend_note")
            
            submit_lend = st.form_submit_button("Record Money Lent", use_container_width=True)
            if submit_lend:
                if not lend_person.strip():
                    st.error("⚠️ Please enter the person's name.")
                elif lend_amt <= 0:
                    st.error("⚠️ Amount must be greater than zero.")
                else:
                    exp_d_str = lend_exp_date.strftime("%Y-%m-%d") if lend_exp_date else None
                    lend_money(
                        person=lend_person,
                        amount=float(lend_amt),
                        date_str=lend_date.strftime("%Y-%m-%d"),
                        expected_date_str=exp_d_str,
                        note=lend_note
                    )
                    st.success(f"✅ Recorded {format_currency(lend_amt)} lent to {lend_person}!")
                    st.rerun()

    # Action 3: Borrow Money
    with tab_borrow:
        st.caption("Record money borrowed from someone else (Wallet increases, Money Borrowed increases).")
        with st.form("borrow_money_form", clear_on_submit=True):
            b_col1, b_col2 = st.columns(2)
            with b_col1:
                borrow_person = st.text_input("Person's Name *", placeholder="e.g. Alex, Mom", key="borrow_p")
                borrow_amt = st.number_input("Amount (₹) *", min_value=0.01, step=50.0, format="%.2f", key="borrow_amt")
            with b_col2:
                borrow_date = st.date_input("Date *", value=datetime.date.today(), key="borrow_date")
                borrow_due_date = st.date_input("Due Date (Optional)", value=None, key="borrow_due_date")
            borrow_note = st.text_input("Note (Optional)", placeholder="e.g. Travel emergency, Short term loan", key="borrow_note")
            
            submit_borrow = st.form_submit_button("Record Money Borrowed", use_container_width=True)
            if submit_borrow:
                if not borrow_person.strip():
                    st.error("⚠️ Please enter the person's name.")
                elif borrow_amt <= 0:
                    st.error("⚠️ Amount must be greater than zero.")
                else:
                    due_d_str = borrow_due_date.strftime("%Y-%m-%d") if borrow_due_date else None
                    borrow_money(
                        person=borrow_person,
                        amount=float(borrow_amt),
                        date_str=borrow_date.strftime("%Y-%m-%d"),
                        due_date_str=due_d_str,
                        note=borrow_note
                    )
                    st.success(f"✅ Recorded {format_currency(borrow_amt)} borrowed from {borrow_person}!")
                    st.rerun()

    # Action 4: Record Money Received (Lent Loan Repayment)
    with tab_receive:
        st.caption("Record full or partial repayment received from money you lent.")
        active_lent = get_active_lent_records()
        if not active_lent:
            st.info("No active lent money pending to be received.")
        else:
            lent_options = {f"{r['person']} — Owed: {format_currency(r['remaining_amount'])} (Lent on {r['start_date']})": r for r in active_lent}
            selected_lent_label = st.selectbox("Select Pending Loan Record *", list(lent_options.keys()), key="sel_lent_rec")
            selected_lent = lent_options[selected_lent_label]
            
            with st.form("receive_money_form"):
                r_col1, r_col2 = st.columns(2)
                with r_col1:
                    rec_amt = st.number_input(
                        f"Amount Received (Max: {format_currency(selected_lent['remaining_amount'])}) *",
                        min_value=0.01,
                        max_value=float(selected_lent['remaining_amount']),
                        value=float(selected_lent['remaining_amount']),
                        step=10.0,
                        format="%.2f",
                        key="rec_m_amt"
                    )
                with r_col2:
                    rec_date = st.date_input("Date Received *", value=datetime.date.today(), key="rec_m_date")
                rec_note = st.text_input("Note (Optional)", placeholder="e.g. Partial repayment, Paid in cash", key="rec_m_note")
                
                submit_rec = st.form_submit_button("Record Money Received", use_container_width=True)
                if submit_rec:
                    if rec_amt <= 0 or rec_amt > selected_lent['remaining_amount']:
                        st.error("⚠️ Invalid repayment amount.")
                    else:
                        receive_lent_repayment(
                            lent_id=selected_lent['id'],
                            amount_received=float(rec_amt),
                            date_str=rec_date.strftime("%Y-%m-%d"),
                            note=rec_note
                        )
                        st.success(f"✅ Recorded {format_currency(rec_amt)} received from {selected_lent['person']}!")
                        st.rerun()

    # Action 5: Repay Borrowed Money
    with tab_repay:
        st.caption("Record full or partial repayment made for money you borrowed.")
        active_borrowed = get_active_borrowed_records()
        if not active_borrowed:
            st.info("No active borrowed money pending to be repaid.")
        else:
            borrow_options = {f"{r['person']} — Owed: {format_currency(r['remaining_amount'])} (Borrowed on {r['start_date']})": r for r in active_borrowed}
            selected_borrow_label = st.selectbox("Select Pending Borrowed Record *", list(borrow_options.keys()), key="sel_borr_rec")
            selected_borrow = borrow_options[selected_borrow_label]
            
            with st.form("repay_borrowed_form"):
                rp_col1, rp_col2 = st.columns(2)
                with rp_col1:
                    repay_amt = st.number_input(
                        f"Amount Repaid (Max: {format_currency(selected_borrow['remaining_amount'])}) *",
                        min_value=0.01,
                        max_value=float(selected_borrow['remaining_amount']),
                        value=float(selected_borrow['remaining_amount']),
                        step=10.0,
                        format="%.2f",
                        key="rp_m_amt"
                    )
                with rp_col2:
                    repay_date = st.date_input("Date Repaid *", value=datetime.date.today(), key="rp_m_date")
                repay_note = st.text_input("Note (Optional)", placeholder="e.g. Paid via UPI, Final settlement", key="rp_m_note")
                
                submit_repay = st.form_submit_button("Submit Repayment", use_container_width=True)
                if submit_repay:
                    if repay_amt <= 0 or repay_amt > selected_borrow['remaining_amount']:
                        st.error("⚠️ Invalid repayment amount.")
                    else:
                        repay_borrowed_loan(
                            borrowed_id=selected_borrow['id'],
                            amount_repaid=float(repay_amt),
                            date_str=repay_date.strftime("%Y-%m-%d"),
                            note=repay_note
                        )
                        st.success(f"✅ Recorded {format_currency(repay_amt)} repaid to {selected_borrow['person']}!")
                        st.rerun()

    # Active Loans Management Sections
    st.markdown("---")
    l_col, b_col = st.columns(2)
    
    with l_col:
        st.markdown("<h3 style='font-size: 1.2rem; font-weight: 800; color: #123C35;'>📥 Money I Need to Receive</h3>", unsafe_allow_html=True)
        active_lent_list = get_active_lent_records()
        if not active_lent_list:
            st.caption("No pending money to receive.")
        else:
            for l_rec in active_lent_list:
                status_cls = "status-badge-pending" if l_rec["status"] == "Pending" else "status-badge-partial"
                exp_text = f" | Return: {l_rec['expected_date']}" if l_rec['expected_date'] else ""
                st.markdown(f"""
                <div style="background: #FFFDF8; border: 1px solid rgba(18, 60, 53, 0.1); border-radius: 14px; padding: 16px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: #123C35; font-size: 1rem;">{l_rec['person']}</strong>
                        <span class="{status_cls}">{l_rec['status']}</span>
                    </div>
                    <div style="font-size: 1.3rem; font-weight: 800; color: #124B38; margin: 6px 0;">
                        {format_currency(l_rec['remaining_amount'])} <span style="font-size: 0.85rem; color: #68716D;">/ {format_currency(l_rec['original_amount'])}</span>
                    </div>
                    <div style="font-size: 0.82rem; color: #68716D;">
                        Lent: {l_rec['start_date']}{exp_text}
                    </div>
                </div>
                """, unsafe_allow_html=True)

    with b_col:
        st.markdown("<h3 style='font-size: 1.2rem; font-weight: 800; color: #123C35;'>📤 Money I Need to Repay</h3>", unsafe_allow_html=True)
        active_borrowed_list = get_active_borrowed_records()
        if not active_borrowed_list:
            st.caption("No pending money to repay.")
        else:
            for b_rec in active_borrowed_list:
                status_cls = "status-badge-pending" if b_rec["status"] == "Pending" else "status-badge-partial"
                due_text = f" | Due: {b_rec['due_date']}" if b_rec['due_date'] else ""
                st.markdown(f"""
                <div style="background: #FFFDF8; border: 1px solid rgba(18, 60, 53, 0.1); border-radius: 14px; padding: 16px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: #123C35; font-size: 1rem;">{b_rec['person']}</strong>
                        <span class="{status_cls}">{b_rec['status']}</span>
                    </div>
                    <div style="font-size: 1.3rem; font-weight: 800; color: #991B1B; margin: 6px 0;">
                        {format_currency(b_rec['remaining_amount'])} <span style="font-size: 0.85rem; color: #68716D;">/ {format_currency(b_rec['original_amount'])}</span>
                    </div>
                    <div style="font-size: 0.82rem; color: #68716D;">
                        Borrowed: {b_rec['start_date']}{due_text}
                    </div>
                </div>
                """, unsafe_allow_html=True)

    # Wallet Transaction History Section
    st.markdown("---")
    st.markdown("<h3 style='font-size: 1.2rem; font-weight: 800; color: #123C35; margin-bottom: 14px;'>📜 Wallet Transaction History</h3>", unsafe_allow_html=True)
    
    with st.expander("🔍 Filter History", expanded=False):
        h_col1, h_col2, h_col3 = st.columns(3)
        with h_col1:
            tx_type_filter = st.selectbox(
                "Transaction Type",
                ["All", "Money Added", "Expenses", "Lent", "Received", "Borrowed", "Repaid"]
            )
        with h_col2:
            tx_start_d = st.date_input("From Date ", value=None)
        with h_col3:
            tx_end_d = st.date_input("To Date ", value=None)

    tx_start_str = tx_start_d.strftime("%Y-%m-%d") if tx_start_d else None
    tx_end_str = tx_end_d.strftime("%Y-%m-%d") if tx_end_d else None

    tx_history = get_wallet_transaction_history(
        type_filter=tx_type_filter,
        start_date=tx_start_str,
        end_date=tx_end_str
    )

    if not tx_history:
        st.info("No transaction history recorded yet.")
    else:
        for tx in tx_history:
            label, css_class = format_transaction_type(tx["type"])
            t_col1, t_col2, t_col3, t_col4, t_col5 = st.columns([1.5, 2, 2, 1.8, 3])
            with t_col1:
                st.write(tx["transaction_date"])
            with t_col2:
                st.markdown(f"**{label}**")
            with t_col3:
                st.write(tx["source_or_person"] if tx["source_or_person"] else "-")
            with t_col4:
                st.markdown(f"<span class='{css_class}'>{format_currency(tx['amount'])}</span>", unsafe_allow_html=True)
            with t_col5:
                st.caption(tx["note"] if tx["note"] else "-")

    # Starting Balance Adjustment Expander
    st.markdown("---")
    with st.expander("⚙️ Adjust Starting Wallet Balance (Override)", expanded=False):
        st.caption("Use this form to set or recalibrate your liquid wallet balance directly.")
        current_bal = get_wallet_balance()
        with st.form("override_wallet_form"):
            new_bal_override = st.number_input(
                "Wallet Balance (₹)",
                value=float(current_bal),
                step=100.0,
                format="%.2f"
            )
            submit_override = st.form_submit_button("Update Balance")
            if submit_override:
                set_wallet_balance(new_bal_override)
                st.success(f"✅ Wallet balance adjusted to {format_currency(new_bal_override)}!")
                st.rerun()
