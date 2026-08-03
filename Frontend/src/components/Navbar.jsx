import { NavLink } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";

import { useAuth } from "../hooks/useAuth";

function Navbar() {
  const { user, signOut } = useAuth();

  const linkClass = ({ isActive }) =>
    isActive
      ? "text-blue-400 font-semibold"
      : "text-gray-300 hover:text-blue-400 transition";

  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <nav className="bg-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-8 py-4 flex flex-wrap items-center justify-between gap-4">

        {/* Logo */}
        <h1 className="text-2xl font-bold text-blue-400">
          AI Workspace 🚀
        </h1>

        {/* Navigation */}
        <div className="flex gap-8">

          <NavLink to="/" className={linkClass}>
            Home
          </NavLink>

          <NavLink to="/upload" className={linkClass}>
            Upload
          </NavLink>

          <NavLink to="/chat" className={linkClass}>
            Chat
          </NavLink>

          <NavLink to="/code" className={linkClass}>
            Code Generator
          </NavLink>

        </div>

        {/* Account */}
        {user && (
          <div className="flex items-center gap-3">

            <div
              className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-semibold flex-shrink-0"
              title={user.email}
            >
              {initial}
            </div>

            <span className="text-sm text-gray-300 max-w-[12rem] truncate hidden sm:block">
              {user.name || user.email}
            </span>

            <button
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition px-2 py-1"
            >
              <FaSignOutAlt />
              <span className="hidden sm:inline">Sign out</span>
            </button>

          </div>
        )}

      </div>
    </nav>
  );
}

export default Navbar;
