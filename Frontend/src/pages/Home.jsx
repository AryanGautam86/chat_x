import { Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

function Home() {
  const features = [
    {
      title: "📄 Upload Documents",
      description:
        "Upload documents and store them in the AI knowledge base.",
      path: "/upload",
      button: "Upload",
    },
    {
      title: "💬 AI Chat",
      description:
        "Ask questions based on your uploaded documents using RAG.",
      path: "/chat",
      button: "Start Chat",
    },
    {
      title: "🤖 Code Generator",
      description:
        "Generate production-ready code in multiple programming languages.",
      path: "/code",
      button: "Generate Code",
    },
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-6xl font-bold text-white">
          AI Workspace 🚀
        </h1>

        <p className="mt-6 text-gray-300 text-xl max-w-3xl mx-auto">
          Upload documents, chat with your knowledge base,
          and generate AI-powered code — all in one place.
        </p>

        <Link
          to="/chat"
          className="inline-block mt-10 bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl text-lg font-semibold transition"
        >
          Get Started
        </Link>
      </section>

      {/* Feature Cards */}
      <section className="grid md:grid-cols-3 gap-8 mt-12">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-slate-800 rounded-2xl p-8 shadow-lg hover:scale-105 transition duration-300"
          >
            <h2 className="text-2xl font-bold mb-4">
              {feature.title}
            </h2>

            <p className="text-gray-400 mb-8">
              {feature.description}
            </p>

            <Link
              to={feature.path}
              className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg"
            >
              {feature.button}
            </Link>
          </div>
        ))}
      </section>
    </MainLayout>
  );
}

export default Home;