import {
  Inbox,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";

/**
 * Loading indicator displayed while data is being fetched.
 */
export function Loading() {
  return (
    <div className="flex min-h-52 items-center justify-center">
      <LoaderCircle className="animate-spin text-brand" />
    </div>
  );
}

/**
 * Displayed when a table or page has no records.
 */
export function Empty({ text = "No records found." }) {
  return (
    <div className="py-14 text-center text-slate-500">
      <Inbox
        className="mx-auto mb-3"
        size={36}
      />

      <p>{text}</p>
    </div>
  );
}

/**
 * Displays the appropriate color for a record's status.
 */
export function StatusBadge({ status }) {
  let colorClass = "bg-blue-100 text-blue-700";

  const successStatuses = [
    "Completed",
    "Paid",
    "In Stock",
    "Active",
    "Approved",
    "Ready for Pickup",
  ];

  const dangerStatuses = [
    "Cancelled",
    "Rejected",
    "Out of Stock",
    "Suspended",
    "Archived",
  ];

  const warningStatuses = [
    "Pending",
    "Low Stock",
    "Waiting for Payment",
    "Payment Under Review",
  ];

  if (successStatuses.includes(status)) {
    colorClass = "bg-green-100 text-green-700";
  } else if (dangerStatuses.includes(status)) {
    colorClass = "bg-red-100 text-red-700";
  } else if (warningStatuses.includes(status)) {
    colorClass = "bg-orange-100 text-orange-700";
  }

  return (
    <span className={`badge ${colorClass}`}>
      {status}
    </span>
  );
}

/**
 * Reusable modal window.
 */
export function Modal({
  title,
  onClose,
  children,
}) {
  return (
    <div
      className="
        fixed inset-0 z-50
        grid place-items-center
        bg-slate-950/60 p-4
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="
          max-h-[90vh] w-full max-w-xl
          overflow-y-auto rounded-2xl
          bg-white p-6 shadow-2xl
          dark:bg-slate-900
        "
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2
            id="modal-title"
            className="text-xl font-bold"
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="
              rounded-lg p-1
              text-slate-500
              hover:bg-slate-100
              hover:text-slate-900
              dark:hover:bg-slate-800
              dark:hover:text-white
            "
          >
            <X />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/**
 * Reusable search input.
 */
export function SearchBox({
  value,
  onChange,
}) {
  return (
    <div className="relative">
      <Search
        className="
          pointer-events-none
          absolute left-3 top-1/2
          -translate-y-1/2
          text-slate-400
        "
        size={18}
      />

      <input
        type="search"
        className="pl-10"
        placeholder="Search records..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Search records"
      />
    </div>
  );
}

/**
 * Reusable title section displayed at the top of a page.
 */
export function PageTitle({
  title,
  subtitle,
  action,
}) {
  return (
    <div
      className="
        mb-6 flex flex-wrap
        items-center justify-between
        gap-3
      "
    >
      <div>
        <h1 className="text-2xl font-bold">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}