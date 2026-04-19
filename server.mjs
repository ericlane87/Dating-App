import { randomUUID } from "node:crypto";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";

const rootDir = process.cwd();
const rootDirWithSeparator = `${rootDir}/`;
const port = Number(process.env.PORT || 4000);
const maxUploadBytes = 8 * 1024 * 1024;

const loadEnvFile = () => {
  const envPath = join(rootDir, ".env");
  if (!existsSync(envPath)) {
    return;
  }
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      return;
    }
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
};

loadEnvFile();

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
};

const sanitizePathPart = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "member";

const getExtensionForType = (contentType) => {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "";
};

const getBunnyConfig = () => {
  const storageZone = process.env.BUNNY_STORAGE_ZONE;
  const accessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
  const endpoint = process.env.BUNNY_STORAGE_ENDPOINT || "storage.bunnycdn.com";
  const cdnBaseUrl = process.env.BUNNY_CDN_BASE_URL;
  if (!storageZone || !accessKey || !cdnBaseUrl) {
    return null;
  }
  return {
    accessKey,
    cdnBaseUrl: cdnBaseUrl.replace(/\/+$/, ""),
    endpoint: endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, ""),
    storageZone
  };
};

const handleBunnyUpload = async (request, response) => {
  const config = getBunnyConfig();
  if (!config) {
    sendJson(response, 503, {
      error:
        "Bunny is not configured. Set BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY, and BUNNY_CDN_BASE_URL."
    });
    return;
  }

  const contentLength = Number(request.headers["content-length"] || 0);
  if (contentLength > maxUploadBytes) {
    sendJson(response, 413, { error: "Profile photo must be 8MB or smaller." });
    return;
  }

  const webRequest = new Request(`http://localhost${request.url}`, {
    method: request.method,
    headers: request.headers,
    body: Readable.toWeb(request),
    duplex: "half"
  });
  const formData = await webRequest.formData();
  const file = formData.get("photo");
  const userEmail = sanitizePathPart(formData.get("userEmail"));

  if (!(file instanceof File)) {
    sendJson(response, 400, { error: "Missing photo file." });
    return;
  }
  if (file.size > maxUploadBytes) {
    sendJson(response, 413, { error: "Profile photo must be 8MB or smaller." });
    return;
  }

  const extension = getExtensionForType(file.type);
  if (!extension) {
    sendJson(response, 400, {
      error: "Only JPG, PNG, WEBP, and GIF profile photos are supported."
    });
    return;
  }

  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const storagePath = `profile-photos/${userEmail}/${fileName}`;
  const uploadUrl = `https://${config.endpoint}/${config.storageZone}/${storagePath}`;
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      AccessKey: config.accessKey,
      "Content-Type": file.type
    },
    body: Buffer.from(await file.arrayBuffer())
  });

  if (!uploadResponse.ok) {
    const body = await uploadResponse.text().catch(() => "");
    sendJson(response, 502, {
      error: "Bunny upload failed.",
      status: uploadResponse.status,
      details: body.slice(0, 300)
    });
    return;
  }

  sendJson(response, 201, {
    url: `${config.cdnBaseUrl}/${storagePath}`,
    path: storagePath
  });
};

const serveStaticFile = (request, response) => {
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = resolve(rootDir, normalize(relativePath));

  if (filePath !== rootDir && !filePath.startsWith(rootDirWithSeparator)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const contentType = mimeTypes.get(extname(filePath)) || "application/octet-stream";
  response.writeHead(200, { "Content-Type": contentType });
  createReadStream(filePath).pipe(response);
};

const server = createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/bunny/profile-photo") {
    handleBunnyUpload(request, response).catch((error) => {
      console.error(error);
      sendJson(response, 500, { error: "Unable to upload profile photo." });
    });
    return;
  }
  if (request.method === "GET" || request.method === "HEAD") {
    serveStaticFile(request, response);
    return;
  }
  response.writeHead(405, { Allow: "GET, HEAD, POST" });
  response.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`Dating app server running at http://localhost:${port}`);
});
