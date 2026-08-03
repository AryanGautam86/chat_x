"""Unit tests for password hashing and access tokens."""

import time

import jwt
import pytest

from app.core import config
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_verifies_the_correct_password(self):
        assert verify_password("correct horse", hash_password("correct horse"))

    def test_rejects_the_wrong_password(self):
        assert not verify_password("wrong", hash_password("correct horse"))

    def test_hash_is_salted(self):
        # Same input, different hashes — otherwise the DB leaks which users
        # share a password.
        assert hash_password("same") != hash_password("same")

    def test_rejects_when_no_hash_is_stored(self):
        # Google-only accounts must not be loggable through the password form.
        assert not verify_password("anything", None)
        assert not verify_password("anything", "")

    def test_rejects_a_corrupt_hash_instead_of_raising(self):
        assert not verify_password("anything", "not-a-bcrypt-hash")

    def test_long_passwords_are_not_truncated(self):
        # bcrypt ignores bytes past 72; without pre-hashing these would match.
        base = "x" * 80
        stored = hash_password(base + "AAAA")
        assert not verify_password(base + "BBBB", stored)
        assert verify_password(base + "AAAA", stored)

    def test_handles_unicode(self):
        assert verify_password("pässwörd-🔐", hash_password("pässwörd-🔐"))


class TestAccessTokens:
    def test_round_trips_the_subject(self):
        payload = decode_access_token(create_access_token("42"))
        assert payload["sub"] == "42"

    def test_subject_is_stringified(self):
        assert decode_access_token(create_access_token(7))["sub"] == "7"

    def test_rejects_garbage(self):
        assert decode_access_token("not-a-token") is None

    def test_rejects_a_token_signed_with_another_key(self):
        forged = jwt.encode({"sub": "1"}, "some-other-secret", algorithm="HS256")
        assert decode_access_token(forged) is None

    def test_rejects_an_expired_token(self):
        expired = jwt.encode(
            {"sub": "1", "exp": int(time.time()) - 60},
            config.JWT_SECRET,
            algorithm=config.JWT_ALGORITHM,
        )
        assert decode_access_token(expired) is None

    def test_rejects_the_none_algorithm(self):
        # "alg": "none" is the classic JWT bypass; it must not be accepted.
        unsigned = jwt.encode({"sub": "1"}, key="", algorithm="none")
        assert decode_access_token(unsigned) is None

    def test_token_carries_an_expiry(self):
        assert "exp" in decode_access_token(create_access_token("1"))


@pytest.mark.parametrize("bad", ["", "   "])
def test_blank_passwords_still_hash_and_compare(bad):
    # Endpoint validation rejects these; the primitive must not crash on them.
    assert verify_password(bad, hash_password(bad))
