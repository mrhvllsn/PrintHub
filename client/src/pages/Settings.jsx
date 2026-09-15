import {
  useEffect,
  useState,
} from "react";

import { api } from "../lib/api";

import {
  Loading,
  PageTitle,
} from "../components/UI";

export default function Settings() {
  const [form, setForm] = useState();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("");

  const [saving, setSaving] = useState(false);

  /* =======================================================
     LOAD SHOP SETTINGS
  ======================================================= */

  useEffect(() => {
    api("/settings")
      .then(setForm)
      .catch((error) => {
        setMessage(error.message);
        setMessageType("error");
      });
  }, []);

  if (!form) {
    return <Loading />;
  }

  /* =======================================================
     SETTINGS FIELDS
  ======================================================= */

  const fields = [
    {
      label: "Shop name",
      name: "shop_name",
      type: "text",
      required: true,
    },
    {
      label: "Address",
      name: "address",
      type: "text",
      fullWidth: true,
    },
    {
      label: "Contact number",
      name: "phone",
      type: "tel",
    },
    {
      label: "Email",
      name: "email",
      type: "email",
    },
    {
      label: "Business hours",
      name: "business_hours",
      type: "text",
    },
    {
      label: "Pickup schedule",
      name: "pickup_schedule",
      type: "text",
    },
    {
      label: "Maximum upload (MB)",
      name: "max_upload_mb",
      type: "number",
      min: 1,
    },
    {
      label: "Tax percentage",
      name: "tax_percentage",
      type: "number",
      min: 0,
      step: "0.01",
    },
    {
      label: "Delivery fee",
      name: "delivery_fee",
      type: "number",
      min: 0,
      step: "0.01",
    },
    {
      label: "Terms and conditions",
      name: "terms",
      type: "textarea",
      fullWidth: true,
    },
    {
      label: "Receipt footer",
      name: "receipt_footer",
      type: "text",
      fullWidth: true,
    },
  ];

  /* =======================================================
     UPDATE FIELD
  ======================================================= */

  function updateField(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setMessage("");
    setMessageType("");
  }

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  async function saveSettings(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setMessageType("");

    try {
      await api("/settings", {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      setMessage(
        "Shop settings saved successfully.",
      );

      setMessageType("success");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageTitle
        title="Shop Settings"
        subtitle="Control the business information used across PrintHub."
      />

      <form
        className="card mx-auto max-w-4xl"
        onSubmit={saveSettings}
      >
        {message && (
          <p
            className={`
              mb-5 rounded-xl
              p-3 text-sm
              ${
                messageType === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }
            `}
          >
            {message}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
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

              {field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  rows="4"
                  value={form[field.name] || ""}
                  onChange={updateField}
                  required={field.required}
                />
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  value={form[field.name] ?? ""}
                  onChange={updateField}
                  min={field.min}
                  step={field.step}
                  required={field.required}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Save Settings"}
          </button>
        </div>
      </form>
    </>
  );
}