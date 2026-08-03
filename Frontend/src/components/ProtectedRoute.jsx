import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

/**
 * Gate for pages that need a signed-in user.
 *
 * While a stored token is being validated we render a placeholder rather than
 * redirecting — otherwise a reload would bounce a signed-in user to /login
 * before /auth/me has answered.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Remember the destination so login can send them onward.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
