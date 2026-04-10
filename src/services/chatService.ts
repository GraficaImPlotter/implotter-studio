// SEC-007: Use environment variable for chat API URL, fallback to localhost for dev
const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || "http://localhost:3001/api/chat";

export const sendChatMessage = async (messages: { role: string; content: string }[]) => {
  try {
    const response = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`Erro na API de Chat: ${response.status}`);
    }

    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.error("Falha ao comunicar com o Backend de Chat:", error);
    return null;
  }
};
