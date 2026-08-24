import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Api } from "../../core/utils/abstract.js";
import {
  InternalServerError,
  NotFoundError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "../../core/utils/errors.js";
import v from "../../core/utils/validate.js";
import { checkETag, cropImage, LimitBytes, mimeType } from "./utils.js";
import { randomUUID } from "node:crypto";
import AuthMiddleware from "../auth/middleware/auth.js";
import { FILES_PATH } from "../../env.js";

const MAX_BYTES = 150 * 1024 * 1024; // 150 MB

class FilesApi extends Api {
  auth = new AuthMiddleware(this.core);
  handlers = {
    publicFile: async (req, res) => {
      const name = v.file(req.params.name);
      const filePath = path.join(FILES_PATH, "public", name);
      const ext = path.extname(name);

      let st;
      try {
        st = await stat(filePath);
      } catch (error) {
        throw new NotFoundError("Arquivo não encontrado.");
      }

      const etag = `W/${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}`;
      res.setHeader("ETag", etag);
      res.setHeader("Content-Length", st.size);
      res.setHeader("Last-Modified", st.mtime.toUTCString());
      res.setHeader(
        "Content-Type",
        mimeType[ext] || "application/octet-stream",
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");

      if (checkETag(req.headers["if-none-match"], etag)) {
        return res.status(304).end();
      }

      res.status(200);
      const file = createReadStream(filePath);
      await pipeline(file, res);
    },

    uploadFile: async (req, res) => {
      if (req.headers["content-type"] !== "application/octet-stream") {
        throw new UnsupportedMediaTypeError(
          'Use "octet-stream" no cabeçalho "Content-Type".',
        );
      }

      const contentLength = Number(req.headers["content-length"]);
      if (!Number.isInteger(contentLength)) {
        throw new ValidationError('Invalid "Content-Length" header value.');
      }
      if (contentLength > MAX_BYTES) {
        throw new PayloadTooLargeError();
      }

      const name = v.file(req.headers["x-filename"]);
      const visibility =
        v.o.string(req.headers["x-visibility"]) === "public"
          ? "public"
          : "private";
      const now = Date.now();
      const ext = path.extname(name);
      const finalName = `${name.replace(ext, "")}-${now}${ext}`;

      const tmpPath = path.join(FILES_PATH, visibility, `${randomUUID()}.temp`);
      const writePath = path.join(FILES_PATH, visibility, finalName);
      const write = createWriteStream(tmpPath, { flags: "wx" });

      try {
        await pipeline(req, LimitBytes(MAX_BYTES), write);
        await rename(tmpPath, writePath);
        if ([".jpg", ".jpeg", ".png"].includes(ext)) {
          await cropImage(writePath, 320, 200);
        }
        return res.status(201).json({
          path: writePath,
          name: finalName,
        });
      } catch (error) {
        throw error;
      } finally {
        await rm(tmpPath, { force: true }).catch(() => {});
      }
    },

    privateFile: async (req, res) => {
      const name = v.file(req.params.name);
      res.setHeader("X-Accel-Redirect", name);
      res.status(200).end();
    },
  } satisfies Api["handlers"];
  routes() {
    this.router.get("/files/public/:name", this.handlers.publicFile);
    this.router.get(
      "/files/private/:name",
      this.auth.guard("user"),
      this.handlers.privateFile,
    );
    this.router.post("/files/upload", this.handlers.uploadFile);
  }
}

export default FilesApi;
