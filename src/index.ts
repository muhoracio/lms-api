import Core from "./core/core.js";
import AuthApi from "./api/auth/index.js";
import LmsApi from "./api/lms/index.js";
import FilesApi from "./api/files/index.js";
import logger from "./core/middleware/logger.js";
import rateLimit from "./core/middleware/rate-limit.js";

const core = new Core();

// Global Middlewares
core.router.use(logger, rateLimit(10_000, 100));

new AuthApi(core).init();
new LmsApi(core).init();
new FilesApi(core).init();

core.init();

function shutdown(signal: string) {
  console.log(signal);
  core.server.close(() => {
    console.log("HTTP server closed.");
    core.db.close();
    process.exit(0);
  });
  core.server.closeAllConnections();
  setTimeout(() => {
    process.exit(0);
  }, 5_000).unref();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
