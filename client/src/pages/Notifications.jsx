import {
  useEffect,
  useState,
} from "react";

import {
  api,
  dt,
} from "../lib/api";

import {
  Empty,
  Loading,
  PageTitle,
} from "../components/UI";

export default function Notifications() {
  const [notifications, setNotifications] =
    useState();

  const [error, setError] = useState("");

  function loadNotifications() {
    setError("");

    api("/notifications")
      .then(setNotifications)
      .catch((requestError) => {
        setNotifications([]);
        setError(requestError.message);
      });
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAsRead(notificationId) {
    try {
      await api(
        `/notifications/${notificationId}/read`,
        {
          method: "PATCH",
        },
      );

      loadNotifications();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!notifications) {
    return <Loading />;
  }

  return (
    <>
      <PageTitle
        title="Notifications"
        subtitle="Order, payment, and inventory updates."
      />

      <div
        className="
          card divide-y divide-slate-100
          !p-0 dark:divide-slate-800
        "
      >
        {error && (
          <p
            className="
              m-4 rounded-xl
              bg-red-50 p-3
              text-sm text-red-700
            "
          >
            {error}
          </p>
        )}

        {!notifications.length ? (
          <Empty text="You have no notifications." />
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() =>
                markAsRead(notification.id)
              }
              className={`
                block w-full p-4
                text-left transition
                hover:bg-slate-50
                dark:hover:bg-slate-800/60
                ${
                  !notification.is_read
                    ? "bg-blue-50/70 dark:bg-blue-950/30"
                    : ""
                }
              `}
            >
              <div
                className="
                  flex items-start
                  justify-between gap-4
                "
              >
                <div className="flex items-center gap-2">
                  {!notification.is_read && (
                    <span
                      className="
                        h-2 w-2 flex-shrink-0
                        rounded-full bg-brand
                      "
                    />
                  )}

                  <strong>
                    {notification.title}
                  </strong>
                </div>

                <span
                  className="
                    whitespace-nowrap
                    text-xs text-slate-400
                  "
                >
                  {dt(notification.created_at)}
                </span>
              </div>

              <p
                className="
                  mt-1 text-sm
                  text-slate-500
                "
              >
                {notification.message}
              </p>
            </button>
          ))
        )}
      </div>
    </>
  );
}