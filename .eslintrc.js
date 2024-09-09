module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    "jest/globals": true,
  },
  extends: [
    "plugin:editorconfig/all",
    "standard",
    "plugin:prettier/recommended",
  ],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {
    "max-len": ["error", 100, 4],
    curly: "error",
  },
  plugins: ["jest", "editorconfig"],
};
