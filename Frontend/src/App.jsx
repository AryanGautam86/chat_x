import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Chat from "./pages/Chat";
import CodeGenerator from "./pages/CodeGenerator";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* Public */}

          <Route path="/login" element={<Login mode="login" />} />

          <Route path="/register" element={<Login mode="register" />} />

          {/* Everything else needs a signed-in user, matching the API, which
              rejects unauthenticated requests with 401. */}

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />

          <Route
            path="/code"
            element={
              <ProtectedRoute>
                <CodeGenerator />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
