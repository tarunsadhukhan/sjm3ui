"use client";

import React from 'react';
import NotFound from '@/app/not-found';
import { apiRoutes } from '@/utils/api';

/**
 * Client-side guard that validates the current subdomain against the
 * backend DB (con_org_master). If the subdomain is not an active org,
 * renders the 404 Not Found page instead of the app.
 *
 * Rendered from the root layout wrapping {children}, so it must NOT call
 * notFound() — Next.js forbids notFound() inside the root layout. It renders
 * the NotFound component directly instead.
 *
 * Validation runs at most once per browser session and is skipped entirely
 * once the user is logged in. The subdomain only needs to be validated at
 * login time — after that the result is cached (sessionStorage) so navigating
 * between pages never re-calls GET /authRoutes/validate-subdomain.
 */
const VALIDATION_CACHE_KEY = 'subdomain_validated';

/** True when an auth session cookie is present (i.e. the user is logged in). */
function hasActiveSession(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith('access_token='));
}

export default function SubdomainGuard({ children }: { children: React.ReactNode }) {
  const [invalid, setInvalid] = React.useState(false);

  React.useEffect(() => {
    const validateSubdomain = async () => {
      try {
        // Skip validation once logged in — the subdomain was already validated
        // at login, so we must not keep hitting the API on every page load.
        if (hasActiveSession()) return;

        // Skip if already validated earlier in this browser session.
        if (sessionStorage.getItem(VALIDATION_CACHE_KEY) === '1') return;

        const hostname = window.location.hostname;
        let subdomain: string;

        if (hostname.includes('.localhost')) {
          subdomain = hostname.split('.localhost')[0];
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
          // Plain localhost without subdomain — allow through
          return;
        } else if (/^\d+(\.\d+){3}(:\d+)?$/.test(hostname)) {
          // IP address detected (e.g., 13.126.47.172:3000 or 192.168.1.1)
          // Use fallback subdomain from env, or allow through with default
          subdomain = process.env.NEXT_PUBLIC_STATIC_SUBDOMAIN || 'sls';
        } else if (hostname.split('.').length <= 2) {
          // Apex domain with no subdomain (e.g. infoskyglobalit.in) — there is no
          // tenant prefix to read, so use the configured static subdomain.
          subdomain = process.env.NEXT_PUBLIC_STATIC_SUBDOMAIN || 'sls';
        } else {
          subdomain = hostname.split('.')[0];
        }

        if (!subdomain) {
          setInvalid(true);
          return;
        }

        // Reserved control-desk subdomain — not a tenant org, so con_org_master
        // validation does not apply (same hardcoded detection as login-form.tsx).
        if (subdomain === 'admin') return;

        const res = await fetch(
          `${apiRoutes.VALIDATE_SUBDOMAIN}?subdomain=${encodeURIComponent(subdomain)}`
        );

        if (res.ok) {
          const data = await res.json();
          if (!data?.valid) {
            setInvalid(true);
            return;
          }
          // Cache success so we don't re-validate on subsequent page loads.
          sessionStorage.setItem(VALIDATION_CACHE_KEY, '1');
        } else {
          // API returned an error — fail closed
          setInvalid(true);
        }
      } catch {
        // Network error — fail closed
        setInvalid(true);
      }
    };

    validateSubdomain();
  }, []);

  if (invalid) return <NotFound />;
  return children;
}
