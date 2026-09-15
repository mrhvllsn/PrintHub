import { useState } from "react";

import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";

import {
  Eye,
  EyeOff,
  Printer,
} from "lucide-react";

import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   LOGIN PAGE
========================================================= */

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    login: "admin",
    password: "Password123!",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function submitLogin(event) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      login(data);
      navigate("/");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      text="Sign in to manage your printing orders."
    >
      <form
        onSubmit={submitLogin}
        className="space-y-4"
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
          <label htmlFor="login">
            Email or username
          </label>

          <input
            id="login"
            name="login"
            type="text"
            value={form.login}
            onChange={updateField}
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label htmlFor="password">
            Password
          </label>

          <div className="relative">
            <input
              id="password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={form.password}
              onChange={updateField}
              autoComplete="current-password"
              className="pr-11"
              required
            />

            <button
              type="button"
              className="
                absolute right-3 top-1/2
                -translate-y-1/2
                text-slate-500
              "
              onClick={() =>
                setShowPassword(!showPassword)
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={19} />
              ) : (
                <Eye size={19} />
              )}
            </button>
          </div>
        </div>

        <div
          className="
            flex items-center justify-between
            gap-3 text-sm
          "
        >
          <label
            htmlFor="remember"
            className="
              !mb-0 flex cursor-pointer
              items-center gap-2
            "
          >
            <input
              id="remember"
              type="checkbox"
              className="h-4 w-4"
            />

            Remember me
          </label>

          <button
            type="button"
            className="text-brand hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full"
        >
          {busy
            ? "Signing in..."
            : "Sign In"}
        </button>

        <p className="text-center text-sm text-slate-500">
          New customer?{" "}

          <Link
            className="
              font-semibold text-brand
              hover:underline
            "
            to="/register"
          >
            Create account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

/* =========================================================
   REGISTRATION PAGE
========================================================= */

export function Register() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function submitRegistration(event) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });

      login(data);
      navigate("/");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    {
      label: "Full name",
      name: "fullName",
      type: "text",
      required: true,
    },
    {
      label: "Username",
      name: "username",
      type: "text",
      required: true,
    },
    {
      label: "Email",
      name: "email",
      type: "email",
      required: true,
    },
    {
      label: "Phone",
      name: "phone",
      type: "tel",
      required: false,
    },
    {
      label: "Password",
      name: "password",
      type: "password",
      required: true,
      fullWidth: true,
    },
  ];

  return (
    <AuthShell
      title="Create account"
      text="Start sending print requests online."
    >
      <form
        onSubmit={submitRegistration}
        className="grid gap-4 sm:grid-cols-2"
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
              required={field.required}
              minLength={
                field.name === "password"
                  ? 8
                  : undefined
              }
              autoComplete={
                field.name === "password"
                  ? "new-password"
                  : field.name
              }
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary sm:col-span-2"
        >
          {busy
            ? "Creating account..."
            : "Create Account"}
        </button>

        <p
          className="
            text-center text-sm text-slate-500
            sm:col-span-2
          "
        >
          Already registered?{" "}

          <Link
            className="
              font-semibold text-brand
              hover:underline
            "
            to="/login"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

/* =========================================================
   SHARED AUTHENTICATION LAYOUT
========================================================= */

function AuthShell({
  title,
  text,
  children,
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Left-side introduction */}
      <section
        className="
          hidden bg-navy p-12 text-white
          lg:flex lg:flex-col
          lg:justify-between
        "
      >
        <div className="flex items-center gap-3">
          <span
            className="
              grid h-12 w-12
              place-items-center
              rounded-xl bg-brand
            "
          >
            <Printer />
          </span>

          <strong className="text-2xl">
            PrintHub
          </strong>
        </div>

        <div>
          <p
            className="
              mb-4 text-5xl
              font-black leading-tight
            "
          >
            Upload. Customize.
            <br />

            <span className="text-cyan">
              Print.
            </span>
          </p>

          <p className="max-w-md text-slate-300">
            A faster way to submit print jobs and
            know exactly when they are ready.
          </p>
        </div>

        <small className="text-slate-500">
          Online Printing Shop Management System
        </small>
      </section>

      {/* Login or registration form */}
      <section className="grid place-items-center p-5">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div
            className="
              mb-8 flex items-center gap-3
              lg:hidden
            "
          >
            <span
              className="
                grid h-11 w-11
                place-items-center
                rounded-xl bg-brand
                text-white
              "
            >
              <Printer />
            </span>

            <strong className="text-2xl">
              PrintHub
            </strong>
          </div>

          <h1 className="text-3xl font-bold">
            {title}
          </h1>

          <p className="mb-7 mt-2 text-slate-500">
            {text}
          </p>

          {children}
        </div>
      </section>
    </main>
  );
}