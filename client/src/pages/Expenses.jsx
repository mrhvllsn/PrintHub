import {
  useEffect,
  useState,
} from "react";

import {
  Plus,
  Trash2,
} from "lucide-react";

import {
  api,
  peso,
} from "../lib/api";

import {
  Empty,
  Loading,
  Modal,
  PageTitle,
} from "../components/UI";

export default function Expenses() {
  const [rows, setRows] = useState();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  function loadExpenses() {
    setError("");

    api("/expenses")
      .then(setRows)
      .catch((requestError) => {
        setRows([]);
        setError(requestError.message);
      });
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  async function deleteExpense(expense) {
    const confirmed = window.confirm(
      `Delete the "${expense.description}" expense?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await api(`/expenses/${expense.id}`, {
        method: "DELETE",
      });

      loadExpenses();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!rows) {
    return <Loading />;
  }

  return (
    <>
      <PageTitle
        title="Expenses"
        subtitle="Record and monitor shop operating expenses."
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setOpen(true)}
          >
            <Plus size={18} />

            Add Expense
          </button>
        }
      />

      <div className="card">
        {error && (
          <p
            className="
              mb-4 rounded-xl
              bg-red-50 p-3
              text-sm text-red-700
            "
          >
            {error}
          </p>
        )}

        {!rows.length ? (
          <Empty text="No expenses recorded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-5">
                    Date
                  </th>

                  <th className="pb-3 pr-5">
                    Category
                  </th>

                  <th className="pb-3 pr-5">
                    Description
                  </th>

                  <th className="pb-3 pr-5">
                    Amount
                  </th>

                  <th className="pb-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((expense) => (
                  <tr
                    key={expense.id}
                    className="
                      border-t border-slate-100
                      dark:border-slate-800
                    "
                  >
                    <td className="whitespace-nowrap py-4 pr-5">
                      {expense.expense_date?.slice(
                        0,
                        10,
                      ) || "—"}
                    </td>

                    <td className="py-4 pr-5">
                      {expense.category}
                    </td>

                    <td className="py-4 pr-5">
                      {expense.description}
                    </td>

                    <td className="whitespace-nowrap py-4 pr-5 font-semibold">
                      {peso(expense.amount)}
                    </td>

                    <td className="py-4">
                      <button
                        type="button"
                        className="
                          rounded-lg p-2
                          text-red-600
                          hover:bg-red-50
                          dark:hover:bg-red-950
                        "
                        onClick={() =>
                          deleteExpense(expense)
                        }
                        aria-label="Delete expense"
                      >
                        <Trash2 size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <ExpenseForm
          close={() => setOpen(false)}
          done={() => {
            setOpen(false);
            loadExpenses();
          }}
        />
      )}
    </>
  );
}

/* =========================================================
   ADD EXPENSE FORM
========================================================= */

function ExpenseForm({
  close,
  done,
}) {
  const [form, setForm] = useState({
    category: "Supply purchases",
    description: "",
    amount: "",
    expense_date: new Date()
      .toISOString()
      .slice(0, 10),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    "Supply purchases",
    "Electricity",
    "Internet",
    "Equipment repair",
    "Printer maintenance",
    "Rent",
    "Employee salary",
    "Transportation",
    "Other",
  ];

  function updateField(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function saveExpense(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      await api("/expenses", {
        method: "POST",
        body: JSON.stringify(form),
      });

      done();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add Expense"
      onClose={close}
    >
      <form
        className="space-y-4"
        onSubmit={saveExpense}
      >
        {error && (
          <p
            className="
              rounded-xl bg-red-50
              p-3 text-sm text-red-700
            "
          >
            {error}
          </p>
        )}

        <div>
          <label htmlFor="expense-category">
            Category
          </label>

          <select
            id="expense-category"
            name="category"
            value={form.category}
            onChange={updateField}
          >
            {categories.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="expense-description">
            Description
          </label>

          <input
            id="expense-description"
            name="description"
            type="text"
            value={form.description}
            onChange={updateField}
            placeholder="Enter the expense description"
            required
          />
        </div>

        <div>
          <label htmlFor="expense-amount">
            Amount
          </label>

          <input
            id="expense-amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={updateField}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label htmlFor="expense-date">
            Date
          </label>

          <input
            id="expense-date"
            name="expense_date"
            type="date"
            value={form.expense_date}
            onChange={updateField}
            required
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn-light"
            onClick={close}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Save Expense"}
          </button>
        </div>
      </form>
    </Modal>
  );
}