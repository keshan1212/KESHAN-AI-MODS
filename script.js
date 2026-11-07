
/* =================================
   KESHAN AI MODS
   Main JavaScript
================================= */

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const typing = document.getElementById("typing");
const voiceBtn = document.getElementById("voiceBtn");
const voiceReply = document.getElementById("voiceReply");
const voiceAnimation = document.getElementById("voiceAnimation");

const HISTORY_KEY = "keshan_ai_chat_history_v1";

// Load saved messages
let chatHistory = [];

try {
  chatHistory = JSON.parse(
    localStorage.getItem(HISTORY_KEY) || "[]"
  );

  if (!Array.isArray(chatHistory)) chatHistory = [];
} catch {
  chatHistory = [];
}

// Save chat history
function saveHistory() {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(chatHistory.slice(-100))
  );
}

// Add message to screen
function addMessage(message, sender, save = true) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${sender}-message`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = sender === "ai" ? "🤖" : "👤";

  const content = document.createElement("div");
  content.className = "message-content";

  const name = document.createElement("b");
  name.textContent = sender === "ai" ? "KESHAN AI" : "YOU";

  const paragraph = document.createElement("p");
  paragraph.textContent = message;

  content.append(name, paragraph);
  wrapper.append(avatar, content);
  chatBox.appendChild(wrapper);

  chatBox.scrollTop = chatBox.scrollHeight;

  if (save) {
    chatHistory.push({ message, sender });
    saveHistory();
  }
}

// Restore previous messages
chatHistory.forEach(item => {
  if (
    item &&
    typeof item.message === "string" &&
    ["ai", "user"].includes(item.sender)
  ) {
    addMessage(item.message, item.sender, false);
  }
});

// AI voice reply
function speakAI(message) {
  if (!voiceReply.checked) return;

  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(message);

  speech.lang = "si-LK";
  speech.rate = 0.95;
  speech.pitch = 0.85;
  speech.volume = 1;

  const voices = window.speechSynthesis.getVoices();

  const preferredVoice = voices.find(v =>
    v.lang.toLowerCase().startsWith("si")
  );

  if (preferredVoice) {
    speech.voice = preferredVoice;
  } else {
    speech.lang = "en-US";
  }

  window.speechSynthesis.speak(speech);
}

// Send message to secure AI backend
async function getAIResponse(message) {
  // Backend URL will be configured later.
  const API_URL = window.KESHAN_AI_API_URL || "";

  if (!API_URL) {
    throw new Error(
      "AI Backend එක තවම සම්බන්ධ කර නැහැ. ඊළඟ setup එක අවශ්‍යයි."
    );
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: message,
      history: chatHistory.slice(-12)
    })
  });

  if (!response.ok) {
    throw new Error("AI server එකෙන් පිළිතුරක් ලැබුණේ නැහැ.");
  }

  const data = await response.json();

  if (!data.reply || typeof data.reply !== "string") {
    throw new Error("AI පිළිතුර නිවැරදි නැහැ.");
  }

  return data.reply;
}

// Send message
async function sendMessage(message) {
  message = message.trim();

  if (!message) return;

  addMessage(message, "user");

  userInput.value = "";
  typing.hidden = false;

  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = true;

  try {
    const reply = await getAIResponse(message);

    addMessage(reply, "ai");
    speakAI(reply);

  } catch (error) {
    addMessage(
      "මට දැන් AI Server එකට සම්බන්ධ වෙන්න බැහැ. Backend එක නිවැරදිව Setup කළාද බලන්න. ⚠️",
      "ai"
    );

    console.error(error);

  } finally {
    typing.hidden = true;
    sendBtn.disabled = false;
    userInput.focus();
  }
}

// Form submit
chatForm.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(userInput.value);
});

// Voice recognition
const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();

  recognition.lang = "si-LK";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    voiceBtn.textContent = "🔴";
    voiceAnimation.classList.add("active");
  };

  recognition.onresult = event => {
    const spokenText =
      event.results[0][0].transcript;

    userInput.value = spokenText;
    sendMessage(spokenText);
  };

  recognition.onerror = event => {
    console.error("Voice error:", event.error);
    addMessage(
      "Voice recognition ක්‍රියාත්මක වුණේ නැහැ. Microphone permission පරීක්ෂා කරන්න.",
      "ai"
    );
  };

  recognition.onend = () => {
    isListening = false;
    voiceBtn.textContent = "🎙️";
    voiceAnimation.classList.remove("active");
  };

} else {
  voiceBtn.title = "මෙම browser එක Voice Recognition සඳහා සහාය නොදක්වයි.";
}

// Microphone button
voiceBtn.addEventListener("click", () => {
  if (!recognition) {
    alert("Voice Recognition සඳහා වෙනත් සහාය දක්වන browser එකක් භාවිත කරන්න.");
    return;
  }

  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
});

// Stop speaking when page closes
window.addEventListener("pagehide", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
});
