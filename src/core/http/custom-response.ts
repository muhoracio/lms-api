import type { ServerResponse } from "node:http";
import { InternalServerError } from "../utils/errors.js";

export interface CustomResponse extends ServerResponse {
  status(statusCode: number): CustomResponse;
  json(data: any): CustomResponse;
  setCookie(cookie: string): void;
}

export default function customResponse(response: ServerResponse) {
  const res = response as CustomResponse;

  res.status = (statusCode) => {
    res.statusCode = statusCode;
    return res;
  };

  res.json = (data) => {
    const contentTypeValue =
      data instanceof Error ? "application/problem+json" : "application/json";
    res.setHeader("Content-Type", contentTypeValue);

    try {
      res.end(JSON.stringify(data));
    } catch {
      res.status(500).end(new InternalServerError());
    } finally {
      return res;
    }
  };

  res.setCookie = (cookie) => {
    const current = res.getHeader("Set-Cookie");

    if (!current) {
      res.setHeader("Set-Cookie", [cookie]);
      return;
    }

    if (Array.isArray(current)) {
      current.push(cookie);
      res.setHeader("Set-Cookie", current);
      return;
    }

    res.setHeader("Set-Cookie", [String(current), cookie]);
  };

  return res;
}
