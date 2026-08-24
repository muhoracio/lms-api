import { createServer, type RequestListener, type Server } from "node:http";
import Router from "./router.js";
import Database from "./database.js";

import customRequest from "./http/custom-request.js";
import customResponse, { type CustomResponse } from "./http/custom-response.js";

import bodyJson from "./middleware/body-json.js";
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  PayloadTooLargeError,
  TooManyRequestsError,
  UnauthorizedError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "./utils/errors.js";
import { DB_PATH } from "../env.js";

class Core {
  router: Router;
  server: Server;
  db: Database;
  constructor() {
    this.router = new Router();
    this.router.use(bodyJson);
    this.db = new Database(DB_PATH);
    this.server = createServer(this.handler);
  }
  handler: RequestListener = async (request, response) => {
    const res = customResponse(response);
    try {
      const req = await customRequest(request);

      for (const middleware of this.router.middlewares) {
        await middleware(req, res);
      }

      const matched = this.router.find(req.method || "", req.pathname);
      if (!matched) {
        throw new NotFoundError("Rota não encontrada.");
      }

      const { route, params } = matched;
      req.params = params;

      for (const middleware of route.middlewares) {
        await middleware(req, res);
      }

      await route.handler(req, res);
    } catch (error) {
      this.errorHandler(error, res);
    }
  };
  errorHandler(error: unknown, res: CustomResponse) {
    if (
      error instanceof PayloadTooLargeError ||
      error instanceof TooManyRequestsError ||
      error instanceof NotFoundError ||
      error instanceof ValidationError ||
      error instanceof UnauthorizedError ||
      error instanceof ForbiddenError ||
      error instanceof ConflictError ||
      error instanceof UnsupportedMediaTypeError
    ) {
      return res.status(error.statusCode).json(error);
    }

    const publicErrorObject = new InternalServerError({
      cause: error,
    });

    console.error(publicErrorObject);

    return res.status(publicErrorObject.statusCode).json(publicErrorObject);
  }
  init() {
    this.server.listen(3000, () =>
      console.log("Server listen on http://localhost:3000"),
    );
    // this.server.on("clientError", (error, socket) => {
    //   console.error(error);
    //   socket.destroy();
    // });
  }
}

export default Core;
