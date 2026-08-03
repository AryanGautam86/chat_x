import { useEffect, useRef, useState } from "react";
import { FaCamera, FaTimes, FaRedo, FaCheck } from "react-icons/fa";

/**
 * Live webcam capture. getUserMedia requires a secure context, which localhost
 * and the deployed HTTPS origin both satisfy.
 *
 * onCapture receives a File; onClose is called for cancel and after capture.
 */
function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  // Mirrors the current shot URL so unmount cleanup sees the latest value; the
  // mount effect's closure would otherwise always read the initial null.
  const shotUrlRef = useRef(null);

  const [error, setError] = useState("");
  const [shot, setShot] = useState(null); // { url, file }
  const [ready, setReady] = useState(false);

  // Start the stream on mount, and always stop it on unmount so the camera
  // light doesn't stay on.
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch (err) {
        console.error(err);

        if (err.name === "NotAllowedError") {
          setError("Camera permission was denied. Allow it in your browser settings.");
        } else if (err.name === "NotFoundError") {
          setError("No camera was found on this device.");
        } else if (!window.isSecureContext) {
          setError("The camera needs a secure connection (https or localhost).");
        } else {
          setError(err.message || "Could not start the camera.");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (shotUrlRef.current) URL.revokeObjectURL(shotUrlRef.current);
    };
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const takeShot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const file = new File([blob], `photo-${stamp}.jpg`, { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        shotUrlRef.current = url;
        setShot({ url, file });
      },
      "image/jpeg",
      0.9
    );
  };

  const retake = () => {
    if (shot?.url) URL.revokeObjectURL(shot.url);
    shotUrlRef.current = null;
    setShot(null);
  };

  const confirm = () => {
    if (!shot) return;
    // The File is what leaves; the preview URL is this modal's to clean up.
    onCapture(shot.file);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h3 className="font-semibold text-lg flex items-center gap-3">
            <FaCamera className="text-blue-400" />
            Take a photo
          </h3>

          <button
            onClick={onClose}
            aria-label="Close camera"
            className="text-gray-400 hover:text-white transition p-2"
          >
            <FaTimes />
          </button>
        </div>

        <div className="bg-black aspect-video flex items-center justify-center">
          {error ? (
            <p className="text-red-400 text-center px-8 py-12">{error}</p>
          ) : shot ? (
            <img src={shot.url} alt="Captured" className="max-h-full max-w-full" />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className={`max-h-full max-w-full ${ready ? "" : "hidden"}`}
              />
              {!ready && <p className="text-gray-400">Starting camera...</p>}
            </>
          )}
        </div>

        <div className="flex justify-center gap-4 px-6 py-5">
          {error ? (
            <button
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-xl transition"
            >
              Close
            </button>
          ) : shot ? (
            <>
              <button
                onClick={retake}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-xl transition"
              >
                <FaRedo />
                Retake
              </button>

              <button
                onClick={confirm}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-semibold transition"
              >
                <FaCheck />
                Use this photo
              </button>
            </>
          ) : (
            <button
              onClick={takeShot}
              disabled={!ready}
              className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-8 py-3 rounded-xl font-semibold transition shadow-lg"
            >
              <FaCamera />
              Capture
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CameraModal;
