/**
 * script de prueba para validar la configuración de las API Keys del Hackathon
 * Ejecución: node --env-file=.env test-keys.js
 */

console.log("=== Verificando Variables de Entorno ===");

const keys = {
  BAND_API_KEY: process.env.BAND_API_KEY,
  BAND_AGENT_ID: process.env.BAND_AGENT_ID,
  AIML_API_KEY: process.env.AIML_API_KEY,
  FEATHERLESS_API_KEY: process.env.FEATHERLESS_API_KEY,
};

let allConfigured = true;
for (const [name, val] of Object.entries(keys)) {
  if (!val || val.includes("_aqui")) {
    console.warn(`[MISSING] ${name} is not configured or has the default value.`);
    allConfigured = false;
  } else {
    console.log(`[OK] ${name} is configured: "${val.substring(0, 6)}...${val.substring(val.length - 4)}"`);
  }
}

if (!allConfigured) {
  console.log("\n[WARNING] Please edit your `.env` file at the root of the project to set your real keys.");
}

async function testAPIs() {
  console.log("\n=== Realizando pruebas de conexión ===");

  // 1. Probar AI/ML API
  if (keys.AIML_API_KEY && !keys.AIML_API_KEY.includes("_aqui")) {
    try {
      console.log("Pinging AI/ML API...");
      const res = await fetch("https://api.aimlapi.com/v1/models", {
        headers: {
          "Authorization": `Bearer ${keys.AIML_API_KEY}`,
        },
      });
      if (res.ok) {
        console.log("[OK] AI/ML API: Connection successful! Valid key.");
      } else {
        console.error(`[ERROR] AI/ML API failed with status: ${res.status} (${res.statusText})`);
        const body = await res.text().catch(() => "");
        console.error(`Detail: ${body}`);
      }
    } catch (e) {
      console.error("[ERROR] AI/ML API: Network or connection error:", e.message);
    }
  }

  // 2. Probar Featherless AI
  if (keys.FEATHERLESS_API_KEY && !keys.FEATHERLESS_API_KEY.includes("_aqui")) {
    try {
      console.log("Pinging Featherless AI...");
      const res = await fetch("https://api.featherless.ai/v1/models", {
        headers: {
          "Authorization": `Bearer ${keys.FEATHERLESS_API_KEY}`,
        },
      });
      if (res.ok) {
        console.log("[OK] Featherless AI: Connection successful! Valid key.");
      } else {
        console.error(`[ERROR] Featherless AI failed with status: ${res.status} (${res.statusText})`);
        const body = await res.text().catch(() => "");
        console.error(`Detail: ${body}`);
      }
    } catch (e) {
      console.error("[ERROR] Featherless AI: Network or connection error:", e.message);
    }
  }

  // 3. Probar Band.ai API
  if (keys.BAND_API_KEY && !keys.BAND_API_KEY.includes("_aqui")) {
    try {
      console.log("Pinging Band.ai API...");
      // Hacemos una petición simple a /api/v1/chats o similar pasándole la API key
      const res = await fetch("https://app.band.ai/api/v1/me", {
        headers: {
          "X-API-Key": keys.BAND_API_KEY,
        },
      });
      if (res.ok) {
        console.log("[OK] Band.ai API: Connection successful! Valid key.");
      } else if (res.status === 401 || res.status === 403) {
        console.warn(`[WARNING] Band.ai API returned: ${res.status} (Key might be invalid or needs other permissions).`);
      } else {
        // In some cases /me does not exist but a 404 status with authorized credentials indicates key is valid
        console.log(`[INFO] Band.ai API responded with status: ${res.status} (${res.statusText}).`);
      }
    } catch (e) {
      console.error("[ERROR] Band.ai API: Network or connection error:", e.message);
    }
  }
}

testAPIs();
