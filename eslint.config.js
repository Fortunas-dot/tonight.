// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // design-src/ is the original web design export, kept for reference only — not part of the app.
    ignores: ["dist/*", "design-src/**"],
  },
  {
    // Supabase Edge Functions run on Deno, which resolves npm: imports itself.
    files: ["supabase/functions/**"],
    rules: { "import/no-unresolved": "off" },
  },
]);
