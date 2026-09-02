import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_request, response) =>
  response.json({ data: { status: "ok" }, error: null }),
);
app.get("/v1/me", (_request, response) =>
  response
    .status(501)
    .json({
      data: null,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Authentication module is not configured yet.",
      },
    }),
);
app.get("/v1/reports", (_request, response) =>
  response.json({ data: [], error: null }),
);

app.use(
  (
    _error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    response
      .status(500)
      .json({
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred.",
        },
      });
  },
);

app.listen(port, () =>
  console.log(`CUT SmartFix API listening on http://localhost:${port}`),
);
