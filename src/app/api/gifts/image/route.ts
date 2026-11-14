import { imageFor } from "@/lib/engine/gifts";

/**
 * The picture of a product the gift search found, by its URL, so the /chat page can show it above the product link.
 * It only reads what the search already stored: no request leaves the server, so it needs no access code.
 */
export function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") ?? "";
  const image = url.length <= 2000 ? imageFor(url) : undefined;
  return image
    ? Response.json({ image }, { headers: { "cache-control": "private, max-age=3600" } })
    : Response.json({ error: "no image" }, { status: 404 });
}
