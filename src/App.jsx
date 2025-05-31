import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function App() {
  const [image, setImage] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [animatedText, setAnimatedText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (!image) return;

    const objectUrl = URL.createObjectURL(image);
    setImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  // Drag and Drop Effects
  useEffect(() => {
    const dropArea = dropRef.current;
    if (!dropArea) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      dropArea.classList.add("border-blue-500");
    };

    const handleDragLeave = () => {
      dropArea.classList.remove("border-blue-500");
    };

    const handleDrop = (e) => {
      e.preventDefault();
      dropArea.classList.remove("border-blue-500");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024) {
        setImage(file);
      } else {
        alert("Only image files under 5MB are supported.");
      }
    };

    dropArea.addEventListener("dragover", handleDragOver);
    dropArea.addEventListener("dragleave", handleDragLeave);
    dropArea.addEventListener("drop", handleDrop);

    return () => {
      dropArea.removeEventListener("dragover", handleDragOver);
      dropArea.removeEventListener("dragleave", handleDragLeave);
      dropArea.removeEventListener("drop", handleDrop);
    };
  }, []);

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be under 5MB.");
      return;
    }

    setImage(file);
  };

  const handleAsk = async () => {
    if (!image || !question) {
      return alert("Upload an image and enter a question.");
    }

    setLoading(true);
    setAnimatedText("");
    setChat((prev) => [...prev, { role: "user", content: question }]);

    try {
      const toBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = (error) => reject(error);
        });

      const base64Image = await toBase64(image);

      const payload = {
        inputs: {
          image: base64Image,
          text: question,
        },
      };

      const res = await axios.post(
        "https://api-inference.huggingface.co/models/Salesforce/blip2-flan-t5-xl",
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_HF_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      const fullAnswer = res.data.answer || res.data.generated_text || JSON.stringify(res.data);

      typeText(fullAnswer);
      speak(fullAnswer);
      setChat((prev) => [...prev, { role: "assistant", content: fullAnswer }]);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
      console.error("API Error:", errorMsg);
      alert(`API Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }

    setQuestion("");
  };

  const typeText = (text) => {
    let index = 0;
    setAnimatedText("");
    const interval = setInterval(() => {
      setAnimatedText((prev) => prev + text[index]);
      index++;
      if (index === text.length) clearInterval(interval);
    }, 20);
  };

  return (
    <div className="min-h-screen min-w-full bg-gradient-to-br from-gray-900 to-gray-700 p-4">
      <div className="max-w-3xl w-full mx-auto bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-6">
        <h1 className="text-3xl font-extrabold text-center text-white">🧠 Vision-QA Assistant</h1>

        <div className="flex flex-col gap-3">
          <label htmlFor="imageUpload" className="text-white">Upload Image</label>
          <input
            id="imageUpload"
            type="file"
            onChange={handleImageChange}
            accept="image/*"
            className="file-input file-input-bordered w-full bg-gray-700 text-white"
          />

          <div
            ref={dropRef}
            className="border-2 border-dashed border-gray-500 rounded-xl p-4 text-center text-gray-400 hover:border-blue-500 cursor-pointer"
          >
            Drag and drop an image here
          </div>

          <input
            type="text"
            placeholder="Ask a question about the image..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="input input-bordered w-full bg-gray-700 text-white placeholder-gray-400"
            aria-label="Question"
          />

          <button
            onClick={handleAsk}
            className="bg-blue-500 text-white py-2 px-4 rounded-xl hover:bg-blue-600 transition"
            disabled={loading}
          >
            {loading ? "Thinking..." : "Ask"}
          </button>
        </div>

        {imagePreview && (
          <div>
            <p className="text-sm text-gray-300">Uploaded Image:</p>
            <img
              src={imagePreview}
              alt="Uploaded preview"
              className="rounded-xl mt-2 max-h-64 w-full object-contain border border-gray-600"
            />
          </div>
        )}

        <div className="bg-gray-900 rounded-xl p-4 max-h-96 overflow-y-auto space-y-3 border border-gray-600">
          {chat.map((entry, idx) => {
            const isLast = idx === chat.length - 1;
            const isBot = entry.role === "assistant";
            return (
              <div
                key={idx}
                className={`text-sm p-3 rounded-lg whitespace-pre-wrap ${
                  entry.role === "user"
                    ? "bg-blue-700 text-right text-white"
                    : "bg-green-700 text-left text-white"
                }`}
              >
                <strong>{entry.role === "user" ? "You" : "Assistant"}:</strong>{" "}
                {isLast && isBot ? animatedText : entry.content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
