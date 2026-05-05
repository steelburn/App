---
title: Create an Aging Report
description: Learn how to build an aging report on the Spend page to see how long expenses have been outstanding, grouped by time period.
keywords: [New Expensify, aging report, accruals, outstanding expenses, unapproved, group-by, Spend page, card accruals, search operators]
---

An aging report shows how long expenses have been sitting in a particular status — for example, how many unapproved Expensify Card transactions are outstanding and how they break down by month or quarter. This is useful for finance teams tracking card accruals, identifying bottlenecks in the approval process, or auditing stale expenses.

You can build an aging report directly on the **Spend** page using search operators and grouping.

---

# How to create an aging report

1. Go to **Spend** > **Expenses**.
2. In the search bar, enter a query that filters to the expenses you want to age. For example, to see all outstanding Expensify Card expenses:
   ```
   type:expense status:outstanding expense-type:card
   ```
3. Add `group-by:month` or `group-by:quarter` to break the results down by time period:
   ```
   type:expense status:outstanding expense-type:card group-by:month
   ```
4. Optionally, add a date range to limit the window:
   ```
   type:expense status:outstanding expense-type:card group-by:month date>=2025-01-01
   ```
5. Optionally, add a chart view for a visual breakdown:
   ```
   type:expense status:outstanding expense-type:card group-by:month view:bar
   ```

The results update in real time as you adjust the query.

---

# Example aging report queries

| Goal | Query |
|------|-------|
| Outstanding card expenses by month | `type:expense status:outstanding expense-type:card group-by:month` |
| Outstanding card expenses by quarter | `type:expense status:outstanding expense-type:card group-by:quarter` |
| All outstanding expenses by month (any type) | `type:expense status:outstanding group-by:month` |
| Outstanding expenses for a specific workspace | `type:expense status:outstanding workspace:"Acme Inc." group-by:month` |
| Outstanding expenses as a line chart | `type:expense status:outstanding group-by:month view:line` |
| Outstanding expenses in a single currency | `type:expense status:outstanding group-by:month group-currency:USD` |

---

# How to save an aging report for reuse

Once you have a query you like, click **Save search** in the search bar. Give it a name like "Card accruals by month" so you can return to it in one click from the Spend page.

---

# Tips

- Use `group-by:quarter` instead of `group-by:month` for a higher-level view when you have a large date range.
- Add `view:bar` or `view:line` to visualize trends over time.
- Use `group-currency:USD` (or your preferred currency) to normalize totals when expenses span multiple currencies.
- Combine with `from:` to filter to a specific submitter, or `workspace:` to scope to a single workspace.
- For more detail on all available search operators, see [Use Search Operators to Filter and Analyze](https://help.expensify.com/articles/new-expensify/reports-and-expenses/Use-Search-Operators-to-Filter-and-Analyze).

---

# FAQ

## What is an aging report?

An aging report is a breakdown of expenses by how long they have been in a given status. It helps you see, at a glance, whether expenses are being processed promptly or piling up over time.

## Can I create an aging report on mobile?

Yes. The same search operators work in the Spend page search bar on mobile.

## Can I export the aging report data?

Yes. After running your query, select the results and use the **Export** option to download a CSV. See [Export Expenses and Reports](https://help.expensify.com/articles/new-expensify/reports-and-expenses/Search-and-Download-Expenses) for details.
