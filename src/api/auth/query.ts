import { Query } from "../../core/utils/abstract.js";

export type UserRole = "admin" | "editor" | "user";

type UserData = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  password_hash: string;
  created: string;
  updated: string;
};

type UserCreate = Omit<UserData, "id" | "created" | "updated">;

type SessionData = {
  sid_hash: Buffer;
  user_id: number;
  created: number;
  expires: number;
  ip: string;
  ua: string;
  revoked: 0 | 1;
};

type SessionCreate = Omit<SessionData, "created" | "expires" | "revoked"> & {
  expires_ms: number;
};

type ResetData = {
  token_hash: Buffer;
  user_id: number;
  created: number;
  expires: number;
  ip: string;
  ua: string;
};

type ResetCreate = Omit<ResetData, "created" | "expires"> & {
  expires_ms: number;
};

class AuthQuery extends Query {
  insertUser({ name, username, email, role, password_hash }: UserCreate) {
    return this.db
      .query(
        /* sql */ `
        INSERT OR IGNORE INTO "users"
          ("name", "username", "email", "role", "password_hash")
        VALUES
          (?, ?, ?, ?, ?)
        ;
      `,
      )
      .run(name, username, email, role, password_hash);
  }
  selectUser(key: "email" | "username" | "id", value: string | number) {
    return this.db
      .query(
        /* sql */ `
          SELECT "id", "email", "password_hash" FROM "users"
          WHERE ${key} = ?;
        `,
      )
      .get(value) as
      | { id: number; email: string; password_hash: string }
      | undefined;
  }
  selectUsers(search: string = "", limit: number = 10, page: number = 1) {
    const s = `%${search.trim()}%`;
    const safeLimit = limit < 100 ? limit : 100;
    const offset = (page - 1) * safeLimit;
    return this.db
      .query(
        /* sql */ `
          SELECT "id", "name", "email", "username", "created",
          COUNT("id") OVER() AS "total"
          FROM "users"
          WHERE "name" LIKE ? OR "username" LIKE ? OR "email" LIKE ?
          ORDER BY "created" DESC
          LIMIT ? OFFSET ?;
        `,
      )
      .all(s, s, s, safeLimit, offset) as {
      id: number;
      name: string;
      email: string;
      username: string;
      created: string;
      total: number;
    }[];
  }
  updateUserPassword(user_id: number, password_hash: string) {
    return this.db
      .query(
        /* sql */ `
          UPDATE "users"
          SET "password_hash" = ?
          WHERE "id" = ?;
        `,
      )
      .run(password_hash, user_id);
  }
  insertSession({ sid_hash, user_id, expires_ms, ip, ua }: SessionCreate) {
    return this.db
      .query(
        /* sql */ `
        INSERT OR IGNORE INTO "sessions"
          ("sid_hash", "user_id", "expires", "ip", "ua")
        VALUES
          (?, ?, ?, ?, ?)
        RETURNING "sid_hash";
      `,
      )
      .run(sid_hash, user_id, Math.floor(expires_ms / 1000), ip, ua);
  }
  selectSession(sid_hash: Buffer) {
    return this.db
      .query(
        /* sql */ `
        SELECT "s".*, "s"."expires" * 1000 as "expires_ms" 
        FROM "sessions" as "s"
        WHERE "sid_hash" = ?;
      `,
      )
      .get(sid_hash) as (SessionData & { expires_ms: number }) | undefined;
  }
  revokeSession(key: "sid_hash" | "user_id", value: Buffer | number) {
    return this.db
      .query(
        /* sql */ `
        UPDATE "sessions" SET "revoked" = 1
        WHERE ${key} = ?;
      `,
      )
      .run(value);
  }
  updateSessionExpires(sid_hash: Buffer, expires_ms: number) {
    return this.db
      .query(
        /* sql */ `
        UPDATE "sessions"
        SET "expires" = ?
        WHERE "sid_hash" = ?;
      `,
      )
      .run(Math.floor(expires_ms / 1000), sid_hash);
  }
  selectUserRole(id: number) {
    return this.db
      .query(
        /* sql */ `
        SELECT "role" FROM "users"
        WHERE "id" = ?;
      `,
      )
      .get(id) as { role: UserRole } | undefined;
  }
  insertReset({ token_hash, user_id, expires_ms, ip, ua }: ResetCreate) {
    return this.db
      .query(
        /* sql */ `
        INSERT OR IGNORE INTO "resets"
          ("token_hash", "user_id", "expires", "ip", "ua")
        VALUES
          (?, ?, ?, ?, ?)
        RETURNING "token_hash";
      `,
      )
      .run(token_hash, user_id, Math.floor(expires_ms / 1000), ip, ua);
  }
  selectReset(token_hash: Buffer) {
    return this.db
      .query(
        /* sql */ `
        SELECT "r".*, "r"."expires" * 1000 as "expires_ms" 
        FROM "resets" as "r"
        WHERE "token_hash" = ?;
      `,
      )
      .get(token_hash) as (ResetData & { expires_ms: number }) | undefined;
  }
  deleteReset(user_id: number) {
    return this.db
      .query(
        /* sql */ `
        DELETE FROM "resets"
        WHERE "user_id" = ?;
      `,
      )
      .run(user_id);
  }
  clearSessions() {
    return this.db
      .query(
        /* sql */ `
        DELETE FROM "sessions"
        WHERE "expires" < UNIXEPOCH('now');
        `,
      )
      .run();
  }
}

export default AuthQuery;
