function Loader() {
  return (
    <div className="flex justify-start mb-8">

      <div className="flex gap-3 items-start max-w-[80%]">

        {/* AI Avatar */}

        <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-xl shadow-lg flex-shrink-0">
          🤖
        </div>

        <div>

          {/* Label */}

          <p className="text-sm font-semibold text-emerald-400 mb-2">
            AI Assistant
          </p>

          {/* Bubble */}

          <div className="bg-slate-700 rounded-2xl px-6 py-5 shadow-lg">

            <div className="flex items-center gap-2">

              <span
                className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></span>

              <span
                className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: "200ms" }}
              ></span>

              <span
                className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: "400ms" }}
              ></span>

            </div>

            <p className="text-gray-400 text-sm mt-3">
              Thinking...
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Loader;