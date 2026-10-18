import dns from "dns/promises";
import net from "net";
import { env } from "../config/env.js";
import { UrlNotAllowedError } from "../lib/errors.js";

// Private and reserved IP blocks
function isPrivateIpV4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [b0, b1] = parts;
  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 10.0.0.0/8 (Private)
  if (b0 === 10) return true;
  // 172.16.0.0/12 (Private)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (b0 === 192 && b1 === 168) return true;
  // 169.254.0.0/16 (Link-local & AWS/GCP metadata)
  if (b0 === 169 && b1 === 254) return true;
  // 100.64.0.0/10 (Shared address space)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (b0 >= 224) return true;

  return false;
}

function isPrivateIpV6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  // Loopback ::1
  if (normalized === "::1" || normalized === "0000:0000:0000:0000:0000:0000:0000:0001") return true;
  // Unspecified ::
  if (normalized === "::") return true;
  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (normalized.startsWith("::ffff:") || normalized.startsWith("0:0:0:0:0:ffff:")) {
    const ipv4Part = normalized.split(":").pop();
    if (ipv4Part && net.isIPv4(ipv4Part)) {
      return isPrivateIpV4(ipv4Part);
    }
    return true;
  }
  // Unique local fc00::/7
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  // Link-local fe80::/10
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;

  return false;
}

export function isPrivateIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIpV4(ip);
  if (family === 6) return isPrivateIpV6(ip);
  return true; // Unknown or invalid IP is treated as unsafe
}

function isHostPortAllowedByAllowlist(hostname: string, port: string): boolean {
  if (!env.SSRF_ALLOWLIST) return false;
  const allowed = env.SSRF_ALLOWLIST.split(",").map((s) => s.trim().toLowerCase());
  const target = `${hostname.toLowerCase()}:${port}`;
  return allowed.includes(target) || allowed.includes(hostname.toLowerCase());
}

/**
 * Validates URL against SSRF policy and resolves DNS to ensure all destination IPs are public.
 */
export async function validateUrlForSsrf(urlString: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new UrlNotAllowedError("Malformed URL");
  }

  // Protocol check
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UrlNotAllowedError("Only HTTP and HTTPS protocols are permitted");
  }

  // Credentials check
  if (parsed.username || parsed.password) {
    throw new UrlNotAllowedError("URLs with embedded credentials are not allowed");
  }

  // Max URL length check
  if (urlString.length > 2048) {
    throw new UrlNotAllowedError("URL exceeds maximum length of 2048 characters");
  }

  const defaultPort = parsed.protocol === "https:" ? "443" : "80";
  const port = parsed.port || defaultPort;

  // Check allowlist first (e.g. localhost:4100 demo target in development)
  if (isHostPortAllowedByAllowlist(parsed.hostname, port)) {
    return parsed;
  }

  // Port restrictions in production
  if (env.NODE_ENV === "production") {
    const allowedPorts = new Set(["80", "443", "8080", "8443"]);
    if (!allowedPorts.has(port)) {
      throw new UrlNotAllowedError(`Port ${port} is not allowed`);
    }
  }

  // Check if hostname is direct IP literal
  if (net.isIP(parsed.hostname)) {
    if (isPrivateIp(parsed.hostname)) {
      throw new UrlNotAllowedError("Requests to private or loopback IP addresses are blocked");
    }
    return parsed;
  }

  // Resolve hostname via DNS and check ALL returned addresses
  try {
    const addresses = await dns.lookup(parsed.hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new UrlNotAllowedError(`Could not resolve hostname: ${parsed.hostname}`);
    }

    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        throw new UrlNotAllowedError(
          `Resolved IP ${record.address} is in a reserved or private range`
        );
      }
    }
  } catch (err: any) {
    if (err instanceof UrlNotAllowedError) throw err;
    throw new UrlNotAllowedError(`DNS resolution failed for hostname ${parsed.hostname}: ${err.message}`);
  }

  return parsed;
}
