declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    CONNECTORS?: import("./lib/connector-contract.mjs").ConnectorBinding;
    APP_BASE_URL?: string;
    EMAIL_API_KEY?: string;
    EMAIL_FROM?: string;
    AUTH_TEST_MODE?: string;
  }
}
