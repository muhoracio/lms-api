import type { Middleware } from "../router.js";
import { PayloadTooLargeError, ValidationError } from "../utils/errors.js";

const MAX_BYTES = 1_000_000;

const bodyJson: Middleware = async (req, res) => {
  if (!req.headers["content-type"]?.startsWith("application/json")) {
    return;
  }

  const contentLength = Number(req.headers["content-length"]);
  if (!Number.isInteger(contentLength)) {
    throw new ValidationError('Invalid "Content-Length" header value.');
  }
  if (contentLength > MAX_BYTES) {
    throw new PayloadTooLargeError();
  }

  const chunks: Buffer[] = [];
  let size = 0;

  try {
    for await (const chunk of req) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buf.length;
      if (size > MAX_BYTES) {
        throw new PayloadTooLargeError();
      }
      chunks.push(buf);
    }
  } catch (error) {
    throw new ValidationError("Invalid payload body.");
  }

  try {
    const body = Buffer.concat(chunks).toString("utf-8");
    if (body === "") {
      req.body = {};
      return;
    }
    req.body = JSON.parse(body);
  } catch (error) {
    throw new ValidationError("Invalid JSON body.");
  }
};

export default bodyJson;
