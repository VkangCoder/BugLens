let envPromise: Promise<EnvConfig> | undefined;

export function loadEnv(): Promise<EnvConfig> {
  envPromise ??= fetch(chrome.runtime.getURL(".env"))
    .then((res) => {
      if (!res.ok) throw new Error("Missing .env file in extension folder");
      return res.text();
    })
    .then((text) => {
      const env: Record<string, string> = {};
      for (const line of text.split(/\r?\n/)) {
        if (line.trim().startsWith("#")) continue;
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
        if (match) {
          env[match[1]] = match[2].replace(/^["']|["']$/g, "");
        }
      }
      return env as unknown as EnvConfig;
    })
    .catch((err: unknown) => {
      envPromise = undefined;
      throw err;
    });

  return envPromise;
}
