const MOCK_REPORT = {
  type: "report",
  message: "Analysis complete. Aphid infestation detected with high confidence. Treatment plan generated based on current weather conditions.",
  diagnosis: "Aphid Infestation",
  confidence: 93.7,
  risk: "high",
  weather: {
    temp_c: 18.2,
    wind_kmh: 12.4,
    rain_mm: 0.0,
    spray_safe: true,
  },
  treatment: [
    { label: "Apply Deltamethrin (Decis 5EC) — ensure full canopy coverage", type: "recommended" },
    { label: "Use Imidacloprid for systemic control if leaf rolling is advanced", type: "recommended" },
    { label: "Do NOT apply Neem Oil in temperatures above 30 °C", type: "warning" },
    { label: "Avoid spraying within 24 h of expected rainfall", type: "warning" },
  ],
  prevention: [
    "Remove volunteer wheat and barley (green-bridge hosts) within 500 m",
    "Limit nitrogen application to prevent aphid population spikes",
    "Scout twice weekly during boot stage for early re-infestation",
    "Sanitize machinery after working in infested areas",
  ],
};

const DIRECT_RESPONSES = [
  "Hello! I'm your wheat crop health assistant. Send me a photo of your wheat leaves and I'll diagnose any issues and provide a treatment plan.",
  "I specialize in diagnosing 14 wheat conditions including Aphid, Black Rust, Blast, Brown Rust, Fusarium Head Blight, Mildew, Mite, Septoria, Smut, Stem fly, Tan spot, Yellow Rust, Leaf Blight, and Healthy Wheat.",
  "Sure! Just upload a clear photo of the affected wheat leaf and I'll analyze it right away.",
  "I need an image to perform a diagnosis. Could you please upload a photo of your wheat crop?",
];

let directIndex = 0;

export function useMockApi() {
  const sendMessage = (message, imageFile) => {
    return new Promise((resolve) => {
      if (imageFile) {
        // Simulate report response with delay
        setTimeout(() => resolve(MOCK_REPORT), 1500);
      } else {
        // Simulate direct response with delay
        const response = {
          type: "direct",
          message: DIRECT_RESPONSES[directIndex % DIRECT_RESPONSES.length],
        };
        directIndex++;
        setTimeout(() => resolve(response), 800);
      }
    });
  };

  return { sendMessage };
}
