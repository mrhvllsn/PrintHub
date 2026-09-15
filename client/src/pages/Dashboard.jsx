import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  Printer,
  Users,
  Wallet,
} from "lucide-react";

import {
  api,
  dt,
  peso,
} from "../lib/api";

import { useAuth } from "../context/AuthContext";

import {
  Empty,
  Loading,
  PageTitle,
  StatusBadge,
} from "../components/UI";

export default function Dashboard() {
  const { user } = useAuth();

  const [dashboard, setDashboard] =
    useState();

  const [error, setError] = useState("");

  useEffect(() => {
    api("/dashboard")
      .then(setDashboard)
      .catch((requestError) => {
        setError(requestError.message);
      });
  }, []);

  if (error) {
    return (
      <>
        <PageTitle
          title="Dashboard"
          subtitle="PrintHub dashboard overview."
        />

        <div
          className="
            card bg-red-50
            text-red-700
          "
        >
          {error}
        </div>
      </>
    );
  }

  if (!dashboard) {
    return <Loading />;
  }

  const isAdmin = user.role === "admin";
  const stats = dashboard.stats || {};
  const recentOrders = dashboard.recent || [];

  const adminCards = [
    [
      stats.total,
      "Total Orders",
      ClipboardList,
      "bg-blue-500",
    ],
    [
      stats.pending,
      "Pending",
      Clock3,
      "bg-orange-500",
    ],
    [
      stats.printing,
      "Printing",
      Printer,
      "bg-violet-500",
    ],
    [
      stats.completed,
      "Completed",
      CheckCircle2,
      "bg-green-500",
    ],
    [
      stats.customers,
      "Customers",
      Users,
      "bg-cyan-500",
    ],
    [
      peso(stats.todaySales),
      "Today's Sales",
      Wallet,
      "bg-emerald-500",
    ],
    [
      stats.lowStock,
      "Low Stock",
      Boxes,
      "bg-red-500",
    ],
  ];

  const customerCards = [
    [
      stats.total,
      "My Orders",
      ClipboardList,
      "bg-blue-500",
    ],
    [
      stats.pending,
      "Pending",
      Clock3,
      "bg-orange-500",
    ],
    [
      stats.printing,
      "Printing",
      Printer,
      "bg-violet-500",
    ],
    [
      stats.ready,
      "Ready",
      CheckCircle2,
      "bg-cyan-500",
    ],
    [
      stats.completed,
      "Completed",
      CheckCircle2,
      "bg-green-500",
    ],
    [
      peso(stats.balance),
      "Balance",
      Wallet,
      "bg-red-500",
    ],
  ];

  const cards = isAdmin
    ? adminCards
    : customerCards;

  return (
    <>
      <PageTitle
        title={
          isAdmin
            ? "Admin Dashboard"
            : `Hello, ${user.full_name}!`
        }
        subtitle="Here is what is happening at PrintHub."
        action={
          <Link
            to={
              isAdmin
                ? "/walk-in"
                : "/new-order"
            }
            className="btn-primary"
          >
            <Plus size={18} />

            {isAdmin
              ? "Walk-in Order"
              : "Create New Print Order"}
          </Link>
        }
      />

      {/* Dashboard statistic cards */}
      <div
        className="
          grid gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        {cards.map(
          ([
            value,
            label,
            Icon,
            backgroundColor,
          ]) => (
            <div
              key={label}
              className="
                card flex
                items-center gap-4
              "
            >
              <span
                className={`
                  grid h-12 w-12
                  place-items-center rounded-xl
                  text-white
                  ${backgroundColor}
                `}
              >
                <Icon size={22} />
              </span>

              <div>
                <p className="text-2xl font-bold">
                  {value ?? 0}
                </p>

                <p className="text-sm text-slate-500">
                  {label}
                </p>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Recent orders */}
      <section className="card mt-6">
        <h2 className="mb-4 text-lg font-bold">
          Recent Orders
        </h2>

        {!recentOrders.length ? (
          <Empty text="No recent orders found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-5">
                    Order
                  </th>

                  {isAdmin && (
                    <th className="pb-3 pr-5">
                      Customer
                    </th>
                  )}

                  <th className="pb-3 pr-5">
                    Status
                  </th>

                  <th className="pb-3 pr-5">
                    Amount
                  </th>

                  <th className="pb-3">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="
                      border-t border-slate-100
                      dark:border-slate-800
                    "
                  >
                    <td
                      className="
                        whitespace-nowrap py-4 pr-5
                        font-semibold text-brand
                      "
                    >
                      {order.order_number}
                    </td>

                    {isAdmin && (
                      <td className="py-4 pr-5">
                        {order.customer || "Walk-in"}
                      </td>
                    )}

                    <td className="py-4 pr-5">
                      <StatusBadge
                        status={order.status}
                      />
                    </td>

                    <td className="whitespace-nowrap py-4 pr-5">
                      {peso(
                        order.final_price ||
                          order.estimated_price,
                      )}
                    </td>

                    <td className="whitespace-nowrap py-4">
                      {dt(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}