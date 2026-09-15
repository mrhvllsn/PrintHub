export const API = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");

export function apiFileUrl(path) {
  const cleanPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${API}${cleanPath}`;
}

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : {
          "Content-Type": "application/json",
        }),
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const cleanPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const response = await fetch(
    `${API}${cleanPath}`,
    {
      ...options,
      headers,
    },
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "Something went wrong.",
    );
  }

  return data;
}

export function peso(number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(number || 0));
}

export function dt(date) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(date));
}