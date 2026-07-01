from fastapi import Request


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"


def get_device_info(request: Request) -> str:
    ua = request.headers.get("user-agent", "Unknown device")
    return ua[:255]
