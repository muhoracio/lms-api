import type Core from "../core.js";
import type { Handler } from "../router.js";

export abstract class CoreProvider {
  protected core: Core;
  protected router: Core["router"];
  protected db: Core["db"];
  constructor(core: Core) {
    this.core = core;
    this.router = core.router;
    this.db = core.db;
  }
}

export abstract class Api extends CoreProvider {
  query: Query | undefined;
  handlers: Record<string, Handler> = {};
  routes(): void {}
  tables(): void {}
  init() {
    this.tables();
    this.routes();
  }
}

export abstract class Query {
  protected db: Core["db"];
  constructor(db: Core["db"]) {
    this.db = db;
  }
}
