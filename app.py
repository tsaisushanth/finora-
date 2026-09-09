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
    adjust_wallet_balance,
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
    MONEY_SOURCES,
    get_current_user_id,
    get_total_allocated_to_goals,
    create_goal,
    get_user_goals,
    get_goal,
    update_goal,
    update_goal_status,
    delete_goal,
    add_goal_contribution,
    remove_goal_contribution,
    get_goal_transactions,
    GOAL_CATEGORIES,
    GOAL_PRIORITIES
)
from utils import (
    apply_custom_css,
    render_hero_balance,
    render_metric_tile,
    format_currency,
    format_transaction_type,
    get_category_icon,
    get_greeting,
    get_goal_category_icon
)
from analytics import (
    prepare_dataframe,
    get_dashboard_metrics,
    create_category_pie_chart,
    create_trend_chart,
    generate_spending_insights
)
from goals import (
    calculate_goal_progress,
    calculate_remaining_amount,
    get_goal_summary,
    generate_goal_insights,
    render_goal_card,
    render_goal_summary,
    render_progress_bar
)

# Set Streamlit Page Config for Finora
st.set_page_config(
    page_title="Finora",
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

# Bucket List session state keys
if "show_create_goal" not in st.session_state:
    st.session_state.show_create_goal = False
if "goal_contrib_id" not in st.session_state:
    st.session_state.goal_contrib_id = None
if "goal_form_mode" not in st.session_state:
    st.session_state.goal_form_mode = None
if "goal_edit_id" not in st.session_state:
    st.session_state.goal_edit_id = None
if "goal_delete_id" not in st.session_state:
    st.session_state.goal_delete_id = None

# ----------------------------------------------------
# SIDEBAR REDESIGN & BRANDING
# ----------------------------------------------------
with st.sidebar:
    st.markdown("""
    <div class="brand-header">
        <div class="brand-logo">💳</div>
        <h1 class="brand-title" style="color: #063B3B !important;">Finora</h1>
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

    st.markdown('<div class="sidebar-section-label">Goals</div>', unsafe_allow_html=True)
    if st.button("🎯 Bucket List", use_container_width=True):
        st.session_state.nav_choice = "🎯 Bucket List"
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
    allocated_val = get_total_allocated_to_goals(get_current_user_id())
    
    st.markdown(f"""
    <div class="sidebar-summary-card">
        <div class="sidebar-summary-title">Financial Summary</div>
        <div class="sidebar-val-group">
            <div class="sidebar-val-label">Available Balance</div>
            <div class="sidebar-val-amount">{format_currency(avail_val)}</div>
        </div>
        <div class="sidebar-val-group">
            <div class="sidebar-val-label">🎯 Allocated for Goals</div>
            <div class="sidebar-val-amount" style="font-size: 1.15rem;">{format_currency(allocated_val)}</div>
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

    # --- Your Goals Section on Dashboard (always visible) ---
    user_id_dash = get_current_user_id()
    dash_goals = get_user_goals(user_id_dash, status="Active")
    if dash_goals:
        st.markdown("---")
        g_h_col, g_btn_col = st.columns([3.2, 1.2])
        with g_h_col:
            st.markdown("<h2 style='font-size: 1.45rem; font-weight: 800; color: #0B2920; margin-bottom: 14px; letter-spacing: -0.2px;'>🎯 Your Goals</h2>", unsafe_allow_html=True)
        with g_btn_col:
            if st.button("View All Goals →", use_container_width=True):
                st.session_state.nav_choice = "🎯 Bucket List"
                st.rerun()
        for g in dash_goals[:3]:
            g_icon = get_goal_category_icon(g["category"])
            g_prog = calculate_goal_progress(g)
            row_c, nav_c = st.columns([5, 1])
            with row_c:
                st.markdown(f"""
                <div class="activity-row" style="cursor: default;">
                    <div class="activity-left">
                        <div class="activity-icon" style="font-size:1.2rem;">{g_icon}</div>
                        <div>
                            <div class="activity-desc">{g['name']}</div>
                            <div class="activity-meta">{g['category']} · {format_currency(g['saved_amount'])} / {format_currency(g['target_amount'])}</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:800; color:#0B2920; font-size:1.15rem;">{g_prog:.0f}%</div>
                        <div style="width:80px; height:8px; background:rgba(18,60,53,0.1); border-radius:20px; overflow:hidden; margin-top:4px;">
                            <div style="width:{g_prog}%; height:100%; background:linear-gradient(90deg, #2C5E55 0%, #123C35 100%); border-radius:20px;"></div>
                        </div>
                    </div>
                </div>""", unsafe_allow_html=True)
            with nav_c:
                if st.button("View", key=f"dash_goal_{g['id']}", use_container_width=True):
                    st.session_state.nav_choice = "🎯 Bucket List"
                    st.rerun()

    # --- Savings Goals Analytics (integrated into dashboard analytics) ---
    all_dash_goals = get_user_goals(user_id_dash)
    if all_dash_goals:
        active_count = sum(1 for g in all_dash_goals if g["status"] == "Active")
        completed_count = sum(1 for g in all_dash_goals if g["status"] == "Completed")
        total_saved_goals = sum(float(g["saved_amount"] or 0.0) for g in all_dash_goals if g["status"] != "Archived")
        total_target_goals = sum(float(g["target_amount"] or 0.0) for g in all_dash_goals if g["status"] != "Archived")
        completion_rate = (completed_count / max(1, len(all_dash_goals))) * 100
        goal_share = (total_saved_goals / (summary["available_wallet"] + total_saved_goals) * 100) if (summary["available_wallet"] + total_saved_goals) > 0 else 0.0

        st.markdown("---")
        st.markdown("<h2 style='font-size: 1.45rem; font-weight: 800; color: #0B2920; margin-top: 10px; margin-bottom: 14px; letter-spacing: -0.2px;'>📚 Savings Goals</h2>", unsafe_allow_html=True)
        gs1, gs2, gs3, gs4 = st.columns(4)
        with gs1:
            render_metric_tile("Total Saved", format_currency(total_saved_goals), "Toward goals", icon="🐷")
        with gs2:
            render_metric_tile("Completion Rate", f"{completion_rate:.0f}%", f"{completed_count} completed", icon="🏆")
        with gs3:
            render_metric_tile("Active Goals", f"{active_count}", f"{len(all_dash_goals)} total goals", icon="🎯")
        with gs4:
            render_metric_tile("Saved vs Wallet", f"{goal_share:.0f}%", "Of savings in goals", icon="💼")

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
# PAGE 5: BUCKET LIST (GOALS)
# ----------------------------------------------------
elif nav_choice == "🎯 Bucket List":
    user_id = get_current_user_id()
    goals = get_user_goals(user_id)
    available_bal = get_wallet_balance()
    allocated_bal = get_total_allocated_to_goals(user_id)
    summary = get_goal_summary(goals)

    # ---------------- Page Hero ----------------
    st.markdown(f"""
    <div class="goal-hero">
        <div class="goal-hero-title">🎯 Bucket List</div>
        <div class="goal-hero-sub">Turn the things you want into achievable financial goals.</div>
        <div class="goal-hero-chip-row">
            <span class="goal-hero-chip">💰 Wallet available: <b>{format_currency(available_bal)}</b></span>
            <span class="goal-hero-chip">🎯 Allocated to goals: <b>{format_currency(allocated_bal)}</b></span>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ---------------- Empty State ----------------
    if not goals:
        st.markdown("""
        <div class="empty-state-box">
            <div class="empty-state-icon">🎯</div>
            <div class="empty-state-title">Start Building Your Bucket List</div>
            <div class="empty-state-desc">Turn your dreams into goals and track your progress. Create a goal, then save money toward it over time.</div>
        </div>
        """, unsafe_allow_html=True)
        if st.button("✦ Create Your First Goal", use_container_width=True, type="primary"):
            st.session_state.show_create_goal = True
            st.rerun()
    else:
        # ---------------- Summary Stats ----------------
        st.markdown(render_goal_summary(summary), unsafe_allow_html=True)

        # Top priority + closest goal
        c1, c2 = st.columns(2)
        with c1:
            if summary["top_priority"]:
                tp = summary["top_priority"]
                priority_icon = {"High": "🔥", "Medium": "⭐", "Low": "🍃"}.get(tp["priority"], "⭐")
                st.markdown(f"""
                <div class="goal-summary-card">
                    <div class="goal-summary-label">{priority_icon} Top Priority Goal</div>
                    <div class="goal-card-name">{get_goal_category_icon(tp['category'])} {tp['name']}</div>
                    <div class="goal-summary-value">{calculate_goal_progress(tp):.0f}%</div>
                    <div class="goal-summary-sub">{format_currency(tp['saved_amount'])} / {format_currency(tp['target_amount'])}</div>
                </div>""", unsafe_allow_html=True)
        with c2:
            if summary["closest_goal"]:
                cg = summary["closest_goal"]
                st.markdown(f"""
                <div class="goal-summary-card">
                    <div class="goal-summary-label">🏁 Closest to Completion</div>
                    <div class="goal-card-name">{get_goal_category_icon(cg['category'])} {cg['name']}</div>
                    <div class="goal-summary-value">{calculate_goal_progress(cg):.0f}%</div>
                    <div class="goal-summary-sub">{format_currency(calculate_remaining_amount(cg))} to go</div>
                </div>""", unsafe_allow_html=True)
                c2_pbar = render_progress_bar(calculate_goal_progress(cg), show_caption=False)
                st.markdown(c2_pbar, unsafe_allow_html=True)

        st.write("")

        # ---------------- Toolbar: heading + create button ----------------
        tool_l, tool_r = st.columns([3, 1.4])
        with tool_l:
            st.markdown("<h2 style='font-size: 1.45rem; font-weight: 800; color: #14201B; margin-top: 8px; letter-spacing: -0.2px;'>My Goals</h2>", unsafe_allow_html=True)
        with tool_r:
            if st.button("✦ Create New Goal", use_container_width=True, type="primary"):
                st.session_state.show_create_goal = True
                st.rerun()

        # ---------------- Filters + Sort ----------------
        f_c1, f_c2, f_c3, f_c4 = st.columns(4)
        with f_c1:
            status_filter = st.selectbox("Status", ["All", "Active", "Paused", "Completed", "Archived"], key="goal_status_filter")
        with f_c2:
            cat_opts_g = ["All"] + [f"{get_goal_category_icon(c)} {c}" for c in GOAL_CATEGORIES]
            cat_g = st.selectbox("Category", cat_opts_g, key="goal_cat_filter")
            cat_filter_g = "All" if cat_g == "All" else cat_g.split(" ", 1)[1]
        with f_c3:
            prio_filter = st.selectbox("Priority", ["All"] + GOAL_PRIORITIES, key="goal_prio_filter")
        with f_c4:
            sort_choice = st.selectbox(
                "Sort by",
                ["Recently created", "Highest priority", "Closest to completion", "Target date"],
                key="goal_sort"
            )

        _prio_rank = {"High": 3, "Medium": 2, "Low": 1}
        if sort_choice == "Highest priority":
            goals = sorted(goals, key=lambda g: _prio_rank.get(g.get("priority"), 0), reverse=True)
        elif sort_choice == "Closest to completion":
            goals = sorted(goals, key=lambda g: calculate_goal_progress(g), reverse=True)
        elif sort_choice == "Target date":
            goals = sorted(goals, key=lambda g: (0 if (g.get("target_date") or "") else 1, g.get("target_date") or ""))
        else:
            goals = sorted(goals, key=lambda g: (g.get("created_at") or ""), reverse=True)

        filtered_goals = [
            g for g in goals
            if (status_filter == "All" or g["status"] == status_filter)
            and (cat_filter_g == "All" or g["category"] == cat_filter_g)
            and (prio_filter == "All" or g["priority"] == prio_filter)
        ]

        # ---------------- Goal Cards Grid ----------------
        if not filtered_goals:
            st.markdown("""
            <div class="empty-state-box">
                <div class="empty-state-icon">🔎</div>
                <div class="empty-state-title">No goals match your filters</div>
                <div class="empty-state-desc">Try adjusting the status, category, or priority filter.</div>
            </div>""", unsafe_allow_html=True)
        else:
            st.markdown(
                "<div style='font-size: 0.95rem; color: #42504A; margin-bottom: 12px;'>"
                f"Showing <b style='color:#14201B;'>{len(filtered_goals)}</b> goal{'s' if len(filtered_goals) != 1 else ''}"
                "</div>",
                unsafe_allow_html=True
            )
            cols = st.columns(2)
            for idx, goal in enumerate(filtered_goals):
                col = cols[idx % 2]
                with col:
                    st.markdown(render_goal_card(goal), unsafe_allow_html=True)
                    st.caption("Goal allocation moves money from your available wallet.")

                    # Actions
                    status_g = goal["status"]

                    act1, act2 = st.columns(2)
                    with act1:
                        if status_g in ("Active", "Paused"):
                            if st.button("➕ Add Money", key=f"gm_{goal['id']}", use_container_width=True, type="primary"):
                                st.session_state.goal_contrib_id = goal["id"]
                                st.session_state.goal_form_mode = "contribute"
                                st.rerun()
                        else:
                            st.markdown(f"<div style='font-size: 0.9rem; color: #825500; background:#FFF7E0; border:1px solid #FFE6A1; border-radius:8px; padding:7px 10px; text-align:center; font-weight:700;'>{get_goal_category_icon(goal['category'])} Kept in history</div>", unsafe_allow_html=True)
                    with act2:
                        if st.button("✏️ Edit", key=f"ge_{goal['id']}", use_container_width=True):
                            st.session_state.goal_edit_id = goal["id"]
                            st.rerun()

                    act3, act4 = st.columns(2)
                    with act3:
                        if status_g == "Active":
                            if st.button("⏸️ Pause", key=f"gpu_{goal['id']}", use_container_width=True):
                                update_goal_status(goal["id"], "Paused")
                                st.rerun()
                        elif status_g == "Paused":
                            if st.button("▶️ Resume", key=f"gpu_{goal['id']}", use_container_width=True):
                                update_goal_status(goal["id"], "Active")
                                st.rerun()
                        elif status_g == "Completed":
                            if st.button("📦 Archive", key=f"ga_{goal['id']}", use_container_width=True):
                                update_goal_status(goal["id"], "Archived")
                                st.rerun()
                        else:
                            st.markdown(f"<div style='font-size:0.95rem; color:#0F6F42; font-weight:800; background:#EDF8F1; border:1px solid #A9D6BE; border-radius:8px; padding:7px 10px; text-align:center;'>✓ Done</div>", unsafe_allow_html=True)
                    with act4:
                        if status_g in ("Active", "Paused"):
                            if st.button("🏁 Mark Completed", key=f"gc_{goal['id']}", use_container_width=True):
                                update_goal_status(goal["id"], "Completed")
                                st.success(f"🎉 Goal '{goal['name']}' marked as completed!")
                                st.balloons()
                                st.rerun()
                        else:
                            if st.button("🗑️ Delete", key=f"gd_{goal['id']}", use_container_width=True):
                                st.session_state.goal_delete_id = goal["id"]
                                st.rerun()

                    # Goal contribution history (collapsible)
                    with st.expander(f"📜 History — {goal['name']}"):
                        tx_list = get_goal_transactions(goal["id"])
                        total_saved = sum(float(t["amount"]) for t in tx_list)
                        if not tx_list:
                            st.caption("No contributions yet.")
                        else:
                            st.markdown(f"**Total Saved: {format_currency(total_saved)}**")
                            for tx in tx_list:
                                h1, h2, h3, h4 = st.columns([1.6, 1.6, 2.4, 0.8])
                                with h1:
                                    st.write(tx["transaction_date"])
                                with h2:
                                    st.markdown(f"<span style='color:#0F6F42; font-weight:800;'>+ {format_currency(tx['amount'])}</span>", unsafe_allow_html=True)
                                with h3:
                                    st.caption(tx["note"] if tx["note"] else (tx["source"] or "-"))
                                with h4:
                                    if st.button("↩️", key=f"rx_{tx['id']}", help="Reverse this contribution"):
                                        if remove_goal_contribution(goal["id"], user_id, tx["id"]):
                                            st.toast(f"Reversed {format_currency(tx['amount'])}. Wallet balance restored.")
                                            st.rerun()
                                        else:
                                            st.error("Could not reverse this contribution.")

                    st.markdown("---")
        st.write("")

    # ---------------- Create Goal Modal/Form ----------------
    if st.session_state.get("show_create_goal", False):
        st.markdown("<div class='form-card'>", unsafe_allow_html=True)
        st.markdown("<h3 style='margin-bottom: 16px; color: #123C35; font-weight: 800;'>✦ Create a New Goal</h3>", unsafe_allow_html=True)
        with st.form("create_goal_form", clear_on_submit=True):
            g_col1, g_col2 = st.columns(2)
            with g_col1:
                goal_name = st.text_input("Goal Name *", placeholder="e.g. New Phone, Trip to Goa")
                goal_target = st.number_input("Target Amount (₹) *", min_value=0.0, step=500.0, format="%.2f")
                cat_opts_new = [f"{get_goal_category_icon(c)} {c}" for c in GOAL_CATEGORIES]
                cat_fmt = st.selectbox("Category *", cat_opts_new)
                goal_category = cat_fmt.split(" ", 1)[1]
            with g_col2:
                goal_priority = st.selectbox("Priority *", GOAL_PRIORITIES, index=1)
                goal_date = st.date_input("Target Date (Optional)", value=None)
                goal_desc = st.text_area("Description / Notes (Optional)", placeholder="Why this goal matters...", height=90)
            goal_date_str = goal_date.strftime("%Y-%m-%d") if goal_date else None

            b1, b2 = st.columns(2)
            with b1:
                submitted = st.form_submit_button("✦ Create Goal", use_container_width=True, type="primary")
            with b2:
                cancelled = st.form_submit_button("✖ Cancel", use_container_width=True)
                if cancelled:
                    st.session_state.show_create_goal = False
                    st.rerun()

            if submitted:
                if not goal_name.strip():
                    st.error("⚠️ Goal name cannot be empty.")
                elif goal_target <= 0:
                    st.error("⚠️ Target amount must be greater than ₹0.")
                else:
                    create_goal(
                        user_id=user_id,
                        name=goal_name,
                        target_amount=float(goal_target),
                        category=goal_category,
                        priority=goal_priority,
                        target_date=goal_date_str,
                        description=goal_desc
                    )
                    st.success("🎯 Goal created! Now start saving toward it.")
                    st.session_state.show_create_goal = False
                    st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

    # ---------------- Contribute Money Modal/Form ----------------
    if st.session_state.get("goal_form_mode") == "contribute" and st.session_state.get("goal_contrib_id"):
        contrib_goal = get_goal(st.session_state["goal_contrib_id"])
        if contrib_goal:
            st.markdown("<div class='form-card'>", unsafe_allow_html=True)
            st.markdown(f"<h3 style='margin-bottom: 12px; color: #123C35; font-weight: 800;'>➕ Add Money to <span style='color:#14201B;'>{contrib_goal['name']}</span></h3>", unsafe_allow_html=True)

            # Current progress preview
            curr_progress = calculate_goal_progress(contrib_goal)
            st.markdown(f"""
            <div style="background:#F4F6F4; border:1px solid #E4E9E6; border-radius:12px; padding:14px 16px; margin-bottom:16px;">
                <div style="font-size:0.85rem; color:#42504A; margin-bottom:6px;"><b style="color:#14201B;">Current Progress</b></div>
                <div style="font-size:1.35rem; font-weight:800; color:#14201B; margin-bottom:8px;">
                    {format_currency(contrib_goal['saved_amount'])} <span style="font-size:0.95rem; color:#56635D;">/ {format_currency(contrib_goal['target_amount'])}</span>
                </div>
                {render_progress_bar(curr_progress)}
            </div>
            """, unsafe_allow_html=True)

            st.markdown(f"<p style='color:#42504A; font-weight:600;'>Wallet available: <span style='color:#0C6353; font-weight:800;'>{format_currency(available_bal)}</span></p>", unsafe_allow_html=True)
            with st.form("contribute_goal_form"):
                cg_col1, cg_col2 = st.columns(2)
                with cg_col1:
                    contrib_amt = st.number_input("Amount (₹) *", min_value=0.0, step=100.0, format="%.2f")
                with cg_col2:
                    contrib_date = st.date_input("Date *", value=datetime.date.today())
                source_sel = st.selectbox("Source / Wallet *", ["Wallet"] + MONEY_SOURCES)
                contrib_note = st.text_input("Note (Optional)", placeholder="e.g. Saved from this month's allowance")
                max_contrib = float(contrib_goal["target_amount"]) - float(contrib_goal["saved_amount"])

                cb1, cb2 = st.columns(2)
                with cb1:
                    submitted_contrib = st.form_submit_button("➜ Add Money to Goal", use_container_width=True, type="primary")
                with cb2:
                    cancelled_contrib = st.form_submit_button("✖ Cancel", use_container_width=True)
                    if cancelled_contrib:
                        st.session_state.goal_form_mode = None
                        st.session_state.goal_contrib_id = None
                        st.rerun()

                if submitted_contrib:
                    if contrib_amt <= 0:
                        st.error("⚠️ Contribution amount must be greater than ₹0.")
                    elif contrib_amt > available_bal:
                        st.error(f"⚠️ Contribution cannot exceed your available wallet balance ({format_currency(available_bal)}).")
                    elif max_contrib > 0 and contrib_amt > max_contrib:
                        st.error(f"⚠️ This would exceed the goal target. Remaining to reach target: {format_currency(max_contrib)}.")
                    else:
                        ok = add_goal_contribution(
                            goal_id=contrib_goal["id"],
                            user_id=user_id,
                            amount=float(contrib_amt),
                            source=source_sel,
                            transaction_date=contrib_date.strftime("%Y-%m-%d"),
                            note=contrib_note
                        )
                        if ok:
                            updated_saved = float(contrib_goal["saved_amount"]) + contrib_amt
                            reached = updated_saved >= float(contrib_goal["target_amount"])
                            new_progress = min(100.0, (updated_saved / float(contrib_goal["target_amount"])) * 100)
                            st.success(f"✅ Added {format_currency(contrib_amt)} to '{contrib_goal['name']}'! Updated progress: {new_progress:.0f}%")
                            if reached:
                                st.balloons()
                                st.markdown("<div class='goal-completed-flag'>✓ 🎉 Goal Completed — You reached your goal!</div>", unsafe_allow_html=True)
                            st.session_state.goal_form_mode = None
                            st.session_state.goal_contrib_id = None
                            st.rerun()
                        else:
                            st.error("⚠️ Could not add money. Please check your wallet balance.")
            st.markdown("</div>", unsafe_allow_html=True)

    # ---------------- Edit Goal Modal/Form ----------------
    if st.session_state.get("goal_edit_id"):
        edit_goal = get_goal(st.session_state["goal_edit_id"])
        if edit_goal:
            st.markdown("<div class='form-card'>", unsafe_allow_html=True)
            st.markdown(f"<h3 style='margin-bottom: 12px; color: #123C35; font-weight: 800;'>✏️ Edit Goal — <span style='color:#14201B;'>{edit_goal['name']}</span></h3>", unsafe_allow_html=True)
            st.markdown(f"<p style='color:#42504A; font-weight:600;'>Currently saved: <b style='color:#14201B;'>{format_currency(edit_goal['saved_amount'])}</b>. If you lower the target below your saved amount, the goal auto-completes.</p>", unsafe_allow_html=True)
            with st.form("edit_goal_form"):
                e_col1, e_col2 = st.columns(2)
                with e_col1:
                    e_name = st.text_input("Goal Name *", value=edit_goal["name"])
                    e_target = st.number_input("Target Amount (₹) *", min_value=0.0, value=float(edit_goal["target_amount"]), step=500.0, format="%.2f")
                    cat_opts_e = [f"{get_goal_category_icon(c)} {c}" for c in GOAL_CATEGORIES]
                    e_cat_fmt = st.selectbox("Category *", cat_opts_e, index=GOAL_CATEGORIES.index(edit_goal["category"]) if edit_goal["category"] in GOAL_CATEGORIES else 0)
                    e_category = e_cat_fmt.split(" ", 1)[1]
                with e_col2:
                    e_priority = st.selectbox("Priority *", GOAL_PRIORITIES, index=GOAL_PRIORITIES.index(edit_goal["priority"]) if edit_goal["priority"] in GOAL_PRIORITIES else 1)
                    e_date = st.date_input("Target Date (Optional)", value=datetime.datetime.strptime(edit_goal["target_date"], "%Y-%m-%d").date() if edit_goal["target_date"] else None)
                    e_desc = st.text_area("Description / Notes", value=edit_goal["description"] or "", height=90)
                e_date_str = e_date.strftime("%Y-%m-%d") if e_date else None

                eb1, eb2 = st.columns(2)
                with eb1:
                    submitted_edit = st.form_submit_button("✓ Save Changes", use_container_width=True, type="primary")
                with eb2:
                    cancelled_edit = st.form_submit_button("✖ Cancel", use_container_width=True)
                    if cancelled_edit:
                        st.session_state.goal_edit_id = None
                        st.rerun()

                if submitted_edit:
                    if not e_name.strip():
                        st.error("⚠️ Goal name cannot be empty.")
                    elif e_target <= 0:
                        st.error("⚠️ Target amount must be greater than ₹0.")
                    else:
                        update_goal(
                            goal_id=edit_goal["id"],
                            name=e_name,
                            target_amount=float(e_target),
                            category=e_category,
                            priority=e_priority,
                            target_date=e_date_str,
                            description=e_desc
                        )
                        st.success("✅ Goal updated!")
                        st.session_state.goal_edit_id = None
                        st.rerun()
            st.markdown("</div>", unsafe_allow_html=True)

    # ---------------- Delete Confirmation ----------------
    if st.session_state.get("goal_delete_id"):
        del_goal = get_goal(st.session_state["goal_delete_id"])
        if del_goal:
            saved_del = float(del_goal["saved_amount"])
            st.markdown("<div class='form-card'>", unsafe_allow_html=True)
            st.markdown(f"<h3 style='margin-bottom: 12px; color: #AE221A; font-weight: 800;'>🗑️ Delete Goal?</h3>", unsafe_allow_html=True)
            if saved_del > 0:
                st.markdown(f"<p style='color:#14201B; font-weight:500;'>This goal has <b>{format_currency(saved_del)}</b> saved. Deleting it will <b>return this amount to your wallet balance</b>. No money will be lost.</p>", unsafe_allow_html=True)
            else:
                st.markdown("<p style='color:#14201B; font-weight:500;'>This goal has no saved amount. Deleting it will remove the goal permanently.</p>", unsafe_allow_html=True)
            d1, d2 = st.columns(2)
            with d1:
                if st.button("🗑️ Yes, Delete Goal", use_container_width=True):
                    result = delete_goal(del_goal["id"], user_id)
                    if result["saved_amount"] > 0:
                        adjust_wallet_balance(result["saved_amount"])
                        st.success(f"✅ Deleted '{del_goal['name']}'. {format_currency(result['saved_amount'])} returned to your wallet.")
                    else:
                        st.success(f"✅ Deleted goal '{del_goal['name']}'.")
                    st.session_state.goal_delete_id = None
                    st.rerun()
            with d2:
                if st.button("Cancel", use_container_width=True):
                    st.session_state.goal_delete_id = None
                    st.rerun()
            st.markdown("</div>", unsafe_allow_html=True)

    # ---------------- Goal Insights ----------------
    if goals:
        insights = generate_goal_insights(goals)
        if insights:
            st.markdown("---")
            st.markdown("<h2 style='font-size: 1.45rem; font-weight: 800; color: #14201B; margin-top: 10px; margin-bottom: 14px; letter-spacing: -0.2px;'>💡 Goal Insights</h2>", unsafe_allow_html=True)
            for insight in insights:
                st.markdown(f"<div class='insight-card'><div class='insight-text'>{insight}</div></div>", unsafe_allow_html=True)

        # --- Achievements: Completed Goals History ---
        completed_goals = [g for g in goals if g["status"] == "Completed"]
        if completed_goals:
            st.markdown("---")
            st.markdown("<h2 style='font-size: 1.45rem; font-weight: 800; color: #14201B; margin-top: 10px; margin-bottom: 14px; letter-spacing: -0.2px;'>🏆 Achievements</h2>", unsafe_allow_html=True)
            for g in completed_goals:
                gc_icon = get_goal_category_icon(g["category"])
                st.markdown(f"""
                <div class="activity-row" style="background: linear-gradient(140deg, #EDF8F1 0%, #FFFDF8 100%); border-color: #A9D6BE;">
                    <div class="activity-left">
                        <div class="activity-icon" style="background: #D9F1E3; color: #0F6F42; font-size:1.2rem;">{gc_icon}</div>
                        <div>
                            <div class="activity-desc" style="color: #0F6F42;">✓ {g['name']}</div>
                            <div class="activity-meta" style="color:#42504A;">{g['category']} · Saved {format_currency(g['saved_amount'])} of {format_currency(g['target_amount'])}</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:800; color:#0F6F42; font-size:1rem;">Done</div>
                    </div>
                </div>""", unsafe_allow_html=True)

# ----------------------------------------------------
# PAGE 4: WALLET PAGE REDESIGN
# ----------------------------------------------------
elif nav_choice == "💳 Wallet":
    st.markdown("<h1 style='font-size: 2.5rem; font-weight: 800; color: #0B2920; margin-bottom: 2px; letter-spacing: -0.5px;'>My Wallet</h1>", unsafe_allow_html=True)
    st.markdown("<p style='color: #5C6660; font-size: 1.1rem; font-weight: 500; margin-bottom: 28px;'>Manage your money in one place.</p>", unsafe_allow_html=True)

    summary = get_wallet_summary()
    wallet_user = get_current_user_id()
    goals_allocated = get_total_allocated_to_goals(wallet_user)
    render_hero_balance(format_currency(summary["available_wallet"]), subtext=f"Available after {format_currency(goals_allocated)} allocated to goals")

    # Financial Section Metric Tiles
    w1, w2, w3 = st.columns(3)
    with w1:
        render_metric_tile("🎯 Goals", format_currency(goals_allocated), "Allocated for goals", icon="🎯")
    with w2:
        render_metric_tile("Money to Receive", format_currency(summary["money_to_receive"]), "Track money owed to you", icon="📥")
    with w3:
        render_metric_tile("Money Borrowed", format_currency(summary["money_borrowed"]), "Track money you need to return", icon="📤")

    st.write("")
    st.markdown("<h2 style='font-size: 1.45rem; font-weight: 800; color: #0B2920; margin-bottom: 14px; letter-spacing: -0.2px;'>⚡ Wallet Actions</h2>", unsafe_allow_html=True)

    tab_add, tab_lend, tab_borrow, tab_receive, tab_repay, tab_alloc = st.tabs([
        "➕ Add Money",
        "↗️ Lend Money",
        "↙️ Borrow Money",
        "✓ Record Money Received",
        "💳 Repay Borrowed Money",
        "🎯 Allocate to Goal"
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

    # Action 6: Allocate to Goal
    with tab_alloc:
        st.caption("Move money from your wallet toward a goal. This reduces your available balance and increases the goal's saved amount — no double counting.")
        alloc_user = get_current_user_id()
        alloc_goals = [g for g in get_user_goals(alloc_user) if g["status"] == "Active"]
        avail_now = get_wallet_balance()
        if not alloc_goals:
            st.info("No active goals available. Create a goal from the 🎯 Bucket List page first.")
        else:
            goal_options = {f"{get_goal_category_icon(g['category'])} {g['name']} — {format_currency(g['saved_amount'])} / {format_currency(g['target_amount'])}": g for g in alloc_goals}
            sel_goal_label = st.selectbox("Select Goal *", list(goal_options.keys()), key="alloc_goal_sel")
            sel_goal = goal_options[sel_goal_label]
            max_to_alloc = min(float(avail_now), float(sel_goal["target_amount"]) - float(sel_goal["saved_amount"]))
            with st.form("allocate_goal_form"):
                al_c1, al_c2 = st.columns(2)
                with al_c1:
                    alloc_amt = st.number_input("Amount (₹) *", min_value=0.0, step=100.0, format="%.2f", key="alloc_amt")
                with al_c2:
                    alloc_date = st.date_input("Date *", value=datetime.date.today(), key="alloc_date")
                alloc_note = st.text_input("Note (Optional)", placeholder="e.g. Monthly savings", key="alloc_note")
                st.caption(f"Wallet available: {format_currency(avail_now)}")
                submit_alloc = st.form_submit_button("Allocate to Goal", use_container_width=True)
                if submit_alloc:
                    if alloc_amt <= 0:
                        st.error("⚠️ Amount must be greater than zero.")
                    elif alloc_amt > avail_now:
                        st.error(f"⚠️ Amount cannot exceed your available wallet balance ({format_currency(avail_now)}).")
                    elif max_to_alloc > 0 and alloc_amt > max_to_alloc:
                        st.error(f"⚠️ This would exceed the goal target. Remaining to reach target: {format_currency(max_to_alloc)}.")
                    else:
                        ok = add_goal_contribution(
                            goal_id=sel_goal["id"],
                            user_id=alloc_user,
                            amount=float(alloc_amt),
                            source="Wallet",
                            transaction_date=alloc_date.strftime("%Y-%m-%d"),
                            note=alloc_note
                        )
                        if ok:
                            st.success(f"✅ Allocated {format_currency(alloc_amt)} to '{sel_goal['name']}'. Wallet balance updated.")
                            if float(sel_goal["saved_amount"]) + alloc_amt >= float(sel_goal["target_amount"]):
                                st.balloons()
                                st.markdown("<div class='goal-completed-flag'>🎉 Goal Completed! You reached your goal!</div>", unsafe_allow_html=True)
                            st.rerun()
                        else:
                            st.error("⚠️ Could not allocate. Please check your wallet balance.")

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
