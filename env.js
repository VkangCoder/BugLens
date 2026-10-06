let envPromise;

// Read KEY=VALUE pairs from the .env file bundled with the extension
function loadEnv() {
  envPromise ??= fetch(chrome.runtime.getURL(".env"))
    .then((res) => {
      if (!res.ok) throw new Error("Missing .env file in extension folder");
      return res.text();
    })
    .then((text) => {
      const env = {};
      for (const line of text.split(/\r?\n/)) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
        if (match && !line.trim().startsWith("#")) {
          env[match[1]] = match[2].replace(/^["']|["']$/g, "");
        }
      }
      return env;
    })
    .catch((err) => {
      envPromise = undefined;
      throw err;
    });
  return envPromise;
}
