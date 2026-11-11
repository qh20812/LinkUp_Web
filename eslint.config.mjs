import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Không dùng dialog mặc định của trình duyệt — dùng ConfirmDialog/toast.
  {
    rules: {
      "no-alert": "error",
      "no-restricted-properties": [
        "error",
        { object: "window", property: "confirm", message: "Dùng ConfirmDialog thay vì window.confirm." },
        { object: "window", property: "alert", message: "Dùng toast/modal thay vì window.alert." },
        { object: "window", property: "prompt", message: "Dùng modal form thay vì window.prompt." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
