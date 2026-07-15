from rate_limit import _client_ip


class FakeRequest:
    def __init__(self, headers: dict, client_host: str | None = "203.0.113.9"):
        self.headers = headers

        class _Client:
            host = client_host

        self.client = _Client() if client_host is not None else None


def test_uses_the_first_address_in_x_forwarded_for():
    # Railway's edge (and any standard reverse proxy) sets this to
    # "client, proxy1, proxy2, ..." - the first entry is the real client,
    # everything after it is proxy hop history.
    request = FakeRequest({"x-forwarded-for": "198.51.100.7, 100.64.0.3, 100.64.0.9"})
    assert _client_ip(request) == "198.51.100.7"


def test_strips_whitespace_around_the_first_address():
    request = FakeRequest({"x-forwarded-for": "  198.51.100.7  ,100.64.0.3"})
    assert _client_ip(request) == "198.51.100.7"


def test_falls_back_to_request_client_host_when_header_is_absent():
    # No proxy in front (local dev, tests) - request.client.host is the
    # real, stable connecting address in that case, so falling back to it
    # is correct rather than a workaround.
    request = FakeRequest({}, client_host="127.0.0.1")
    assert _client_ip(request) == "127.0.0.1"


def test_two_different_forwarded_clients_get_different_keys():
    # The actual bug this guards against: without this, every request
    # behind Railway's proxy got a different slowapi.get_remote_address()
    # key (a rotating internal proxy IP), so no client's count ever
    # accumulated and no rate limit ever tripped - confirmed live via
    # Railway's own access logs showing a different 100.64.x.x source per
    # request in a rapid-fire burst from one real client.
    a = FakeRequest({"x-forwarded-for": "198.51.100.7, 100.64.0.3"})
    b = FakeRequest({"x-forwarded-for": "198.51.100.8, 100.64.0.9"})
    assert _client_ip(a) != _client_ip(b)


def test_same_forwarded_client_gets_the_same_key_across_requests():
    a = FakeRequest({"x-forwarded-for": "198.51.100.7, 100.64.0.3"})
    b = FakeRequest({"x-forwarded-for": "198.51.100.7, 100.64.0.9"})
    assert _client_ip(a) == _client_ip(b)
