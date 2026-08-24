import type { Middleware } from "../router.js";
import { TooManyRequestsError } from "../utils/errors.js";

type Request = {
  hits: number;
  expires: number;
};

const rateLimit = (time: number, max: number): Middleware => {
  const requests = new Map<string, Request>();

  setInterval(
    () => {
      const now = Date.now();
      for (const [key, item] of requests) {
        if (now >= item.expires) {
          requests.delete(key);
        }
      }
    },
    30 * 60 * 1000,
  ).unref();

  return (req, res) => {
    const now = Date.now();
    const key = req.ip;

    let request = requests.get(key);
    if (!request || now >= request.expires) {
      request = {
        hits: 0,
        expires: now + time,
      };
      requests.set(key, request);
    }

    request.hits += 1;

    const tLeft = Math.ceil((request.expires - now) / 1000);
    const rLeft = Math.max(0, max - request.hits);
    res.setHeader("RateLimit", `"default";r=${rLeft};t=${tLeft}`);

    const timeSec = Math.ceil(time / 1000);
    res.setHeader("RateLimit-Policy", `"default";q=${max};w=${timeSec}`);

    if (request.hits > max) {
      res.setHeader("Retry-After", `${timeSec}`);
      throw new TooManyRequestsError();
    }
  };
};

export default rateLimit;
