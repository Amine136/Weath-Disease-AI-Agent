const API_BASE = "http://localhost:8000";

export function useApi() {
  const sendMessage = async (message, imageFile, sessionId = "default", location = {}) => {
    let imagePath = "";

    // Step 1: upload image if provided
    if (imageFile) {
      const formData = new FormData();
      formData.append("file", imageFile);

      const uploadRes = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        throw new Error(`Image upload failed: ${err}`);
      }

      const uploadData = await uploadRes.json();
      // Backend returns the absolute server-side path
      imagePath = uploadData.path;
    }

    // Step 2: send chat message
    const chatRes = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message || "Please analyze this wheat leaf image",
        session_id: sessionId,
        image_path: imagePath,
        latitude: location.latitude || "",
        longitude: location.longitude || "",
      }),
    });

    if (!chatRes.ok) {
      const err = await chatRes.text();
      throw new Error(`Chat request failed (${chatRes.status}): ${err}`);
    }

    return await chatRes.json();
  };

  return { sendMessage };
}
