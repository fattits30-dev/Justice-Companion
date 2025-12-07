from __future__ import annotations

import hashlib
import itertools
import string
from dataclasses import dataclass
from typing import Iterator

_SPECIAL_CHARS = "!@#%^*-_+?"
_FULL_CHARSET = string.ascii_letters + string.digits + _SPECIAL_CHARS


def _digest(label: str) -> bytes:
    namespaced = f"justice-companion::{label}".encode("utf-8")
    return hashlib.sha256(namespaced).digest()


def _cycled_chars(label: str, pool: str) -> Iterator[str]:
    digest = _digest(label)
    chars = [pool[b % len(pool)] for b in digest]
    return itertools.cycle(chars)


@dataclass(frozen=True)
class TestUser:
    username: str
    password: str
    email: str


def build_username(label: str, length: int = 12) -> str:
    digest = _digest(f"username::{label}")
    sanitized_label = "".join(ch for ch in label.lower() if ch.isalnum()) or "user"
    suffix = "".join(string.ascii_lowercase[b % 26] for b in digest)[:length]
    return f"{sanitized_label[:16]}_{suffix}"


def build_email(label: str, domain: str = "example.com") -> str:
    return f"{build_username(label, length=10)}@{domain}"


def build_password(label: str, length: int = 16) -> str:
    if length < 4:
        raise ValueError("length must be >= 4 to satisfy complexity requirements")

    digest = _digest(f"password::{label}")
    chars = [
        _FULL_CHARSET[digest[idx % len(digest)] % len(_FULL_CHARSET)]
        for idx in range(length)
    ]

    chars[0] = string.ascii_uppercase[digest[0] % 26]
    chars[1] = string.ascii_lowercase[digest[1] % 26]
    chars[2] = string.digits[digest[2] % 10]
    chars[3] = _SPECIAL_CHARS[digest[3] % len(_SPECIAL_CHARS)]
    return "".join(chars[:length])


def build_short_password(label: str, length: int = 8) -> str:
    return build_password(label, length=length)


def password_no_uppercase(label: str, length: int = 16) -> str:
    base = build_password(label, length)
    return "".join(ch.lower() if ch.isalpha() else ch for ch in base)


def password_no_lowercase(label: str, length: int = 16) -> str:
    base = build_password(label, length)
    return "".join(ch.upper() if ch.isalpha() else ch for ch in base)


def password_no_digits(label: str, length: int = 16) -> str:
    base = build_password(label, length)
    replacements = _cycled_chars(f"{label}-nodigits", string.ascii_letters)
    return "".join(next(replacements) if ch.isdigit() else ch for ch in base)


def password_no_specials(label: str, length: int = 16) -> str:
    base = build_password(label, length)
    replacements = _cycled_chars(
        f"{label}-nospecials", string.ascii_letters + string.digits
    )
    return "".join(next(replacements) if ch in _SPECIAL_CHARS else ch for ch in base)


def build_test_user(
    label: str, password_length: int = 16, domain: str = "example.com"
) -> TestUser:
    username = build_username(label)
    email = build_email(label, domain=domain)
    password = build_password(f"{label}-password", length=password_length)
    return TestUser(username=username, password=password, email=email)


def build_login_payload(label: str, *, remember_me: bool = False) -> dict:
    user = build_test_user(label)
    return {
        "username": user.username,
        "password": user.password,
        "remember_me": remember_me,
    }
