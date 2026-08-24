import type { IncomingMessage } from "node:http";
import parseCookies from "../utils/parse-cookies.js";
import type { UserRole } from "../../api/auth/query.js";
import { SERVER_NAME } from "../../env.js";

export interface CustomRequest extends IncomingMessage {
  query: URLSearchParams;
  pathname: string;
  body: Record<string, unknown>;
  params: Record<string, string>;
  cookies: Record<string, string | undefined>;
  session: { user_id: number; role: UserRole; expires_ms: number } | null;
  ip: string;
  baseurl: string;
}

function getIp(ip: string | string[] | undefined): string {
  if (typeof ip === "string") return ip.split(",")[0]?.trim() || "";
  if (Array.isArray(ip) && typeof ip[0] === "string") return ip[0];
  return "";
}

export default async function customRequest(request: IncomingMessage) {
  const req = request as CustomRequest;
  req.baseurl = `https://${SERVER_NAME}`;

  req.body = {};
  req.params = {};

  const url = new URL(req.url || "/", req.baseurl);
  req.query = url.searchParams;
  req.pathname = url.pathname;

  req.cookies = parseCookies(req.headers.cookie);
  req.session = null;

  req.ip = getIp(req.headers["x-forwarded-for"]);

  return req;
}
