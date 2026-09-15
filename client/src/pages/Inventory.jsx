import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Plus } from "lucide-react";

import {
  api,
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

/* =========================================================
   INVENTORY PAGE
========================================================= */

export default function Inventory() {
  const [rows, setRows] = useState();
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] =
    useState(false);

  const [selectedItem, setSelectedItem] =
    useState(null);

  const [error, setError] = useState("");

  function loadInventory() {
    setError("");

    api("/inventory")
      .then(setRows)
      .catch((requestError) => {
        setRows([]);
        setError(requestError.message);
      });
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredItems = useMemo(() => {
    if (!rows) {
      return [];
    }

    return rows.filter((item) => {
      const searchableText = `
        ${item.name || ""}
        ${item.category || ""}
        ${item.brand || ""}
      `.toLowerCase();

      return searchableText.includes(
        search.toLowerCase(),
      );
    });
  }, [rows, search]);

  if (!rows) {
    return <Loading />;
  }

  return (
    <>
      <PageTitle
        title="Inventory"
        subtitle="Track paper, ink, toner, binding, and other shop supplies."
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              setShowAddForm(true)
            }
          >
            <Plus size={18} />

            Add Item
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

        <div className="mb-4 max-w-md">
          <SearchBox
            value={search}
            onChange={setSearch}
          />
        </div>

        {!filteredItems.length ? (
          <Empty text="No inventory items found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-5">
                    Item
                  </th>

                  <th className="pb-3 pr-5">
                    Category
                  </th>

                  <th className="pb-3 pr-5">
                    Quantity
                  </th>

                  <th className="pb-3 pr-5">
                    Minimum
                  </th>

                  <th className="pb-3 pr-5">
                    Unit Cost
                  </th>

                  <th className="pb-3 pr-5">
                    Status
                  </th>

                  <th className="pb-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="
                      border-t border-slate-100
                      dark:border-slate-800
                    "
                  >
                    <td className="py-4 pr-5">
                      <p className="font-semibold">
                        {item.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {item.brand || "No brand"}
                      </p>
                    </td>

                    <td className="py-4 pr-5">
                      {item.category}
                    </td>

                    <td className="whitespace-nowrap py-4 pr-5">
                      {item.current_quantity}{" "}
                      {item.unit}
                    </td>

                    <td className="py-4 pr-5">
                      {item.minimum_stock_level}
                    </td>

                    <td className="whitespace-nowrap py-4 pr-5">
                      {peso(item.cost_per_unit)}
                    </td>

                    <td className="py-4 pr-5">
                      <StatusBadge
                        status={item.status}
                      />
                    </td>

                    <td className="py-4">
                      <button
                        type="button"
                        className="
                          whitespace-nowrap
                          font-semibold text-brand
                          hover:underline
                        "
                        onClick={() =>
                          setSelectedItem(item)
                        }
                      >
                        Move stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddForm && (
        <ItemForm
          close={() =>
            setShowAddForm(false)
          }
          done={() => {
            setShowAddForm(false);
            loadInventory();
          }}
        />
      )}

      {selectedItem && (
        <MovementForm
          item={selectedItem}
          close={() =>
            setSelectedItem(null)
          }
          done={() => {
            setSelectedItem(null);
            loadInventory();
          }}
        />
      )}
    </>
  );
}

/* =========================================================
   ADD INVENTORY ITEM
========================================================= */

function ItemForm({
  close,
  done,
}) {
  const [form, setForm] = useState({
    name: "",
    category: "Paper",
    brand: "",
    unit: "Piece",
    current_quantity: 0,
    minimum_stock_level: 5,
    cost_per_unit: 0,
    supplier: "",
    storage_location: "",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fields = [
    {
      label: "Item name",
      name: "name",
      type: "text",
      required: true,
    },
    {
      label: "Category",
      name: "category",
      type: "text",
      required: true,
    },
    {
      label: "Brand",
      name: "brand",
      type: "text",
    },
    {
      label: "Unit",
      name: "unit",
      type: "text",
      required: true,
    },
    {
      label: "Current quantity",
      name: "current_quantity",
      type: "number",
      required: true,
    },
    {
      label: "Minimum stock level",
      name: "minimum_stock_level",
      type: "number",
      required: true,
    },
    {
      label: "Cost per unit",
      name: "cost_per_unit",
      type: "number",
      required: true,
    },
    {
      label: "Supplier",
      name: "supplier",
      type: "text",
    },
    {
      label: "Storage location",
      name: "storage_location",
      type: "text",
    },
    {
      label: "Notes",
      name: "notes",
      type: "text",
      fullWidth: true,
    },
  ];

  function updateField(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function saveItem(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      await api("/inventory", {
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
      title="Add Inventory Item"
      onClose={close}
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={saveItem}
      >
        {error && (
          <p
            className="
              rounded-xl bg-red-50
              p-3 text-sm text-red-700
              sm:col-span-2
            "
          >
            {error}
          </p>
        )}

        {fields.map((field) => (
          <div
            key={field.name}
            className={
              field.fullWidth
                ? "sm:col-span-2"
                : ""
            }
          >
            <label htmlFor={field.name}>
              {field.label}
            </label>

            <input
              id={field.name}
              name={field.name}
              type={field.type}
              value={form[field.name]}
              onChange={updateField}
              min={
                field.type === "number"
                  ? "0"
                  : undefined
              }
              step={
                field.name === "cost_per_unit"
                  ? "0.01"
                  : "1"
              }
              required={field.required}
            />
          </div>
        ))}

        <div
          className="
            flex justify-end gap-3
            sm:col-span-2
          "
        >
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
              : "Save Item"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* =========================================================
   INVENTORY MOVEMENT
========================================================= */

function MovementForm({
  item,
  close,
  done,
}) {
  const [form, setForm] = useState({
    type: "Restock",
    quantity: 1,
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const movementTypes = [
    "Restock",
    "Usage",
    "Adjustment",
    "Damaged",
    "Wasted",
    "Returned",
  ];

  function updateField(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function saveMovement(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      await api(
        `/inventory/${item.id}/movements`,
        {
          method: "POST",
          body: JSON.stringify(form),
        },
      );

      done();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Update ${item.name}`}
      onClose={close}
    >
      <form
        className="space-y-4"
        onSubmit={saveMovement}
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

        <p
          className="
            rounded-xl bg-slate-50
            p-3 text-sm
            dark:bg-slate-800
          "
        >
          Current quantity:{" "}

          <strong>
            {item.current_quantity} {item.unit}
          </strong>
        </p>

        <div>
          <label htmlFor="movement-type">
            Movement type
          </label>

          <select
            id="movement-type"
            name="type"
            value={form.type}
            onChange={updateField}
          >
            {movementTypes.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="movement-quantity">
            Quantity
          </label>

          <input
            id="movement-quantity"
            name="quantity"
            type="number"
            min="0.01"
            step="0.01"
            value={form.quantity}
            onChange={updateField}
            required
          />
        </div>

        <div>
          <label htmlFor="movement-notes">
            Notes
          </label>

          <textarea
            id="movement-notes"
            name="notes"
            rows="3"
            value={form.notes}
            onChange={updateField}
            placeholder="Enter movement notes"
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
              ? "Recording..."
              : "Record Movement"}
          </button>
        </div>
      </form>
    </Modal>
  );
}