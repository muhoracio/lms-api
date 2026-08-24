import type { CustomRequest } from "./http/custom-request.ts";
import type { CustomResponse } from "./http/custom-response.ts";

type HandlerReturn = Promise<void | CustomResponse> | void | CustomResponse;

export type Handler = (
  req: CustomRequest,
  res: CustomResponse,
) => HandlerReturn;

export type Middleware = (
  req: CustomRequest,
  res: CustomResponse,
) => HandlerReturn;

type Routes = {
  [method: string]: {
    [path: string]: {
      handler: Handler;
      middlewares: Middleware[];
    };
  };
};

export default class Router {
  // Reference for HTTP Methods: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods
  routes: Routes = {
    GET: {},
    HEAD: {},
    POST: {},
    PUT: {},
    DELETE: {},
    CONNECT: {},
    OPTIONS: {},
    TRACE: {},
    PATCH: {},
  };
  middlewares: Middleware[] = [];
  get(route: string, ...handlers: [...Middleware[], Handler]) {
    const handler = handlers.pop() as Handler;
    const middlewares = handlers as Middleware[];
    this.routes["GET"]![route] = { handler, middlewares };
  }
  head(route: string, ...handlers: [...Middleware[], Handler]) {
    const handler = handlers.pop() as Handler;
    const middlewares = handlers as Middleware[];
    this.routes["HEAD"]![route] = { handler, middlewares };
  }
  post(route: string, ...handlers: [...Middleware[], Handler]) {
    const handler = handlers.pop() as Handler;
    const middlewares = handlers as Middleware[];
    this.routes["POST"]![route] = { handler, middlewares };
  }
  put(route: string, ...handlers: [...Middleware[], Handler]) {
    const handler = handlers.pop() as Handler;
    const middlewares = handlers as Middleware[];
    this.routes["PUT"]![route] = { handler, middlewares };
  }
  delete(route: string, ...handlers: [...Middleware[], Handler]) {
    const handler = handlers.pop() as Handler;
    const middlewares = handlers as Middleware[];
    this.routes["DELETE"]![route] = { handler, middlewares };
  }
  connect(route: string, ...handlers: [...Middleware[], Handler]) {
    const handler = handlers.pop() as Handler;
    const middlewares = handlers as Middleware[];
    this.routes["CONNECT"]![route] = { handler, middlewares };
  }
  options(route: string, ...handlers: [...Middleware[], Handler]) {
    const handler = handlers.pop() as Handler;
    const middlewares = handlers as Middleware[];
    this.routes["OPTIONS"]![route] = { handler, middlewares };
  }
  trace(route: string, ...handlers: [...Middleware[], Handler]) {
    const handler = handlers.pop() as Handler;
    const middlewares = handlers as Middleware[];
    this.routes["TRACE"]![route] = { handler, middlewares };
  }
  patch(route: string, ...handlers: [...Middleware[], Handler]) {
    const handler = handlers.pop() as Handler;
    const middlewares = handlers as Middleware[];
    this.routes["PATCH"]![route] = { handler, middlewares };
  }
  use(...middlewares: Middleware[]) {
    this.middlewares.push(...middlewares);
  }
  find(method: string, pathname: string) {
    const routesByMethod = this.routes[method];
    if (!routesByMethod) return null;

    const matchedRoute = routesByMethod[pathname];
    if (matchedRoute) return { route: matchedRoute!, params: {} };

    const pathParts = pathname.split("/").filter(Boolean);
    for (const route of Object.keys(routesByMethod)) {
      if (!route.includes(":")) continue;

      const routeParts = route.split("/").filter(Boolean);
      if (pathParts.length != routeParts.length) continue;
      if (pathParts[0] != routeParts[0]) continue;

      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < pathParts.length; i++) {
        const segment = routeParts[i] ?? "";
        const value = pathParts[i] ?? "";

        if (segment.startsWith(":")) {
          params[segment.slice(1)] = value;
          continue;
        }

        if (!segment.startsWith(":") && segment != value) {
          ok = false;
        }
      }
      if (!ok) continue;

      return { route: routesByMethod[route]!, params: params };
    }

    return null;
  }
}
