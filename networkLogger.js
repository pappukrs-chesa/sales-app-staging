// 🔥 Confirm file is loaded
console.log("🔥 Network Logger Loaded");

// FETCH interceptor
const originalFetch = global.fetch;

global.fetch = async (...args) => {
  try {
    const [url, options] = args;

    console.log("➡️ FETCH REQUEST:");
    console.log("URL:", url);
    console.log("METHOD:", options?.method || "GET");
    console.log("BODY:", options?.body);

    const response = await originalFetch(...args);

    const clone = response.clone();

    let data;
    try {
      data = await clone.json();
    } catch {
      data = "Non-JSON response";
    }

    console.log("⬅️ FETCH RESPONSE:");
    console.log("URL:", url);
    console.log("STATUS:", response.status);
    console.log("DATA:", data);

    return response;

  } catch (error) {
    console.log("❌ FETCH ERROR:", error);
    throw error;
  }
};