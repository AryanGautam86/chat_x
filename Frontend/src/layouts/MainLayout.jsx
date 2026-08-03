import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

/**
 * Page shell. Pages that keep a history panel pass it as `sidebar`; pages that
 * don't render exactly as before.
 */
function MainLayout({ children, sidebar = null }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">

      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row">

        {sidebar}

        {/* min-w-0 lets wide children (code blocks, tables) scroll instead of
            stretching the flex row. */}
        <main className="flex-1 min-w-0 p-8">
          {children}
        </main>

      </div>

      <Footer />

    </div>
  );
}

export default MainLayout;
