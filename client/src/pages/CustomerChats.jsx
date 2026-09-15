import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Inbox,
  MessageCircle,
  RefreshCw,
  Send,
  User,
} from "lucide-react";

import { api, dt } from "../lib/api";
import {
  Loading,
  PageTitle,
} from "../components/UI";

export default function CustomerChats() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConversation, setSelectedConversation] =
    useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] =
    useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  async function loadConversations(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const data = await api("/admin/chats");
      setConversations(data);

      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(
    conversationId,
    showLoading = false,
  ) {
    if (!conversationId) {
      return;
    }

    if (showLoading) {
      setLoadingMessages(true);
    }

    try {
      const data = await api(
        `/admin/chats/${conversationId}/messages`,
      );

      setSelectedConversation(data.conversation);
      setMessages(data.messages);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    loadConversations(true);

    const timer = window.setInterval(() => {
      loadConversations();
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    loadMessages(selectedId, true);

    const timer = window.setInterval(() => {
      loadMessages(selectedId);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function sendReply(event) {
    event.preventDefault();

    const message = reply.trim();

    if (!message || !selectedId || sending) {
      return;
    }

    setSending(true);
    setError("");

    try {
      await api(`/admin/chats/${selectedId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          message,
        }),
      });

      setReply("");

      await Promise.all([
        loadMessages(selectedId),
        loadConversations(),
      ]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status) {
    if (!selectedId) {
      return;
    }

    try {
      await api(`/admin/chats/${selectedId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
        }),
      });

      setSelectedConversation((current) => ({
        ...current,
        status,
      }));

      await loadConversations();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function selectConversation(id) {
    setSelectedId(id);
  }

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <PageTitle
        title="Customer Chats"
        subtitle="Read customer questions and send replies."
        action={
          <button
            type="button"
            className="btn-light"
            onClick={() => loadConversations(true)}
          >
            <RefreshCw size={17} />

            Refresh
          </button>
        }
      />

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid min-h-[650px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[340px_1fr]">
        {/* Conversation list */}
        <aside className="border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="font-bold">
              Conversations
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {conversations.length} customer conversation
              {conversations.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto lg:max-h-[570px]">
            {conversations.length === 0 ? (
              <div className="grid min-h-60 place-items-center p-6 text-center text-slate-500">
                <div>
                  <Inbox
                    className="mx-auto mb-3"
                    size={36}
                  />

                  <p className="font-medium">
                    No customer messages yet
                  </p>

                  <p className="mt-1 text-sm">
                    New messages will appear here.
                  </p>
                </div>
              </div>
            ) : (
              conversations.map((conversation) => {
                const active =
                  selectedId === conversation.id;

                return (
                  <button
                    type="button"
                    key={conversation.id}
                    onClick={() =>
                      selectConversation(conversation.id)
                    }
                    className={`w-full border-b border-slate-100 p-4 text-left transition dark:border-slate-800 ${
                      active
                        ? "bg-blue-50 dark:bg-blue-950/40"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cyan font-bold text-navy">
                        {conversation.customer_name?.[0]?.toUpperCase() ||
                          "C"}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-semibold">
                            {conversation.customer_name}
                          </p>

                          {Number(
                            conversation.unread_count,
                          ) > 0 && (
                            <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 truncate text-sm text-slate-500">
                          {conversation.last_message ||
                            "No messages yet"}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              conversation.status === "Open"
                                ? "bg-green-100 text-green-700"
                                : conversation.status ===
                                    "Waiting"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {conversation.status}
                          </span>

                          {conversation.last_message_at && (
                            <span className="text-[11px] text-slate-400">
                              {dt(
                                conversation.last_message_at,
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Selected conversation */}
        <section className="flex min-h-[500px] flex-col">
          {!selectedId ? (
            <div className="grid flex-1 place-items-center p-8 text-center text-slate-500">
              <div>
                <MessageCircle
                  className="mx-auto mb-4 text-brand"
                  size={48}
                />

                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Select a conversation
                </h2>

                <p className="mt-2 text-sm">
                  Choose a customer from the list to see
                  their messages.
                </p>
              </div>
            </div>
          ) : loadingMessages ? (
            <Loading />
          ) : (
            <>
              {/* Chat header */}
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-cyan text-navy">
                    <User size={20} />
                  </span>

                  <div>
                    <h2 className="font-bold">
                      {selectedConversation?.customer_name}
                    </h2>

                    <p className="text-sm text-slate-500">
                      {selectedConversation?.customer_email}
                    </p>
                  </div>
                </div>

                <select
                  className="w-auto min-w-32"
                  value={
                    selectedConversation?.status || "Open"
                  }
                  onChange={(event) =>
                    changeStatus(event.target.value)
                  }
                >
                  <option value="Open">Open</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Closed">Closed</option>
                </select>
              </header>

              {/* Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950/50 sm:p-6">
                {messages.length === 0 ? (
                  <div className="grid h-full place-items-center text-center text-slate-500">
                    <p>No messages in this conversation.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const fromAdmin =
                      message.sender_role === "admin";

                    const fromAssistant =
                      message.sender_role === "assistant";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          fromAdmin
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                            fromAdmin
                              ? "rounded-br-md bg-brand text-white"
                              : fromAssistant
                                ? "rounded-bl-md bg-cyan/20 text-slate-800 dark:text-slate-100"
                                : "rounded-bl-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm">
                            {message.message}
                          </p>

                          <div
                            className={`mt-2 flex items-center gap-2 text-[11px] ${
                              fromAdmin
                                ? "text-blue-100"
                                : "text-slate-400"
                            }`}
                          >
                            <span>
                              {fromAdmin
                                ? "You"
                                : fromAssistant
                                  ? "PrintHub Assistant"
                                  : message.sender_name ||
                                    "Customer"}
                            </span>

                            <span>•</span>

                            <span>
                              {dt(message.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Reply form */}
              <form
                onSubmit={sendReply}
                className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                {selectedConversation?.status ===
                "Closed" ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
                    <p className="text-sm text-slate-500">
                      This conversation is closed.
                    </p>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => changeStatus("Open")}
                    >
                      Reopen Conversation
                    </button>
                  </div>
                ) : (
                  <div className="flex items-end gap-3">
                    <textarea
                      rows="2"
                      value={reply}
                      onChange={(event) =>
                        setReply(event.target.value)
                      }
                      placeholder="Write your reply..."
                      className="resize-none"
                      maxLength={2000}
                    />

                    <button
                      type="submit"
                      className="btn-primary shrink-0 !p-3"
                      disabled={!reply.trim() || sending}
                      aria-label="Send reply"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}