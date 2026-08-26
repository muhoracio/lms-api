import rateLimit from "../../core/middleware/rate-limit.js";
import { Api } from "../../core/utils/abstract.js";
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../core/utils/errors.js";
import v from "../../core/utils/validate.js";
import AuthMiddleware from "./middleware/auth.js";
import AuthQuery from "./query.js";
import SessionService, { COOKIE_SID_KEY } from "./services/session.js";
import { tables } from "./tables.js";
import Password from "./utils/password.js";
import { PEPPER } from "../../env.js";

class AuthApi extends Api {
  query = new AuthQuery(this.db);
  session = new SessionService(this.core);
  auth = new AuthMiddleware(this.core);
  pass = new Password(PEPPER);
  handlers = {
    postUser: async (req, res) => {
      const { name, username, email, password } = {
        name: v.string(req.body.name),
        username: v.string(req.body.username),
        email: v.email(req.body.email),
        password: v.password(req.body.password),
      };

      const emailExists = this.query.selectUser("email", email);
      if (emailExists) {
        throw new ConflictError(
          "O e-mail informado já está cadastrado no sistema.",
        );
      }

      const usernameExists = this.query.selectUser("username", username);
      if (usernameExists) {
        throw new ConflictError(
          "O username informado já está cadastrado no sistema.",
        );
      }

      const password_hash = await this.pass.hash(password);

      const writeResult = this.query.insertUser({
        name,
        username,
        email,
        role: "user",
        password_hash,
      });

      if (!writeResult || writeResult.changes === 0) {
        throw new ValidationError("Erro ao criar usuário.");
      }

      return res.status(201).json({
        title: "Usuário criado.",
      });
    },

    postLogin: async (req, res) => {
      const { email, password } = {
        email: v.email(req.body.email),
        password: v.password(req.body.password),
      };

      const user = this.query.selectUser("email", email);
      if (!user || !user.id) {
        throw new ValidationError("E-mail ou senha incorretos.");
      }

      const validPassword = await this.pass.verify(
        password,
        user.password_hash,
      );
      if (!validPassword) {
        throw new ValidationError("E-mail ou senha incorretos.");
      }

      const { cookie } = await this.session.create({
        userId: user.id as number,
        ip: req.ip,
        ua: req.headers["user-agent"] ?? "",
      });

      res.setCookie(cookie);
      return res.status(200).json({ title: "Usuário autenticado." });
    },

    getSession: (req, res) => {
      if (!req.session) {
        throw new UnauthorizedError("Não autorizado.");
      }
      return res
        .status(200)
        .json({ title: "Sessão válida.", role: req.session.role });
    },

    deleteSession: (req, res) => {
      const sid = req.cookies[COOKIE_SID_KEY];
      const { cookie } = this.session.invalidate(sid);
      res.setCookie(cookie);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Vary", "Cookie");
      return res.status(204).json({ title: "Logout" });
    },

    passwordUpdate: async (req, res) => {
      const { password, new_password } = {
        password: v.password(req.body.password),
        new_password: v.password(req.body.new_password),
      };
      if (req.session === null) {
        throw new UnauthorizedError("Não autorizado.");
      }

      const user = this.query.selectUser("id", req.session.user_id);
      if (!user) {
        throw new NotFoundError("Usuário não encontrado.");
      }

      const isValidPassword = await this.pass.verify(
        password,
        user.password_hash,
      );
      if (!isValidPassword) {
        throw new ValidationError("Senha atual incorreta.");
      }

      const newPasswordHash = await this.pass.hash(new_password);
      const updateResult = this.query.updateUserPassword(
        user.id,
        newPasswordHash,
      );
      if (!updateResult || updateResult.changes === 0) {
        throw new ValidationError("Erro ao alterar senha.");
      }

      this.session.invalidateAll(user.id);
      const { cookie } = await this.session.create({
        userId: user.id,
        ip: req.ip,
        ua: req.headers["user-agent"] ?? "",
      });
      res.setCookie(cookie);

      return res.status(200).json({ title: "Senha alterada com sucesso!" });
    },

    passwordForgot: async (req, res) => {
      const { email } = {
        email: v.email(req.body.email),
      };

      const user = this.query.selectUser("email", email);
      if (!user) {
        return res.status(200).json({ title: "Verifique seu e-mail." });
      }

      const { token } = await this.session.resetToken({
        userId: user.id,
        ip: req.ip,
        ua: req.headers["user-agent"] || "",
      });

      const resetLink = `${req.baseurl}/#/resetar/?token=${token}`;

      const mailContent = {
        to: user.email,
        subject: "Resetar Senha",
        body: `Utilize o link abaixo para resetar a sua senha: \r\n ${resetLink}`,
      };

      const { ok } = await this.mail.send(mailContent);
      if (!ok) {
        throw new InternalServerError({
          message: "Erro ao enviar e-mail.",
        });
      }

      return res.status(200).json({ title: "Verifique seu e-mail." });
    },

    passwordReset: async (req, res) => {
      const { new_password, token } = {
        new_password: v.password(req.body.new_password),
        token: v.string(req.body.token),
      };

      const reset = this.session.validateToken(token);
      if (!reset) {
        throw new ValidationError("Token inválido.");
      }

      const new_password_hash = await this.pass.hash(new_password);
      const updateResult = this.query.updateUserPassword(
        reset.user_id,
        new_password_hash,
      );
      if (!updateResult || updateResult.changes === 0) {
        throw new ValidationError("Erro ao atualizar senha.");
      }

      return res.status(200).json({ title: "Senha atualizada com sucesso!" });
    },

    searchUsers: async (req, res) => {
      const { s, page } = {
        s: v.o.string(req.query.get("s")),
        page: v.o.number(req.query.get("page")),
      };
      const result = this.query.selectUsers(s, 5, page);
      if (result.length === 0) {
        res.setHeader("X-Total-Count", String(0));
        return res.status(200).json([]);
      }
      res.setHeader("X-Total-Count", String(result[0]?.total));
      return res.status(200).json(result);
    },
  } satisfies Api["handlers"];
  tables = () => {
    this.db.exec(tables);
    this.query.clearSessions();
    setInterval(
      () => {
        this.query.clearSessions();
      },
      1000 * 60 * 60 * 6,
    ).unref();
  };
  routes() {
    this.router.post(
      "/auth/user",
      rateLimit(30_000, 15),
      this.handlers.postUser,
    );
    this.router.post(
      "/auth/login",
      rateLimit(30_000, 5),
      this.handlers.postLogin,
    );
    this.router.get(
      "/auth/session",
      this.auth.guard("user"),
      this.handlers.getSession,
    );
    this.router.delete(
      "/auth/logout",
      this.auth.guard("user"),
      this.handlers.deleteSession,
    );
    this.router.put(
      "/auth/password/update",
      this.auth.guard("user"),
      this.handlers.passwordUpdate,
    );
    this.router.post(
      "/auth/password/forgot",
      rateLimit(30_000, 5),
      this.handlers.passwordForgot,
    );
    this.router.post(
      "/auth/password/reset",
      rateLimit(30_000, 5),
      this.handlers.passwordReset,
    );
    this.router.get(
      "/auth/users/search",
      this.auth.guard("admin"),
      this.handlers.searchUsers,
    );
  }
}

export default AuthApi;
