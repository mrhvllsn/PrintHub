import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bot,
  Headphones,
  MessageCircle,
  Send,
  User,
  X,
} from "lucide-react";

import {
  api,
  dt,
} from "../lib/api";

const QUICK_QUESTIONS = [
  "How much is colored printing?",
  "What files can I upload?",
  "What payment methods are accepted?",
  "What are your business hours?",
];

function createLocalMessage(sender, text) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    sender_role: sender,
    message: text,
    created_at: new Date(),
  };
}

function getAutomaticAnswer(question) {
  const message = question.toLowerCase();

  if (
    message.includes("hello") ||
    message.includes("hi")
  ) {
    return "Hello! How can I help you with your printing order?";
  }

  if (
    message.includes("colored") ||
    message.includes("color printing")
  ) {
    return "Colored printing starts at ₱8.00 per page. The price may change depending on the paper type, size, and number of copies.";
  }

  if (
    message.includes("black and white") ||
    message.includes("black-and-white")
  ) {
    return "Black-and-white printing starts at ₱2.00 per page.";
  }

  if (
    message.includes("file") ||
    message.includes("upload")
  ) {
    return "You can upload PDF, DOC, DOCX, PPT, PPTX, JPG, JPEG, and PNG files. The maximum file size is 20 MB.";
  }

  if (
    message.includes("payment") ||
    message.includes("pay")
  ) {
    return "PrintHub accepts Cash, GCash, Maya, Bank Transfer, and Cash on Pickup.";
  }

  if (
    message.includes("business hours") ||
    message.includes("open") ||
    message.includes("closing")
  ) {
    return "PrintHub is open from Monday to Saturday, 8:00 AM to 6:00 PM.";
  }

  if (
    message.includes("binding") ||
    message.includes("spiral")
  ) {
    return "PrintHub offers spiral binding, book binding, and stapling services.";
  }

  if (message.includes("delivery")) {
    return "Delivery is available. The starting delivery fee is ₱80.00 and may depend on your location.";
  }

  if (
    message.includes("order") &&
    message.includes("status")
  ) {
    return "You can check your order status on the My Orders page. You can also select Talk to Admin if you need help with a specific order.";
  }

  if (message.includes("cancel")) {
    return "You may cancel an order while it is still Pending. Open My Orders and select your order.";
  }

  if (message.includes("thank")) {
    return "You’re welcome! Let me know if you have another printing question.";
  }

  return "I’m sorry, I do not have a prepared answer for that question. Select Talk to Admin so a PrintHub administrator can assist you.";
}

export default function FloatingChat() {
  const [isOpen, setIsOpen] =
    useState(false);

  const [connectedToAdmin, setConnectedToAdmin] =
    useState(false);

  const [conversation, setConversation] =
    useState(null);

  const [messages, setMessages] = useState([
    createLocalMessage(
      "assistant",
      "Hello! I’m the PrintHub Assistant. How can I help you today?",
    ),
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const messageContainerRef =
    useRef(null);

  function scrollToLatestMessage() {
    window.setTimeout(() => {
      if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop =
          messageContainerRef.current.scrollHeight;
      }
    }, 50);
  }

  useEffect(() => {
    scrollToLatestMessage();
  }, [messages, isTyping]);

  /* Check for administrator replies every five seconds. */
  useEffect(() => {
    if (
      !connectedToAdmin ||
      !isOpen
    ) {
      return undefined;
    }

    const interval = window.setInterval(
      () => {
        loadAdminConversation(false);
      },
      5000,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [connectedToAdmin, isOpen]);

  async function loadAdminConversation(
    showLoading = true,
  ) {
    if (showLoading) {
      setLoading(true);
    }

    setError("");

    try {
      const data = await api(
        "/chat/conversation",
      );

      setConversation(data.conversation);
      setMessages(data.messages || []);
      setConnectedToAdmin(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function connectToAdmin() {
    await loadAdminConversation(true);
  }

  function sendAutomaticQuestion(question) {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || isTyping) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      createLocalMessage(
        "customer",
        cleanQuestion,
      ),
    ]);

    setInput("");
    setIsTyping(true);

    window.setTimeout(() => {
      setMessages((currentMessages) => [
        ...currentMessages,
        createLocalMessage(
          "assistant",
          getAutomaticAnswer(cleanQuestion),
        ),
      ]);

      setIsTyping(false);
    }, 700);
  }

  async function sendAdminMessage(question) {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || isTyping) {
      return;
    }

    setInput("");
    setIsTyping(true);
    setError("");

    const temporaryMessage =
      createLocalMessage(
        "customer",
        cleanQuestion,
      );

    setMessages((currentMessages) => [
      ...currentMessages,
      temporaryMessage,
    ]);

    try {
      await api("/chat/messages", {
        method: "POST",
        body: JSON.stringify({
          message: cleanQuestion,
        }),
      });

      await loadAdminConversation(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsTyping(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (connectedToAdmin) {
      sendAdminMessage(input);
    } else {
      sendAutomaticQuestion(input);
    }
  }

  function returnToAssistant() {
    setConnectedToAdmin(false);
    setConversation(null);

    setMessages([
      createLocalMessage(
        "assistant",
        "You are now chatting with the automatic PrintHub Assistant. What would you like to ask?",
      ),
    ]);
  }

  function getSenderLabel(message) {
    if (message.sender_role === "admin") {
      return message.sender_name ||
        "PrintHub Administrator";
    }

    if (
      message.sender_role === "assistant"
    ) {
      return "PrintHub Assistant";
    }

    return "You";
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <div
          className="
            mb-4 flex h-[520px]
            w-[calc(100vw-2.5rem)]
            max-w-sm flex-col
            overflow-hidden rounded-2xl
            border border-slate-200
            bg-white shadow-2xl
            dark:border-slate-700
            dark:bg-slate-900
          "
        >
          {/* Header */}
          <div
            className="
              flex items-center justify-between
              bg-navy p-4 text-white
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  grid h-10 w-10
                  place-items-center
                  rounded-full bg-brand
                "
              >
                {connectedToAdmin ? (
                  <Headphones size={21} />
                ) : (
                  <Bot size={21} />
                )}
              </div>

              <div>
                <h2 className="font-bold">
                  {connectedToAdmin
                    ? "Admin Support"
                    : "PrintHub Assistant"}
                </h2>

                <p className="text-xs text-green-300">
                  {connectedToAdmin
                    ? "Checking for replies"
                    : "● Online"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 hover:bg-white/10"
              aria-label="Close chatbot"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat mode controls */}
          <div
            className="
              flex items-center justify-between
              border-b border-slate-200
              px-3 py-2
              dark:border-slate-700
            "
          >
            <p className="text-xs text-slate-500">
              {connectedToAdmin
                ? `Status: ${conversation?.status || "Open"}`
                : "Automatic answers"}
            </p>

            {connectedToAdmin ? (
              <button
                type="button"
                onClick={returnToAssistant}
                className="text-xs font-semibold text-brand"
              >
                Back to Assistant
              </button>
            ) : (
              <button
                type="button"
                onClick={connectToAdmin}
                disabled={loading}
                className="
                  flex items-center gap-1
                  text-xs font-semibold
                  text-brand
                "
              >
                <Headphones size={14} />

                {loading
                  ? "Connecting..."
                  : "Talk to Admin"}
              </button>
            )}
          </div>

          {/* Error message */}
          {error && (
            <p
              className="
                m-3 rounded-xl
                bg-red-50 p-2
                text-xs text-red-700
              "
            >
              {error}
            </p>
          )}

          {/* Messages */}
          <div
            ref={messageContainerRef}
            className="
              flex-1 space-y-3
              overflow-y-auto
              bg-slate-50 p-4
              dark:bg-slate-950
            "
          >
            {loading ? (
              <p className="text-center text-sm text-slate-500">
                Loading conversation...
              </p>
            ) : (
              messages.map((message) => {
                const isCustomer =
                  message.sender_role ===
                  "customer";

                return (
                  <div
                    key={message.id}
                    className={`
                      flex items-end gap-2
                      ${
                        isCustomer
                          ? "justify-end"
                          : "justify-start"
                      }
                    `}
                  >
                    {!isCustomer && (
                      <div
                        className="
                          grid h-7 w-7
                          flex-shrink-0
                          place-items-center
                          rounded-full
                          bg-brand text-white
                        "
                      >
                        {message.sender_role ===
                        "admin" ? (
                          <Headphones size={15} />
                        ) : (
                          <Bot size={15} />
                        )}
                      </div>
                    )}

                    <div className="max-w-[78%]">
                      <p
                        className={`
                          mb-1 text-[10px]
                          text-slate-400
                          ${
                            isCustomer
                              ? "text-right"
                              : "text-left"
                          }
                        `}
                      >
                        {getSenderLabel(message)}
                      </p>

                      <div
                        className={`
                          rounded-2xl
                          px-4 py-2.5
                          text-sm leading-relaxed
                          ${
                            isCustomer
                              ? "rounded-br-sm bg-brand text-white"
                              : "rounded-bl-sm bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200"
                          }
                        `}
                      >
                        {message.message}

                        {connectedToAdmin &&
                          message.created_at && (
                            <p
                              className={`
                                mt-1 text-[9px]
                                ${
                                  isCustomer
                                    ? "text-blue-100"
                                    : "text-slate-400"
                                }
                              `}
                            >
                              {dt(message.created_at)}
                            </p>
                          )}
                      </div>
                    </div>

                    {isCustomer && (
                      <div
                        className="
                          grid h-7 w-7
                          flex-shrink-0
                          place-items-center
                          rounded-full
                          bg-cyan text-navy
                        "
                      >
                        <User size={15} />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {isTyping && (
              <div className="flex items-end gap-2">
                <div
                  className="
                    grid h-7 w-7
                    place-items-center
                    rounded-full
                    bg-brand text-white
                  "
                >
                  <Bot size={15} />
                </div>

                <div
                  className="
                    rounded-2xl
                    rounded-bl-sm
                    bg-white px-4 py-3
                    shadow-sm
                    dark:bg-slate-800
                  "
                >
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />

                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />

                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggested questions */}
          {!connectedToAdmin && (
            <div
              className="
                flex gap-2 overflow-x-auto
                border-t border-slate-200
                px-3 py-2
                dark:border-slate-700
              "
            >
              {QUICK_QUESTIONS.map(
                (question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() =>
                      sendAutomaticQuestion(
                        question,
                      )
                    }
                    className="
                      flex-shrink-0
                      rounded-full
                      border border-blue-200
                      bg-blue-50
                      px-3 py-1.5
                      text-xs text-brand
                      hover:bg-blue-100
                      dark:border-blue-800
                      dark:bg-blue-950
                    "
                  >
                    {question}
                  </button>
                ),
              )}
            </div>
          )}

          {/* Message input */}
          <form
            onSubmit={handleSubmit}
            className="
              flex items-center gap-2
              border-t border-slate-200
              bg-white p-3
              dark:border-slate-700
              dark:bg-slate-900
            "
          >
            <input
              type="text"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              placeholder={
                connectedToAdmin
                  ? "Message the administrator..."
                  : "Ask a question..."
              }
              disabled={isTyping || loading}
              maxLength={2000}
              className="flex-1"
            />

            <button
              type="submit"
              disabled={
                !input.trim() ||
                isTyping ||
                loading
              }
              className="
                grid h-10 w-10
                flex-shrink-0
                place-items-center
                rounded-xl bg-brand
                text-white transition
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        onClick={() =>
          setIsOpen(!isOpen)
        }
        className="
          ml-auto grid h-14 w-14
          place-items-center
          rounded-full bg-brand
          text-white shadow-lg
          transition
          hover:scale-105
          hover:bg-blue-700
          active:scale-95
        "
        aria-label={
          isOpen
            ? "Close chatbot"
            : "Open chatbot"
        }
      >
        {isOpen ? (
          <X size={25} />
        ) : (
          <MessageCircle size={25} />
        )}
      </button>
    </div>
  );
}