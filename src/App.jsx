import React, { useState, useEffect, useRef } from "react";
// import axios from "axios"; // Not needed for Gemini API call via SDK
import { GoogleGenerativeAI } from "@google/generative-ai";

function App() {
  const [image, setImage] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [animatedText, setAnimatedText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const dropRef = useRef(null);
  const chatContainerRef = useRef(null); // For scrolling to bottom

  // Initialize the Google Generative AI client
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  // Using "gemini-1.5-flash" as a common model for multimodal tasks.
  // You can change this if you have a specific model version like "gemini-pro-vision".
  const modelName = "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  useEffect(() => {
    if (!image) {
      setImagePreview(null); // Clear preview if image is removed
      return;
    }

    const objectUrl = URL.createObjectURL(image);
    setImagePreview(objectUrl);

    // Cleanup function to revoke the object URL
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat, animatedText]);


  // Drag and Drop Effects
  useEffect(() => {
    const dropArea = dropRef.current;
    if (!dropArea) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.add("border-indigo-500", "bg-slate-700");
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove("border-indigo-500", "bg-slate-700");
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropArea.classList.remove("border-indigo-500", "bg-slate-700");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024) { // 5MB limit
        setImage(file);
      } else if (file && !file.type.startsWith("image/")) {
        alert("Invalid file type. Please upload an image (PNG, JPG, GIF, etc.).");
      } else if (file && file.size > 5 * 1024 * 1024) {
        alert("Image size exceeds 5MB. Please upload a smaller image.");
      }
    };

    dropArea.addEventListener("dragover", handleDragOver);
    dropArea.addEventListener("dragleave", handleDragLeave);
    dropArea.addEventListener("drop", handleDrop);

    return () => {
      if (dropArea) {
        dropArea.removeEventListener("dragover", handleDragOver);
        dropArea.removeEventListener("dragleave", handleDragLeave);
        dropArea.removeEventListener("drop", handleDrop);
      }
    };
  }, []);

  const speak = (text) => {
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImage(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (e.g., PNG, JPG, GIF).");
      e.target.value = null;
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("Image size must be under 5MB.");
      e.target.value = null;
      return;
    }
    setImage(file);
  };

  const handleAsk = async () => {
    if (!image) {
      return alert("Please upload an image first.");
    }
    if (!question.trim()) {
      return alert("Please enter a question.");
    }

    setLoading(true);
    setAnimatedText("");
    const currentQuestion = question;
    setChat((prev) => [...prev, { role: "user", content: currentQuestion }]);
    setQuestion("");

    try {
      const fileToGenerativePart = async (file) => {
        const base64EncodedDataPromise = new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(",")[1]);
          reader.readAsDataURL(file);
        });
        return {
          inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
        };
      };

      const imagePart = await fileToGenerativePart(image);
      const promptParts = [currentQuestion, imagePart];

      const result = await model.generateContent(promptParts);
      const response = await result.response;
      const fullAnswer = response.text();

      typeText(fullAnswer);
      speak(fullAnswer);
      setChat((prev) => [...prev, { role: "assistant", content: fullAnswer }]);
    } catch (err) {
      console.error("Gemini API Error:", err);
      const errorMsg = err.message || "An error occurred while communicating with the AI.";
      const displayError = `Sorry, I encountered an error: ${errorMsg}`;
      setChat((prev) => [...prev, { role: "assistant", content: displayError }]);
      // typeText(displayError); // Optionally animate error
      // speak(displayError); // Optionally speak error
    } finally {
      setLoading(false);
    }
  };

  const typeText = (text) => {
    let index = 0;
    setAnimatedText("");
    const intervalId = setInterval(() => {
      if (index < text.length) {
        setAnimatedText((prev) => prev + text[index]);
        index++;
      } else {
        clearInterval(intervalId);
      }
    }, 25);
    return () => clearInterval(intervalId);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && image && question.trim()) {
        handleAsk();
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center p-2 sm:p-4 selection:bg-indigo-500 selection:text-white">
      <div className="bg-slate-800/70 backdrop-blur-md shadow-2xl rounded-xl w-full max-w-2xl lg:max-w-4xl flex flex-col overflow-hidden my-auto">
        <header className="p-4 sm:p-5 border-b border-slate-700">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-pink-500 to-orange-400">
            ✨ Vision AI Chat ✨
          </h1>
        </header>

        <div className="flex-grow flex flex-col md:flex-row p-3 sm:p-4 gap-4 overflow-hidden">
          <div className="w-full md:w-2/5 lg:w-1/3 flex flex-col gap-3 sm:gap-4">
            <div
              ref={dropRef}
              className="relative group aspect-video sm:aspect-square w-full border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-lg flex flex-col justify-center items-center text-center p-4 cursor-pointer transition-all duration-300 ease-in-out bg-slate-700/30 hover:bg-slate-700/50"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain rounded-md"
                />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500 group-hover:text-indigo-400 transition-colors">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.158 0a.079.079 0 1 1-.158 0 .079.079 0 0 1 .158 0Z" />
                  </svg>
                  <p className="mt-2 text-xs sm:text-sm text-slate-400 group-hover:text-indigo-300 transition-colors">
                    Drag & drop image, or
                  </p>
                </>
              )}
              <input
                id="imageUpload"
                type="file"
                onChange={handleImageChange}
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Upload image"
              />
            </div>
             <label htmlFor="imageUpload" className="w-full text-center text-sm py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800">
                {image ? "Change Image" : "Select Image"}
            </label>

            {image && (
              <button
                onClick={() => { setImage(null); setChat([]); setAnimatedText(""); }}
                className="w-full text-sm py-2.5 px-3 bg-pink-600 hover:bg-pink-700 text-white rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
              >
                Remove Image & Clear Chat
              </button>
            )}
          </div>

          <div className="w-full md:w-3/5 lg:w-2/3 flex flex-col bg-slate-700/50 rounded-lg overflow-hidden h-[65vh] sm:h-[70vh] md:h-auto">
            <div
              ref={chatContainerRef}
              className="flex-grow p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50"
            >
              {chat.length === 0 && !loading && (
                <div className="text-center text-slate-400 pt-10 flex flex-col items-center justify-center h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-slate-500 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-3.862 8.25-8.625 8.25S3.75 16.556 3.75 12 7.612 3.75 12.375 3.75 21 7.444 21 12Z" />
                  </svg>
                  <p className="text-sm sm:text-base">Upload an image and ask a question to start!</p>
                  <p className="text-xs text-slate-500 mt-1">(e.g., "What's in this image?", "Describe the main object.")</p>
                </div>
              )}
              {chat.map((entry, idx) => {
                const isUser = entry.role === "user";
                const isLastAssistantMessage = entry.role === "assistant" && idx === chat.length -1;
                
                return (
                  <div
                    key={idx}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-2.5 sm:p-3 rounded-xl shadow-md text-sm sm:text-base leading-relaxed whitespace-pre-wrap
                        ${
                          isUser
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-slate-600 text-slate-100 rounded-bl-none"
                        }
                      `}
                    >
                      <strong className="font-semibold block mb-0.5 sm:mb-1">
                        {isUser ? "You" : "Vision AI"}
                      </strong>
                      {isLastAssistantMessage && animatedText ? animatedText : entry.content}
                      {isLastAssistantMessage && loading && !animatedText && <span className="animate-pulse">Thinking...</span>}
                    </div>
                  </div>
                );
              })}
               {loading && chat.length > 0 && chat[chat.length -1].role === "user" && (
                <div className="flex justify-start">
                    <div className="max-w-[85%] sm:max-w-[75%] p-2.5 sm:p-3 rounded-xl shadow-md text-sm sm:text-base bg-slate-600 text-slate-100 rounded-bl-none">
                        <strong className="font-semibold block mb-0.5 sm:mb-1">Vision AI</strong>
                        <span className="animate-pulse">Thinking...</span>
                    </div>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-600 bg-slate-700/30">
              <div className="flex items-end gap-2 sm:gap-3">
                <textarea
                  rows="1"
                  placeholder={image ? "Ask about the image..." : "Upload an image first..."}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-grow p-2.5 sm:p-3 bg-slate-600/80 text-slate-100 rounded-lg resize-none placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-600/80"
                  disabled={!image || loading}
                  aria-label="Ask a question"
                  style={{ maxHeight: '120px', minHeight: '44px' }} // Control textarea growth
                  onInput={(e) => { // Auto-resize textarea
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                />
                <button
                  onClick={handleAsk}
                  className="p-2.5 sm:p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out self-end"
                  disabled={!image || !question.trim() || loading}
                  aria-label="Send question"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center py-3 sm:py-4 mt-2 text-sm sm:text-base text-slate-400">
        <p>
          &copy; 2025 Vision AI Chat. All rights reserved.
        </p>
        <p>
          Built with ❤️ using React, Tailwind CSS, and Gemini API.
        </p>
      </footer>
    </div>
  );
}

export default App;
