import tls from "tls";
import { env } from "../config/env.js";
import { validateUrlForSsrf } from "./ssrfGuard.js";

export interface SslCheckResult {
  isValid: boolean;
  issuer: string | null;
  subject: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  daysRemaining: number | null;
  protocol: string | null;
  errorMessage: string | null;
  isConnectionError?: boolean;
}

function formatCertEntity(entity: tls.Certificate | any): string | null {
  if (!entity) return null;
  if (typeof entity === "string") return entity;
  if (entity.O && entity.CN) return `${entity.O} (${entity.CN})`;
  if (entity.CN) return entity.CN;
  if (entity.O) return entity.O;
  if (entity.OU) return entity.OU;
  return JSON.stringify(entity);
}

/**
 * Connects via TLS to inspect peer SSL certificate and expiration.
 * Handles SNI, self-signed certs, expired certs, and calculates remaining days.
 */
export async function inspectSslCertificate(rawUrl: string): Promise<SslCheckResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = await validateUrlForSsrf(rawUrl);
  } catch (err: any) {
    return {
      isValid: false,
      issuer: null,
      subject: null,
      validFrom: null,
      validTo: null,
      daysRemaining: null,
      protocol: null,
      errorMessage: err.message || "Invalid URL or DNS resolution failed",
      isConnectionError: true,
    };
  }

  if (parsedUrl.protocol !== "https:") {
    return {
      isValid: false,
      issuer: null,
      subject: null,
      validFrom: null,
      validTo: null,
      daysRemaining: null,
      protocol: null,
      errorMessage: "SSL inspection is only applicable for HTTPS targets",
      isConnectionError: true,
    };
  }

  const hostname = parsedUrl.hostname;
  const port = parsedUrl.port ? Number(parsedUrl.port) : 443;
  const timeoutMs = env.CHECK_TIMEOUT_MS || 10000;

  return new Promise<SslCheckResult>((resolve) => {
    let resolved = false;

    const socket = tls.connect(
      {
        host: hostname,
        port,
        servername: hostname, // Essential for Server Name Indication (SNI)
        rejectUnauthorized: false, // Allows extracting peer certificate details even if untrusted/expired
        timeout: timeoutMs,
      },
      () => {
        if (resolved) return;
        resolved = true;

        try {
          const cert = socket.getPeerCertificate();
          const protocol = socket.getProtocol() || null;
          const isAuthorized = socket.authorized;
          const authError = socket.authorizationError;

          if (!cert || Object.keys(cert).length === 0) {
            socket.destroy();
            return resolve({
              isValid: false,
              issuer: null,
              subject: null,
              validFrom: null,
              validTo: null,
              daysRemaining: null,
              protocol,
              errorMessage: "No TLS certificate presented by server",
              isConnectionError: true,
            });
          }

          const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
          const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
          const issuerStr = formatCertEntity(cert.issuer);
          const subjectStr = formatCertEntity(cert.subject);

          let daysRemaining: number | null = null;
          if (validTo) {
            const diffMs = validTo.getTime() - Date.now();
            daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          }

          let isValid = isAuthorized;
          let errorMessage: string | null = null;

          if (!isAuthorized) {
            errorMessage = authError ? String(authError) : "Untrusted certificate authority or certificate chain";
          } else if (daysRemaining !== null && daysRemaining <= 0) {
            isValid = false;
            errorMessage = `Certificate expired ${Math.abs(daysRemaining)} day(s) ago`;
          }

          socket.destroy();
          resolve({
            isValid,
            issuer: issuerStr,
            subject: subjectStr,
            validFrom,
            validTo,
            daysRemaining,
            protocol,
            errorMessage,
            isConnectionError: false,
          });
        } catch (err: any) {
          socket.destroy();
          resolve({
            isValid: false,
            issuer: null,
            subject: null,
            validFrom: null,
            validTo: null,
            daysRemaining: null,
            protocol: null,
            errorMessage: `TLS inspection error: ${err.message}`,
            isConnectionError: true,
          });
        }
      }
    );

    socket.on("timeout", () => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({
        isValid: false,
        issuer: null,
        subject: null,
        validFrom: null,
        validTo: null,
        daysRemaining: null,
        protocol: null,
        errorMessage: `TLS connection timed out after ${timeoutMs}ms`,
        isConnectionError: true,
      });
    });

    socket.on("error", (err: any) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({
        isValid: false,
        issuer: null,
        subject: null,
        validFrom: null,
        validTo: null,
        daysRemaining: null,
        protocol: null,
        errorMessage: err.message || "Failed to establish TLS connection",
        isConnectionError: true,
      });
    });
  });
}
