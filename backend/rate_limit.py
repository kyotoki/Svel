import os

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

# Confirmed via Railway's own access logs (each request in a rapid-fire burst
# logged a *different* 100.64.x.x source): Railway's edge proxies to this
# container from a rotating pool of internal addresses, not the real client
# IP - slowapi's default get_remote_address (request.client.host) treats
# every request as a different "client" behind it, so the limiter's count
# never accumulates and no limit ever trips. X-Forwarded-For carries the
# real client IP (same proxy that already sets X-Forwarded-Proto for the
# HSTS header in main.py); falls back to get_remote_address when it's absent
# (local dev, tests - neither runs behind this proxy).
def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return get_remote_address(request)


# A separate module (not defined in main.py) specifically so route files can
# import `limiter` for per-route @limiter.limit(...) overrides without a
# circular import - main.py imports the route modules, so the reverse import
# would fail.
limiter = Limiter(key_func=_client_ip, default_limits=[os.getenv("RATE_LIMIT_DEFAULT", "120/minute")])
