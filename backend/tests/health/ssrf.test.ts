import { describe, it, expect } from "vitest";
import { isPrivateIp, validateUrlForSsrf } from "../../src/health/ssrfGuard.js";

describe("SSRF Guard - IP Range Checks", () => {
  it("blocks IPv4 loopback and private blocks", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("127.255.255.255")).toBe(true);
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true); // AWS/GCP metadata
    expect(isPrivateIp("0.0.0.0")).toBe(true);
    expect(isPrivateIp("100.64.0.1")).toBe(true);
  });

  it("blocks IPv6 loopback and link-local ranges", () => {
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true);
    expect(isPrivateIp("fc00::1")).toBe(true);
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:192.168.1.1")).toBe(true);
  });

  it("allows public IP addresses", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
    expect(isPrivateIp("104.26.14.225")).toBe(false);
  });
});

describe("SSRF Guard - URL Validation", () => {
  it("rejects non-http/https protocols", async () => {
    await expect(validateUrlForSsrf("ftp://example.com/file")).rejects.toThrow(
      "Only HTTP and HTTPS protocols are permitted"
    );
    await expect(validateUrlForSsrf("file:///etc/passwd")).rejects.toThrow(
      "Only HTTP and HTTPS protocols are permitted"
    );
  });

  it("rejects URLs with embedded credentials", async () => {
    await expect(validateUrlForSsrf("http://admin:secret@example.com")).rejects.toThrow(
      "URLs with embedded credentials are not allowed"
    );
  });

  it("rejects direct private IP requests", async () => {
    await expect(validateUrlForSsrf("http://192.168.1.50/api")).rejects.toThrow(
      "Requests to private or loopback IP addresses are blocked"
    );
    await expect(validateUrlForSsrf("http://169.254.169.254/latest/meta-data")).rejects.toThrow(
      "Requests to private or loopback IP addresses are blocked"
    );
  });

  it("permits allowlisted demo target in development", async () => {
    const url = await validateUrlForSsrf("http://localhost:4100/svc/shop-api");
    expect(url.hostname).toBe("localhost");
    expect(url.port).toBe("4100");
  });
});
