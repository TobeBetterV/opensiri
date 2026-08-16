/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface ImagesBinding {
  input(stream: ReadableStream): {
    transform(options: Record<string, unknown>): {
      output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
    };
  };
}

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  // Cloudflare Images is only bound in environments that enable it.
  IMAGES?: ImagesBinding;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      // No width allowlist: the next/image shim requests the exact `width` prop
      // of every image, which almost never lands on Next.js' deviceSizes /
      // imageSizes tables, so an allowlist rejects real requests with 400.
      // `handleImageOptimization` still caps width at 3840 and validates
      // quality plus same-origin paths.
      const images = env.IMAGES;
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        // Without the Images binding the original asset is passed through
        // unchanged instead of failing on every request.
        transformImage: images
          ? async (body, { width, format, quality }) => {
              const result = await images.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
              return result.response();
            }
          : undefined,
      });
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
