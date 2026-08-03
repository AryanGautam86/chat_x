import { useState } from "react";
import MainLayout from "../layouts/MainLayout";
import API from "../api/api";
import AttachButton from "../components/AttachButton";
import AttachmentChip from "../components/AttachmentChip";

function Upload() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null); // { ok, text, preview }
  const [loading, setLoading] = useState(false);

  const pickFile = (picked) => {
    setFile(picked);
    setResult(null);

    // Seed the title from the filename, but don't clobber a title already typed.
    if (!title.trim()) {
      setTitle(picked.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    // Validate here rather than disabling the button: a greyed-out button with
    // no explanation just reads as broken.
    if (!title.trim()) {
      setResult({ ok: false, text: "Add a title for this document." });
      return;
    }

    if (!file && !content.trim()) {
      setResult({
        ok: false,
        text: "Paste some content, or use + to attach a file.",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let response;

      if (file) {
        // The backend extracts the text: Gemini reads images and PDFs, plain
        // text is decoded directly.
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);

        response = await API.post("/upload_file", formData);
      } else {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);

        response = await API.post("/upload", formData);
      }

      setResult({
        ok: true,
        text: response.data.message,
        preview: response.data.preview,
        characters: response.data.characters,
      });

      setTitle("");
      setContent("");
      setFile(null);
    } catch (error) {
      console.error(error);

      setResult({
        ok: false,
        text: error.response?.data?.detail || "Upload failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">

        <h1 className="text-5xl font-bold mb-4 text-center">
          Upload Documents
        </h1>

        <p className="text-gray-400 text-center mb-10">
          Paste text, or use <span className="text-blue-400 font-semibold">+</span> to
          attach an image, PDF or text file. Everything here is saved to your
          searchable library.
        </p>

        {result && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              result.ok ? "bg-green-600" : "bg-red-600"
            }`}
          >
            <p className="font-semibold text-center">{result.text}</p>

            {result.preview && (
              <div className="mt-4 bg-black/25 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide opacity-80 mb-2">
                  Extracted {result.characters} characters
                </p>
                <p className="text-sm whitespace-pre-wrap line-clamp-6">
                  {result.preview}
                </p>
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={handleUpload}
          className="bg-slate-800 p-8 rounded-xl shadow-lg space-y-6"
        >

          <input
            type="text"
            placeholder="Document Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-4 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
          />

          {file ? (
            <div className="space-y-3">
              <AttachmentChip file={file} onRemove={() => setFile(null)} />
              <p className="text-sm text-gray-400">
                Text will be extracted from this file automatically.
              </p>
            </div>
          ) : (
            <textarea
              rows="10"
              placeholder="Document Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-4 rounded-lg bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <div className="flex items-center gap-4">

            <AttachButton onSelect={pickFile} disabled={loading} />

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-semibold transition"
            >
              {loading
                ? file
                  ? "Reading file..."
                  : "Uploading..."
                : "Upload"}
            </button>

          </div>

        </form>

      </div>
    </MainLayout>
  );
}

export default Upload;
