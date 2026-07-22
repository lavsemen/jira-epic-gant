/// <reference types="vite/client" />

declare const __BACKEND_URL__: string;
declare const __JIRA_HOST__: string;
declare const __CANCELLED_STATUS_IDS__: string;

declare module '*.css?inline' {
  const css: string;
  export default css;
}
