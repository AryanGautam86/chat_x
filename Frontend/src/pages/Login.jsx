import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { FaLock, FaEnvelope, FaUser, FaEye, FaEyeSlash } from "react-icons/fa";

import API from "../api/api";
import GoogleButton from "../components/GoogleButton";
import { useAuth } from "../hooks/useAuth";

/**
 * Sign in / create account. `mode` picks which, so the two pages share layout,
 * validation and the Google button.
 */
function Login({ mode = "login" }) {
  const isRegister = mode === "register";

  const { isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [config, setConfig] = useState({
    google_client_id: "",
    min_password_length: 8,
  });

  // Ask the server what's available rather than hardcoding it in the bundle.
  useEffect(() => {
    let cancelled = false;

    API.get("/auth/config")
      .then(({ data }) => !cancelled && setConfig(data))
      .catch(() => {
        /* Google button stays hidden; password sign-in still works. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Send people back where they were headed before the redirect to login.
  const target = location.state?.from?.pathname || "/";

  const handleGoogle = useCallback(
    async (credential) => {
      setError("");
      setBusy(true);
      try {
        const { data } = await API.post("/auth/google", { credential });
        signIn(data);
        navigate(target, { replace: true });
      } catch (err) {
        setError(err.response?.data?.detail || "Google sign-in failed.");
      } finally {
        setBusy(false);
      }
    },
    [navigate, signIn, target]
  );

  if (isAuthenticated) return <Navigate to={target} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) return setError("Enter your email address.");
    if (!password) return setError("Enter your password.");
    if (isRegister && password.length < config.min_password_length) {
      return setError(
        `Password must be at least ${config.min_password_length} characters.`
      );
    }

    setBusy(true);

    try {
      const path = isRegister ? "/auth/register" : "/auth/login";
      const body = isRegister
        ? { email: email.trim(), password, name: name.trim() }
        : { email: email.trim(), password };

      const { data } = await API.post(path, body);
      signIn(data);
      navigate(target, { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            // Pydantic validation errors arrive as a list.
            ? detail[0]?.msg || "Please check your details."
            : "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-900 border border-slate-700 outline-none focus:border-blue-500 transition text-white placeholder:text-gray-500";

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400">AI Workspace 🚀</h1>
          <p className="text-gray-400 mt-2">
            {isRegister
              ? "Create an account to get started."
              : "Sign in to continue."}
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-8">

          {error && (
            <div
              role="alert"
              className="mb-6 bg-red-900/40 border border-red-700 text-red-200 rounded-xl px-4 py-3 text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">

            {isRegister && (
              <div className="relative">
                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  autoComplete="name"
                  className={field}
                />
              </div>
            )}

            <div className="relative">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                className={field}
              />
            </div>

            <div className="relative">
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                className={`${field} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {isRegister && (
              <p className="text-xs text-gray-500">
                At least {config.min_password_length} characters.
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3.5 rounded-xl font-semibold transition shadow-lg"
            >
              {busy
                ? isRegister
                  ? "Creating account..."
                  : "Signing in..."
                : isRegister
                  ? "Create account"
                  : "Sign in"}
            </button>

          </form>

          {config.google_client_id && (
            <>
              <div className="flex items-center gap-4 my-6">
                <div className="h-px bg-slate-700 flex-1" />
                <span className="text-xs uppercase tracking-wide text-gray-500">
                  or
                </span>
                <div className="h-px bg-slate-700 flex-1" />
              </div>

              <GoogleButton
                clientId={config.google_client_id}
                onCredential={handleGoogle}
                onError={setError}
              />
            </>
          )}

          <p className="text-center text-sm text-gray-400 mt-6">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <Link to="/login" className="text-blue-400 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <Link to="/register" className="text-blue-400 hover:underline">
                  Create one
                </Link>
              </>
            )}
          </p>

        </div>
      </div>
    </div>
  );
}

export default Login;
