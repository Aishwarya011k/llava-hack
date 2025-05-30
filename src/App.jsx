import React, { useState } from "react";
import axios from "axios";

function App() {
  const [image, setImage] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [animatedText, setAnimatedText] = useState("");

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleAsk = async () => {
    if (!image || !question) return alert("Upload an image and enter a question.");

    setLoading(true);
    setAnimatedText("");
    setChat((prev) => [...prev, { role: "user", content: question }]);

    try {
      // Convert image file to base64
      const toBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result.split(",")[1]); // remove base64 prefix
          reader.onerror = (error) => reject(error);
        });

      const base64Image = await toBase64(image);

      const payload = {
        inputs: {
          image: base64Image,
          text: question,  // Hugging Face expects 'text' key here for question
        },
      };

      const res = await axios.post(
        "https://api-inference.huggingface.co/models/Salesforce/blip2-flan-t5-xl",
        payload,
        {
          headers: {
            Authorization: `Bearer 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`, // Your HF token here
            "Content-Type": "application/json",
          },
        }
      );

      const fullAnswer = res.data.answer || res.data.generated_text || JSON.stringify(res.data);

      typeText(fullAnswer);
      setChat((prev) => [...prev, { role: "assistant", content: fullAnswer }]);
    } catch (err) {
      alert("Error contacting Hugging Face API. Check console for details.");
      console.error(err.response?.data || err.message || err);
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
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 to-gray-700 p-4">
      <div className="max-w-3xl w-full mx-auto bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-6">
        <h1 className="text-3xl font-extrabold text-center text-white">🧠 Vision-QA Assistant</h1>

        <div className="flex flex-col gap-3">
          <input
            type="file"
            onChange={handleImageChange}
            accept="image/*"
            className="file-input file-input-bordered w-full bg-gray-700 text-white"
          />
          <input
            type="text"
            placeholder="Ask a question about the image..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="input input-bordered w-full bg-gray-700 text-white placeholder-gray-400"
          />
          <button
            onClick={handleAsk}
            className="bg-blue-500 text-white py-2 px-4 rounded-xl hover:bg-blue-600 transition"
            disabled={loading}
          >
            {loading ? "Thinking..." : "Ask"}
          </button>
        </div>

        {image && (
          <div>
            <p className="text-sm text-gray-300">Uploaded Image:</p>
            <img
              src={URL.createObjectURL(image)}
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
