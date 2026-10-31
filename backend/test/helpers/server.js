"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// A fresh server with fake dependencies. Tests/benchmarks cannot authenticate,
// open a listener, or make a real network/Drive request through this harness.
function createServer({ env = {} } = {}) {
  const routes = new Map();
  const app = {
    disable() {}, use() {}, options() {}, listen() {},
    get(route, handler) { routes.set(`GET ${route}`, handler); },
    post(route, ...handlers) { routes.set(`POST ${route}`, handlers.at(-1)); },
    put(route, handler) { routes.set(`PUT ${route}`, handler); },
  };
  const express = () => app;
  express.json = () => () => {};
  const multer = () => ({ single: () => () => {} });
  multer.memoryStorage = () => ({});
  const credentials = {
    async getAccessToken() { return { token: "fake-token" }; },
  };
  class GoogleAuth {
    async getClient() { return credentials; }
  }
  class OAuth2Client {}
  const context = vm.createContext({
    require(name) {
      if (name === "express") return express;
      if (name === "multer") return multer;
      if (name === "google-auth-library") return { GoogleAuth, OAuth2Client };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    process: { env: { DRIVE_FOLDER_ID: "root", GOOGLE_CLIENT_ID: "test-client", ...env } },
    console: { log() {}, error() {} },
    Buffer, URL, URLSearchParams, setTimeout, clearTimeout,
    fetch: async () => { throw new Error("Unexpected network request in test"); },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../../server.js"), "utf8"), context);
  return { server: context, routes, credentials };
}

module.exports = { createServer };
