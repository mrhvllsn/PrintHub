import {
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
} from "lucide-react";

import {
  api,
  peso,
} from "../lib/api";

import { PageTitle } from "../components/UI";

/* =========================================================
   INITIAL ORDER VALUES
========================================================= */

const initialOrder = {
  document_title: "",
  paper_size: "A4",
  paper_type: "Bond Paper",
  print_color: "Black and White",
  print_sides: "Single-sided",
  orientation: "Portrait",
  pages: 1,
  copies: 1,
  binding_option: "None",
  finishing_option: "None",
  instructions: "",
  fulfillment_method: "Shop Pickup",
  pickup_at: "",
  delivery_address: "",
  payment_method: "Cash on Pickup",
  priority: "Normal",
};

/* =========================================================
   NEW PRINT ORDER PAGE
========================================================= */

export default function NewOrder() {
  const navigate = useNavigate();

  const [form, setForm] =
    useState(initialOrder);

  const [documentFile, setDocumentFile] =
    useState();

  const [paymentProof, setPaymentProof] =
    useState();

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     PRICE CALCULATION
  ======================================================= */

  const estimatedPrice = useMemo(() => {
    const colorPrice =
      form.print_color === "Colored"
        ? 8
        : 2;

    const paperPrices = {
      "Bond Paper": 0,
      "Glossy Paper": 10,
      "Photo Paper": 18,
      Cardstock: 12,
      "Sticker Paper": 20,
      "Specialty Paper": 25,
    };

    const bindingPrices = {
      None: 0,
      "Spiral Binding": 45,
      "Book Binding": 70,
      Stapling: 5,
    };

    const finishingPrices = {
      None: 0,
      Lamination: 30,
      Cutting: 10,
    };

    const paperPrice =
      paperPrices[form.paper_type] || 0;

    const bindingPrice =
      bindingPrices[form.binding_option] || 0;

    const finishingPrice =
      finishingPrices[form.finishing_option] || 0;

    const deliveryFee =
      form.fulfillment_method === "Delivery"
        ? 80
        : 0;

    const rushFee =
      form.priority === "Rush"
        ? 50
        : 0;

    const printingPrice =
      (colorPrice + paperPrice) *
      Number(form.pages) *
      Number(form.copies);

    return (
      printingPrice +
      bindingPrice +
      finishingPrice +
      deliveryFee +
      rushFee
    );
  }, [form]);

  function updateField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function goToNextStep() {
    setError("");

    if (
      step === 1 &&
      (!documentFile ||
        !form.document_title.trim())
    ) {
      setError(
        "Please upload a document and enter its title.",
      );

      return;
    }

    if (
      step === 2 &&
      form.fulfillment_method === "Delivery" &&
      !form.delivery_address.trim()
    ) {
      setError(
        "Please enter the delivery address.",
      );

      return;
    }

    setStep((currentStep) =>
      Math.min(currentStep + 1, 3),
    );
  }

  function goToPreviousStep() {
    setError("");

    setStep((currentStep) =>
      Math.max(currentStep - 1, 1),
    );
  }

  async function submitOrder() {
    if (!documentFile) {
      setError("Please select a document.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append(
        "document",
        documentFile,
      );

      if (paymentProof) {
        formData.append(
          "proof",
          paymentProof,
        );
      }

      formData.append(
        "data",
        JSON.stringify({
          ...form,
          estimated_price: estimatedPrice,
        }),
      );

      const result = await api("/orders", {
        method: "POST",
        body: formData,
      });

      alert(
        `Order ${result.order_number} submitted successfully!`,
      );

      navigate("/orders");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const orderSummary = [
    ["Document", form.document_title],
    ["File", documentFile?.name],
    [
      "Paper",
      `${form.paper_size} · ${form.paper_type}`,
    ],
    [
      "Printing",
      `${form.print_color} · ${form.print_sides}`,
    ],
    [
      "Quantity",
      `${form.pages} pages × ${form.copies} copies`,
    ],
    ["Binding", form.binding_option],
    ["Finishing", form.finishing_option],
    ["Fulfillment", form.fulfillment_method],
    ["Payment", form.payment_method],
    ["Priority", form.priority],
  ];

  return (
    <>
      <PageTitle
        title="New Print Order"
        subtitle={`Step ${step} of 3 — configure and review your print request.`}
      />

      <div className="card mx-auto max-w-4xl">
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

        {/* Step 1: Printing configuration */}
        {step === 1 && (
          <div className="space-y-5">
            <FileDrop
              label="Print document"
              file={documentFile}
              setFile={setDocumentFile}
            />

            <div>
              <label htmlFor="document-title">
                Document title
              </label>

              <input
                id="document-title"
                type="text"
                value={form.document_title}
                onChange={(event) =>
                  updateField(
                    "document_title",
                    event.target.value,
                  )
                }
                placeholder="Example: Research Chapter 1"
                required
              />
            </div>

            <div
              className="
                grid gap-4
                sm:grid-cols-2
                lg:grid-cols-3
              "
            >
              <SelectField
                label="Paper size"
                field="paper_size"
                form={form}
                updateField={updateField}
                options={[
                  "A4",
                  "Letter",
                  "Legal",
                  "Short",
                  "Long",
                  "A3",
                ]}
              />

              <SelectField
                label="Paper type"
                field="paper_type"
                form={form}
                updateField={updateField}
                options={[
                  "Bond Paper",
                  "Glossy Paper",
                  "Photo Paper",
                  "Cardstock",
                  "Sticker Paper",
                  "Specialty Paper",
                ]}
              />

              <SelectField
                label="Print color"
                field="print_color"
                form={form}
                updateField={updateField}
                options={[
                  "Black and White",
                  "Colored",
                ]}
              />

              <SelectField
                label="Print sides"
                field="print_sides"
                form={form}
                updateField={updateField}
                options={[
                  "Single-sided",
                  "Double-sided",
                ]}
              />

              <SelectField
                label="Orientation"
                field="orientation"
                form={form}
                updateField={updateField}
                options={[
                  "Portrait",
                  "Landscape",
                ]}
              />

              <SelectField
                label="Priority"
                field="priority"
                form={form}
                updateField={updateField}
                options={[
                  "Normal",
                  "Rush",
                ]}
              />

              <NumberField
                label="Number of pages"
                field="pages"
                form={form}
                updateField={updateField}
              />

              <NumberField
                label="Number of copies"
                field="copies"
                form={form}
                updateField={updateField}
              />
            </div>
          </div>
        )}

        {/* Step 2: Fulfillment and payment */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Binding"
                field="binding_option"
                form={form}
                updateField={updateField}
                options={[
                  "None",
                  "Spiral Binding",
                  "Book Binding",
                  "Stapling",
                ]}
              />

              <SelectField
                label="Finishing"
                field="finishing_option"
                form={form}
                updateField={updateField}
                options={[
                  "None",
                  "Lamination",
                  "Cutting",
                ]}
              />

              <SelectField
                label="Fulfillment"
                field="fulfillment_method"
                form={form}
                updateField={updateField}
                options={[
                  "Shop Pickup",
                  "Delivery",
                ]}
              />

              <SelectField
                label="Payment method"
                field="payment_method"
                form={form}
                updateField={updateField}
                options={[
                  "Cash",
                  "GCash",
                  "Maya",
                  "Bank Transfer",
                  "Cash on Pickup",
                ]}
              />

              <div>
                <label htmlFor="pickup-date">
                  Preferred date and time
                </label>

                <input
                  id="pickup-date"
                  type="datetime-local"
                  value={form.pickup_at}
                  onChange={(event) =>
                    updateField(
                      "pickup_at",
                      event.target.value,
                    )
                  }
                />
              </div>

              {form.fulfillment_method ===
                "Delivery" && (
                <div>
                  <label htmlFor="delivery-address">
                    Delivery address
                  </label>

                  <input
                    id="delivery-address"
                    type="text"
                    value={
                      form.delivery_address
                    }
                    onChange={(event) =>
                      updateField(
                        "delivery_address",
                        event.target.value,
                      )
                    }
                    required
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="instructions">
                Special instructions
              </label>

              <textarea
                id="instructions"
                rows="3"
                value={form.instructions}
                onChange={(event) =>
                  updateField(
                    "instructions",
                    event.target.value,
                  )
                }
                placeholder="Tell the shop about special page ranges or finishing..."
              />
            </div>

            <FileDrop
              label="Proof of payment (optional)"
              file={paymentProof}
              setFile={setPaymentProof}
              accept=".jpg,.jpeg,.jfif,.png,.webp,.pdf"
              description="JPG, PNG, WebP or PDF · maximum 20 MB"
            />
          </div>
        )}

        {/* Step 3: Order review */}
        {step === 3 && (
          <div>
            <div
              className="
                mb-5 flex items-center gap-3
                rounded-xl bg-green-50
                p-4 text-green-700
              "
            >
              <CheckCircle2 />

              <div>
                <p className="font-semibold">
                  Ready to submit
                </p>

                <p className="text-sm">
                  Check your order details below.
                </p>
              </div>
            </div>

            <div
              className="
                grid gap-3 rounded-xl
                bg-slate-50 p-5 text-sm
                dark:bg-slate-800
                sm:grid-cols-2
              "
            >
              {orderSummary.map(
                ([label, value]) => (
                  <p key={label}>
                    <span className="text-slate-500">
                      {label}
                    </span>

                    <br />

                    <strong>
                      {value || "Not provided"}
                    </strong>
                  </p>
                ),
              )}
            </div>

            <div
              className="
                mt-5 flex flex-col gap-4
                rounded-xl bg-blue-50 p-5
                dark:bg-blue-950
                sm:flex-row sm:items-center
                sm:justify-between
              "
            >
              <div>
                <p className="text-sm text-slate-500">
                  Estimated total
                </p>

                <p className="text-3xl font-black text-brand">
                  {peso(estimatedPrice)}
                </p>
              </div>

              <p
                className="
                  max-w-xs text-xs
                  text-slate-500
                  sm:text-right
                "
              >
                The administrator may confirm or
                adjust the final amount after
                reviewing your file.
              </p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-7 flex justify-between gap-3">
          <button
            type="button"
            className="btn-light"
            disabled={step === 1 || busy}
            onClick={goToPreviousStep}
          >
            <ChevronLeft size={18} />

            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              className="btn-primary"
              onClick={goToNextStep}
            >
              Continue

              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={submitOrder}
            >
              {busy
                ? "Submitting..."
                : "Submit Print Order"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  field,
  form,
  updateField,
  options,
}) {
  return (
    <div>
      <label htmlFor={field}>
        {label}
      </label>

      <select
        id={field}
        value={form[field]}
        onChange={(event) =>
          updateField(
            field,
            event.target.value,
          )
        }
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

/* =========================================================
   NUMBER FIELD
========================================================= */

function NumberField({
  label,
  field,
  form,
  updateField,
}) {
  return (
    <div>
      <label htmlFor={field}>
        {label}
      </label>

      <input
        id={field}
        type="number"
        min="1"
        value={form[field]}
        onChange={(event) =>
          updateField(
            field,
            event.target.value,
          )
        }
        required
      />
    </div>
  );
}

/* =========================================================
   FILE UPLOAD AREA
========================================================= */

function FileDrop({
  label,
  file,
  setFile,
  accept = ".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.jfif,.png,.webp",
  description = "PDF, Office files, JPG or PNG · maximum 20 MB",
}) {
  return (
    <label
      className="
        grid cursor-pointer
        place-items-center rounded-2xl
        border-2 border-dashed
        border-slate-300 p-8
        text-center transition
        hover:border-brand
        dark:border-slate-700
      "
    >
      <UploadCloud
        className="mb-2 text-brand"
        size={34}
      />

      <strong>
        {file?.name || label}
      </strong>

      <span className="mt-1 text-xs text-slate-500">
        {description}
      </span>

      <input
        className="hidden"
        type="file"
        accept={accept}
        onChange={(event) =>
          setFile(event.target.files?.[0])
        }
      />
    </label>
  );
}