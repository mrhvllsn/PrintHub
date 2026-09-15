export const API = "/api";

/**
 * Sends requests to the PrintHub backend.
 */
export async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData
      ? {}
      : {
          "Content-Type": "application/json",
        }),
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    throw new Error(
      data.message || "Something went wrong.",
    );
  }

  return data;
}

/**
 * Converts a number into Philippine peso format.
 *
 * Example:
 * 1000 becomes ₱1,000.00
 */
export function peso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));
}

/**
 * Displays dates using Philippine date and time.
 */
export function dt(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}