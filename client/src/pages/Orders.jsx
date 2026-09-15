import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "react-router-dom";

import {
  api,
  dt,
  peso,
} from "../lib/api";

import { useAuth } from "../context/AuthContext";

import {
  Empty,
  Loading,
  Modal,
  PageTitle,
  SearchBox,
  StatusBadge,
} from "../components/UI";

const ORDER_STATUSES = [
  "Pending",
  "Under Review",
  "Waiting for Payment",
  "Approved",
  "In Queue",
  "Printing",
  "Ready for Pickup",
  "Out for Delivery",
  "Completed",
  "Rejected",
  "Cancelled",
];

/* =========================================================
   ORDERS PAGE
========================================================= */

export default function Orders() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const statusFilter =
    searchParams.get("status") || "";

  const [orders, setOrders] = useState();
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const isAdmin = user.role === "admin";

  function loadOrders() {
    setError("");

    api("/orders")
      .then(setOrders)
      .catch((requestError) => {
        setOrders([]);
        setError(requestError.message);
      });
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (!orders) {
      return [];
    }

    return orders.filter((order) => {
      const matchesStatus =
        !statusFilter ||
        order.status === statusFilter;

      const searchableText = `
        ${order.order_number || ""}
        ${order.customer || ""}
        ${order.walk_in_name || ""}
        ${order.document_title || ""}
        ${order.status || ""}
      `.toLowerCase();

      const matchesSearch =
        searchableText.includes(
          search.toLowerCase(),
        );

      return matchesStatus && matchesSearch;
    });
  }, [
    orders,
    search,
    statusFilter,
  ]);

  if (!orders) {
    return <Loading />;
  }

  const pageTitle = statusFilter
    ? `${statusFilter} Orders`
    : isAdmin
      ? "All Print Orders"
      : "My Orders";

  const emptyMessage = statusFilter
    ? `No ${statusFilter.toLowerCase()} orders found.`
    : "No orders found.";

  return (
    <>
      <PageTitle
        title={pageTitle}
        subtitle="Search orders, check details, and monitor progress."
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

        <div className="mb-4 max-w-md">
          <SearchBox
            value={search}
            onChange={setSearch}
          />
        </div>

        {!filteredOrders.length ? (
          <Empty text={emptyMessage} />
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
                    Document
                  </th>

                  <th className="pb-3 pr-5">
                    Status
                  </th>

                  <th className="pb-3 pr-5">
                    Price
                  </th>

                  <th className="pb-3 pr-5">
                    Date
                  </th>

                  <th className="pb-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="
                      border-t border-slate-100
                      dark:border-slate-800
                    "
                  >
                    <td
                      className="
                        whitespace-nowrap
                        py-4 pr-5
                        font-semibold text-brand
                      "
                    >
                      {order.order_number}
                    </td>

                    {isAdmin && (
                      <td className="py-4 pr-5">
                        {order.customer ||
                          order.walk_in_name ||
                          "Walk-in"}
                      </td>
                    )}

                    <td className="py-4 pr-5">
                      {order.document_title ||
                        "Print order"}
                    </td>

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

                    <td className="whitespace-nowrap py-4 pr-5">
                      {dt(order.created_at)}
                    </td>

                    <td className="py-4">
                      <button
                        type="button"
                        className="
                          font-semibold text-brand
                          hover:underline
                        "
                        onClick={() =>
                          setSelectedOrder(order)
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          isAdmin={isAdmin}
          close={() =>
            setSelectedOrder(null)
          }
          reload={loadOrders}
        />
      )}
    </>
  );
}

/* =========================================================
   ORDER DETAILS MODAL
========================================================= */

function OrderModal({
  order,
  isAdmin,
  close,
  reload,
}) {
  const [status, setStatus] = useState(
    order.status,
  );

  const [note, setNote] = useState(
    order.admin_notes || "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveOrderUpdate() {
    setSaving(true);
    setError("");

    try {
      await api(
        `/orders/${order.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            admin_notes: note,
          }),
        },
      );

      close();
      reload();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  const orderDetails = [
    [
      "Document",
      order.document_title ||
        "Print order",
    ],
    [
      "Price",
      peso(
        order.final_price ||
          order.estimated_price,
      ),
    ],
    [
      "Paper",
      `${order.paper_size || "—"} · ${
        order.paper_type || "—"
      }`,
    ],
    [
      "Printing",
      `${order.print_color || "—"} · ${
        order.print_sides || "—"
      }`,
    ],
    [
      "Quantity",
      `${order.pages || 0} pages × ${
        order.copies || 0
      } copies`,
    ],
    [
      "Fulfillment",
      order.fulfillment_method || "—",
    ],
  ];

  return (
    <Modal
      title={order.order_number}
      onClose={close}
    >
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

      <div className="grid grid-cols-2 gap-4 text-sm">
        {orderDetails.map(
          ([label, value]) => (
            <p key={label}>
              <span className="text-slate-500">
                {label}
              </span>

              <br />

              <strong>{value}</strong>
            </p>
          ),
        )}
      </div>

      <div className="mt-5">
        <p className="text-sm text-slate-500">
          Current status
        </p>

        <div className="mt-1">
          <StatusBadge
            status={order.status}
          />
        </div>
      </div>

      {order.admin_notes && !isAdmin && (
        <div
          className="
            mt-5 rounded-xl
            bg-blue-50 p-4
            dark:bg-blue-950
          "
        >
          <p className="text-sm font-semibold">
            Shop note
          </p>

          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {order.admin_notes}
          </p>
        </div>
      )}

      {isAdmin && (
        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="order-status">
              Status
            </label>

            <select
              id="order-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
            >
              {ORDER_STATUSES.map(
                (orderStatus) => (
                  <option
                    key={orderStatus}
                    value={orderStatus}
                  >
                    {orderStatus}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label htmlFor="administrator-note">
              Customer-visible note
            </label>

            <textarea
              id="administrator-note"
              rows="3"
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="Add a message for the customer..."
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
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={saveOrderUpdate}
            >
              {saving
                ? "Saving..."
                : "Save Update"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}