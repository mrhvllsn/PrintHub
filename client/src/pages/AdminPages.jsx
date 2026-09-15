import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Download,
  Plus,
  Trash2,
} from "lucide-react";

import {
  api,
  dt,
  peso,
} from "../lib/api";

import {
  Empty,
  Loading,
  Modal,
  PageTitle,
  SearchBox,
  StatusBadge,
} from "../components/UI";

import { useAuth } from "../context/AuthContext";

/* =========================================================
   REUSABLE TABLE
========================================================= */

function TablePage({
  title,
  subtitle,
  endpoint,
  columns,
  action,
}) {
  const [rows, setRows] = useState();
  const [search, setSearch] = useState("");

  function load() {
    api(endpoint)
      .then(setRows)
      .catch((error) => {
        setRows([]);
        alert(error.message);
      });
  }

  useEffect(() => {
    load();
  }, [endpoint]);

  const shownRows = useMemo(() => {
    if (!rows) {
      return [];
    }

    return rows.filter((row) =>
      JSON.stringify(row)
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [rows, search]);

  if (!rows) {
    return <Loading />;
  }

  return (
    <>
      <PageTitle
        title={title}
        subtitle={subtitle}
        action={action?.(load)}
      />

      <div className="card">
        <div className="mb-4 max-w-md">
          <SearchBox
            value={search}
            onChange={setSearch}
          />
        </div>

        {!shownRows.length ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.label}
                      className="pb-3 pr-5"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {shownRows.map((row, index) => (
                  <tr
                    key={row.id || index}
                    className="
                      border-t border-slate-100
                      dark:border-slate-800
                    "
                  >
                    {columns.map((column) => (
                      <td
                        key={column.label}
                        className="whitespace-nowrap py-4 pr-5"
                      >
                        {column.render
                          ? column.render(row, load)
                          : row[column.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* =========================================================
   UPLOADED FILES
========================================================= */

export function Files() {
  const { user } = useAuth();

  async function downloadFile(event, file) {
    event.preventDefault();

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `/api/files/${file.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Unable to download the file.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = file.original_name;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message);
    }
  }

  async function deleteFile(file, load) {
    const confirmed = window.confirm(
      "Delete this file?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await api(`/files/${file.id}`, {
        method: "DELETE",
      });

      load();
    } catch (error) {
      alert(error.message);
    }
  }

  const columns = [
    {
      label: "File",
      render: (file) => (
        <>
          <strong>{file.original_name}</strong>

          <p className="text-xs text-slate-500">
            {(Number(file.file_size || 0) / 1024).toFixed(1)} KB
          </p>
        </>
      ),
    },
    {
      label: "Type",
      key: "file_kind",
    },
    {
      label: "Order",
      key: "order_number",
    },

    ...(user.role === "admin"
      ? [
          {
            label: "Customer",
            key: "customer",
          },
        ]
      : []),

    {
      label: "Uploaded",
      render: (file) =>
        dt(file.created_at),
    },
    {
      label: "Actions",
      render: (file, load) => (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-light !p-2"
            onClick={(event) =>
              downloadFile(event, file)
            }
            aria-label="Download file"
          >
            <Download size={16} />
          </button>

          <button
            type="button"
            className="btn-light !p-2 text-red-600"
            onClick={() =>
              deleteFile(file, load)
            }
            aria-label="Delete file"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <TablePage
      title="Uploaded Files"
      subtitle="Preview, download, and manage uploaded documents."
      endpoint="/files"
      columns={columns}
    />
  );
}

/* =========================================================
   CUSTOMERS
========================================================= */

export function Customers() {
  async function updateStatus(
    customerId,
    status,
    load,
  ) {
    try {
      await api(
        `/customers/${customerId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );

      load();
    } catch (error) {
      alert(error.message);
    }
  }

  const columns = [
    {
      label: "Customer",
      render: (customer) => (
        <>
          <strong>{customer.full_name}</strong>

          <p className="text-xs text-slate-500">
            @{customer.username}
          </p>
        </>
      ),
    },
    {
      label: "Email",
      key: "email",
    },
    {
      label: "Phone",
      key: "phone",
    },
    {
      label: "Orders",
      key: "orders",
    },
    {
      label: "Status",
      render: (customer) => (
        <StatusBadge status={customer.status} />
      ),
    },
    {
      label: "Action",
      render: (customer, load) => (
        <select
          className="min-w-32"
          value={customer.status}
          onChange={(event) =>
            updateStatus(
              customer.id,
              event.target.value,
              load,
            )
          }
        >
          <option value="Active">Active</option>
          <option value="Suspended">
            Suspended
          </option>
          <option value="Archived">
            Archived
          </option>
        </select>
      ),
    },
  ];

  return (
    <TablePage
      title="Customers"
      subtitle="View accounts and control customer access."
      endpoint="/customers"
      columns={columns}
    />
  );
}

/* =========================================================
   INVENTORY MOVEMENTS
========================================================= */

export function Movements() {
  const columns = [
    {
      label: "Item",
      key: "item",
    },
    {
      label: "Type",
      key: "movement_type",
    },
    {
      label: "Quantity",
      key: "quantity",
    },
    {
      label: "Before",
      key: "previous_quantity",
    },
    {
      label: "After",
      key: "updated_quantity",
    },
    {
      label: "Administrator",
      key: "administrator",
    },
    {
      label: "Date",
      render: (movement) =>
        dt(movement.created_at),
    },
  ];

  return (
    <TablePage
      title="Inventory Movements"
      subtitle="Complete history of restocks, usage, damage, and adjustments."
      endpoint="/movements"
      columns={columns}
    />
  );
}

/* =========================================================
   ACTIVITY LOGS
========================================================= */

export function Logs() {
  const columns = [
    {
      label: "Account",
      key: "account",
    },
    {
      label: "Action",
      key: "action",
    },
    {
      label: "Related Record",
      render: (log) =>
        log.related_type
          ? `${log.related_type} #${log.related_id}`
          : "—",
    },
    {
      label: "Date",
      render: (log) =>
        dt(log.created_at),
    },
  ];

  return (
    <TablePage
      title="Activity Logs"
      subtitle="Security and administrator activity history."
      endpoint="/logs"
      columns={columns}
    />
  );
}

/* =========================================================
   EXPENSES
========================================================= */

export function Expenses() {
  const [modal, setModal] = useState(null);

  async function deleteExpense(
    expenseId,
    load,
  ) {
    const confirmed = window.confirm(
      "Delete this expense?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await api(`/expenses/${expenseId}`, {
        method: "DELETE",
      });

      load();
    } catch (error) {
      alert(error.message);
    }
  }

  const columns = [
    {
      label: "Date",
      render: (expense) =>
        expense.expense_date?.slice(0, 10) || "—",
    },
    {
      label: "Category",
      key: "category",
    },
    {
      label: "Description",
      key: "description",
    },
    {
      label: "Amount",
      render: (expense) =>
        peso(expense.amount),
    },
    {
      label: "Action",
      render: (expense, load) => (
        <button
          type="button"
          className="text-red-600"
          onClick={() =>
            deleteExpense(expense.id, load)
          }
          aria-label="Delete expense"
        >
          <Trash2 size={17} />
        </button>
      ),
    },
  ];

  return (
    <>
      <TablePage
        title="Expenses"
        subtitle="Record and monitor shop operating expenses."
        endpoint="/expenses"
        columns={columns}
        action={(load) => (
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              setModal({ load })
            }
          >
            <Plus size={18} />

            Add Expense
          </button>
        )}
      />

      {modal && (
        <ExpenseModal
          load={modal.load}
          close={() => setModal(null)}
        />
      )}
    </>
  );
}

/* =========================================================
   EXPENSE MODAL
========================================================= */

export function ExpenseModal({
  load,
  close,
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

  async function saveExpense(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await api("/expenses", {
        method: "POST",
        body: JSON.stringify(form),
      });

      load();
      close();
    } catch (error) {
      alert(error.message);
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
        onSubmit={saveExpense}
        className="space-y-4"
      >
        <div>
          <label>Category</label>

          <select
            value={form.category}
            onChange={(event) =>
              setForm({
                ...form,
                category: event.target.value,
              })
            }
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
          <label>Description</label>

          <input
            type="text"
            value={form.description}
            onChange={(event) =>
              setForm({
                ...form,
                description: event.target.value,
              })
            }
            required
          />
        </div>

        <div>
          <label>Amount</label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) =>
              setForm({
                ...form,
                amount: event.target.value,
              })
            }
            required
          />
        </div>

        <div>
          <label>Date</label>

          <input
            type="date"
            value={form.expense_date}
            onChange={(event) =>
              setForm({
                ...form,
                expense_date: event.target.value,
              })
            }
            required
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save Expense"}
        </button>
      </form>
    </Modal>
  );
}

/* =========================================================
   PAYMENTS
========================================================= */

export function Payments() {
  const columns = [
    {
      label: "Payment",
      key: "payment_number",
    },
    {
      label: "Order",
      key: "order_number",
    },
    {
      label: "Customer",
      key: "customer",
    },
    {
      label: "Paid",
      render: (payment) =>
        peso(payment.amount_paid),
    },
    {
      label: "Balance",
      render: (payment) =>
        peso(payment.remaining_balance),
    },
    {
      label: "Method",
      key: "method",
    },
    {
      label: "Status",
      render: (payment) => (
        <StatusBadge status={payment.status} />
      ),
    },
    {
      label: "Date",
      render: (payment) =>
        payment.payment_date
          ? dt(payment.payment_date)
          : "—",
    },
  ];

  return (
    <TablePage
      title="Payments"
      subtitle="View customer payments and remaining balances."
      endpoint="/payments"
      columns={columns}
    />
  );
}

/* =========================================================
   REPORTS
========================================================= */

export function Reports() {
  const [report, setReport] = useState();

  useEffect(() => {
    api("/reports/summary")
      .then(setReport)
      .catch((error) => {
        alert(error.message);
      });
  }, []);

  if (!report) {
    return <Loading />;
  }

  const summaryCards = [
    [
      "Total Sales",
      report.sales,
      "text-green-600",
    ],
    [
      "Total Expenses",
      report.expenses,
      "text-red-600",
    ],
    [
      "Estimated Profit",
      report.profit,
      "text-brand",
    ],
  ];

  return (
    <>
      <PageTitle
        title="Reports"
        subtitle="Sales, expenses, profit, and order status summary."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map(
          ([label, value, color]) => (
            <div
              key={label}
              className="card"
            >
              <p className="text-sm text-slate-500">
                {label}
              </p>

              <p
                className={`
                  mt-2 text-3xl font-black
                  ${color}
                `}
              >
                {peso(value)}
              </p>
            </div>
          ),
        )}
      </div>

      <div className="card mt-5">
        <h2 className="mb-4 text-lg font-bold">
          Orders by Status
        </h2>

        {!report.orders?.length ? (
          <Empty text="No order records found." />
        ) : (
          report.orders.map((order) => (
            <div
              key={order.status}
              className="
                mb-3 flex items-center
                justify-between
                border-b border-slate-100
                pb-3
                dark:border-slate-800
              "
            >
              <StatusBadge status={order.status} />

              <strong>{order.total}</strong>
            </div>
          ))
        )}
      </div>
    </>
  );
}