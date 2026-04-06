# Finance Module Review - 2026-04-06

## Executive Summary

The current finance module mixes three different concepts:

- P&L: income minus expense for a period or historical view.
- Cash / bank: money really available today.
- Payout obligations: amounts owed to founders and workers after a period closes.

Because those concepts are mixed in the UI and only partially connected in the data model, the module is useful for reporting trends but is not yet a reliable source of truth for "how much money do we really have in the bank right now?".

## Main Gaps

1. `Balance actual` is not real cash.
   It currently shows historical net result, not money available in bank.

2. `Fondo empresa` is not the full company cash position.
   It only tracks a subset of movements:
   - credits from period close
   - debits from expenses funded by `company_fund`
   - release debits from reserve logic
   It does not currently include all real-world cash inflows and outflows.

3. Founder and worker payouts are tracked as obligations, not as cash movements.
   Marking a distribution as paid updates `amount_paid`, but does not create a real cash movement in any ledger/account.

4. The system does not have a canonical account model.
   There is no first-class concept for:
   - bank account
   - cash wallet
   - owner-funded expenses
   - reserve/fund account
   - payout source account

5. Cashflow views are based on transaction net, not on actual account balances.
   This makes projections useful as a directional report, but not as treasury truth.

6. Worker payout logic is correct in spirit but hard to read.
   The workers percentage is a cap, not a guaranteed payout.
   Unallocated worker pool returns to company fund.
   If release is enabled, founders and workers can receive extra bonus distributions from reserve.

7. Distribution payment integrity is weak.
   Today there is no strong guarantee that `amount_paid <= amount_earned`.
   This can create negative pending balances and inconsistent records.

## Desired Target State

The module should clearly separate:

- Accounting result: income, expense, net result.
- Treasury / cash: balances by real account.
- Obligations: what the company owes to founders, workers, vendors.
- Period closing logic: how net result is allocated.

## Proposed Model

1. Keep `finance_transactions` as the business transaction table.
   It should describe the event:
   - income or expense
   - amount
   - currency
   - amount_usd / exchange_rate
   - transaction_date
   - category
   - project / invoice / period
   - funding_source

2. Add real cash account tables.
   Suggested tables:
   - `finance_accounts`
   - `finance_account_movements`

3. Every real cash movement must create an account movement.
   Examples:
   - invoice paid -> bank credit
   - manual income -> selected account credit
   - expense paid from bank -> bank debit
   - expense paid by owner personally -> owner payable / owner contribution, not bank debit
   - distribution payout -> bank debit or fund debit
   - transfer between bank and company fund -> two linked movements

4. Treat `finance_distributions` as obligations, not cash.
   They should represent what was earned and what remains pending.
   Paying them should create a linked payment record and a real account movement.

5. Convert `Fondo empresa` into an explicit account or reserve bucket.
   Decide one of these two paths:
   - Path A: model it as a real account inside `finance_accounts`
   - Path B: keep it as a derived reserve, but never present it as bank balance

6. Separate cash KPIs from P&L KPIs in the UI.
   Dashboard should show at least:
   - Resultado acumulado
   - Caja/Banco real hoy
   - Obligaciones pendientes founders/workers
   - Disponible libre

7. Make period close fully auditable.
   A closed period should persist:
   - total income
   - total expense
   - net result
   - founder allocations
   - worker pool cap
   - worker pool earned
   - unallocated worker amount
   - company allocation
   - reserve release, if any
   - resulting reserve/account balances

## Acceptance Criteria

- A user can answer "how much money do we have in the bank today?" from one screen.
- A user can answer "how much is already committed to founders and workers?" from one screen.
- Paying a founder or worker reduces the selected cash account automatically.
- External-funded expenses do not reduce company cash unless converted into a company reimbursement/payable flow.
- Cashflow report uses account balances plus scheduled receivables/payables, not only net P&L.
- Period close remains immutable and auditable after closing.
- All money values remain correct across currencies.

## Suggested Implementation Order

1. Rename and fix KPIs.
   - Rename `Balance actual` to `Resultado acumulado` if it remains P&L.
   - Add a real `Saldo banco/caja` KPI.
   - Add `Pendiente founders/workers`.
   - Add `Disponible libre`.

2. Add `finance_accounts` and `finance_account_movements`.

3. Backfill existing `finance_company_fund_movements` into the new account movement model.

4. Add `distribution_payments` or linked payment metadata so paying distributions creates account debits.

5. Update invoice sync so paid invoices create account credits to the selected/default cash account.

6. Update manual expense/income flows so every real payment records both:
   - the business transaction
   - the cash account movement

7. Add hard integrity checks:
   - `amount_paid <= amount_earned`
   - no payment from accounts with insufficient balance
   - closed periods cannot be mutated
   - currency conversion fields required for non-USD movements

8. Refactor reports so each report clearly states whether it is:
   - P&L
   - Treasury / cash
   - Obligations / payouts

## Prompt For Implementation

```text
Act as a senior full-stack engineer and financial systems designer working inside this repository.

We need to refactor the finance module so it becomes a trustworthy source of truth for:
1. accounting result (income, expenses, net profit),
2. real cash/bank balance,
3. obligations pending to founders and workers,
4. auditable period closing and payout flows.

Current repo context:
- `finance_transactions` is used as a business transaction ledger.
- `finance_distributions` stores founder/worker allocations after period close.
- `finance_company_fund_movements` partially tracks an internal fund/reserve.
- Dashboard KPIs currently mix P&L and cash concepts.
- Marking a distribution as paid updates `amount_paid`, but does not create a real cash movement.
- Multi-currency normalization is being introduced through `amount_usd` and `exchange_rate`.

Your task:
- Review the existing finance architecture end-to-end in frontend and Supabase migrations.
- Design and implement a consistent financial model that separates:
  - P&L transactions
  - real cash accounts
  - payout obligations
  - payout payments
- Preserve existing business rules for period close:
  - founder percentages
  - worker pool cap / earned / unallocated logic
  - company allocation
  - optional reserve release
- Make the module answer these questions correctly:
  - "How much money is really in the bank today?"
  - "How much is pending to founders/workers?"
  - "How much is freely available after pending obligations?"
  - "How was this period distributed when it was closed?"

Implementation requirements:
- Add a canonical account model, preferably:
  - `finance_accounts`
  - `finance_account_movements`
- Every real money movement must create an account movement.
- Founder/worker payouts must generate account debits linked to the distribution row.
- Add DB constraints and app validation so:
  - `amount_paid` cannot exceed `amount_earned`
  - non-USD transactions always have normalization fields
  - closed periods remain immutable
  - insufficient account balance blocks payment when applicable
- Update the dashboard and reports so P&L KPIs and cash KPIs are clearly separated.
- If keeping `Fondo empresa`, either:
  - convert it into a real account in the new model, or
  - relabel it clearly as reserve and stop presenting it as current bank balance.
- Keep backward compatibility as much as possible.
- Write migrations to backfill old data safely.
- Do not delete historical data.
- Add clear comments only where logic is not obvious.

Deliverables:
1. architecture proposal,
2. SQL migrations,
3. frontend updates,
4. data backfill strategy,
5. validation rules,
6. concise summary of what changed and which screens now answer which financial question.

Prioritize correctness and auditability over minimal code churn.
```

