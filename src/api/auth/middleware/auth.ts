import type { Middleware } from "../../../core/router.js";
import { CoreProvider } from "../../../core/utils/abstract.js";
import {
  ForbiddenError,
  UnauthorizedError,
} from "../../../core/utils/errors.js";
import type { UserRole } from "../query.js";
import SessionService, { COOKIE_SID_KEY } from "../services/session.js";

class AuthMiddleware extends CoreProvider {
  private session = new SessionService(this.core);

  private roleCheck = (requiredRole: UserRole, userRole: UserRole): boolean => {
    switch (userRole) {
      case "admin":
        return true;
      case "editor":
        return requiredRole === "editor" || requiredRole === "user";
      case "user":
        return requiredRole === "user";
      default:
        return false;
    }
  };

  guard = (role: UserRole): Middleware => {
    return async (req, res) => {
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Vary", "Cookie");

      const sid = req.cookies[COOKIE_SID_KEY];
      if (!sid) {
        throw new UnauthorizedError("Não autorizado.");
      }

      const { valid, cookie, session } = this.session.validate(sid);
      res.setCookie(cookie);

      if (!valid || !session) {
        throw new UnauthorizedError("Não autorizado.");
      }

      if (!this.roleCheck(role, session.role)) {
        throw new ForbiddenError("Sem permissão.");
      }

      req.session = session;
    };
  };

  optional: Middleware = async (req, res) => {
    const sid = req.cookies[COOKIE_SID_KEY];
    if (!sid) return;

    const { valid, cookie, session } = this.session.validate(sid);
    res.setCookie(cookie);

    if (!valid || !session) return;

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Cookie");

    req.session = session;
  };
}

export default AuthMiddleware;
