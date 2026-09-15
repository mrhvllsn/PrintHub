import {
  useEffect,
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
} from "../components/UI";

/* =========================================================
   SERVICES AND PRICING PAGE
========================================================= */

export default function Services() {
  const [services, setServices] = useState();
  const [showForm, setShowForm] =
    useState(false);

  const [error, setError] = useState("");

  function loadServices() {
    setError("");

    api("/services")
      .then(setServices)
      .catch((requestError) => {
        setServices([]);
        setError(requestError.message);
      });
  }

  useEffect(() => {
    loadServices();
  }, []);

  if (!services) {
    return <Loading />;
  }

  return (
    <>
      <PageTitle
        title="Services & Pricing"
        subtitle="Manage printing and finishing services."
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowForm(true)}
          >
            <Plus size={18} />

            Add Service
          </button>
        }
      />

      {error && (
        <p
          className="
            mb-5 rounded-xl
            bg-red-50 p-3
            text-sm text-red-700
          "
        >
          {error}
        </p>
      )}

      {!services.length ? (
        <div className="card">
          <Empty text="No printing services found." />
        </div>
      ) : (
        <div
          className="
            grid gap-4
            sm:grid-cols-2
            xl:grid-cols-3
          "
        >
          {services.map((service) => (
            <div
              key={service.id}
              className="card"
            >
              <div
                className="
                  flex items-start
                  justify-between gap-3
                "
              >
                <div>
                  <p
                    className="
                      text-xs font-semibold
                      uppercase tracking-wide
                      text-brand
                    "
                  >
                    {service.category}
                  </p>

                  <h2 className="mt-1 text-lg font-bold">
                    {service.name}
                  </h2>
                </div>

                <strong
                  className="
                    whitespace-nowrap
                    text-xl text-brand
                  "
                >
                  {peso(service.base_price)}
                </strong>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                {service.description ||
                  "No description"}
              </p>

              <p className="mt-4 text-xs text-slate-400">
                {service.calculation_type} · About{" "}
                {service.completion_minutes} minutes
              </p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ServiceForm
          close={() => setShowForm(false)}
          done={() => {
            setShowForm(false);
            loadServices();
          }}
        />
      )}
    </>
  );
}

/* =========================================================
   ADD PRINTING SERVICE FORM
========================================================= */

function ServiceForm({
  close,
  done,
}) {
  const [form, setForm] = useState({
    name: "",
    category: "Document",
    description: "",
    base_price: 0,
    calculation_type: "Per page",
    completion_minutes: 60,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function saveService(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      await api("/services", {
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
      title="Add Printing Service"
      onClose={close}
    >
      <form
        className="space-y-4"
        onSubmit={saveService}
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
          <label htmlFor="service-name">
            Service name
          </label>

          <input
            id="service-name"
            name="name"
            type="text"
            value={form.name}
            onChange={updateField}
            placeholder="Example: Colored printing"
            required
          />
        </div>

        <div>
          <label htmlFor="service-category">
            Category
          </label>

          <select
            id="service-category"
            name="category"
            value={form.category}
            onChange={updateField}
          >
            <option value="Document">
              Document
            </option>

            <option value="Photo">
              Photo
            </option>

            <option value="Binding">
              Binding
            </option>

            <option value="Finishing">
              Finishing
            </option>

            <option value="Other">
              Other
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="service-description">
            Description
          </label>

          <textarea
            id="service-description"
            name="description"
            rows="3"
            value={form.description}
            onChange={updateField}
            placeholder="Describe the printing service"
          />
        </div>

        <div>
          <label htmlFor="base-price">
            Base price
          </label>

          <input
            id="base-price"
            name="base_price"
            type="number"
            min="0"
            step="0.01"
            value={form.base_price}
            onChange={updateField}
            required
          />
        </div>

        <div>
          <label htmlFor="calculation-type">
            Price calculation type
          </label>

          <select
            id="calculation-type"
            name="calculation_type"
            value={form.calculation_type}
            onChange={updateField}
          >
            <option value="Per page">
              Per page
            </option>

            <option value="Per sheet">
              Per sheet
            </option>

            <option value="Per item">
              Per item
            </option>

            <option value="Fixed">
              Fixed price
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="completion-minutes">
            Estimated completion time
          </label>

          <div className="relative">
            <input
              id="completion-minutes"
              name="completion_minutes"
              type="number"
              min="1"
              value={form.completion_minutes}
              onChange={updateField}
              className="pr-20"
              required
            />

            <span
              className="
                pointer-events-none
                absolute right-3 top-1/2
                -translate-y-1/2
                text-sm text-slate-500
              "
            >
              minutes
            </span>
          </div>
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
              : "Save Service"}
          </button>
        </div>
      </form>
    </Modal>
  );
}