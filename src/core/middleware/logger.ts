import type { Middleware } from "../router.js";

const logger: Middleware = (req, res) => {
  console.log(`${Date.now()} ${req.method} ${req.pathname}`);
};

export default logger;
