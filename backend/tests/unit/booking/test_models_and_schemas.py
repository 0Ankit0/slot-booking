from datetime import datetime, timedelta

from src.apps.booking.models import calculate_refund_amount, default_hold_expiry
from src.apps.booking.schemas.booking import decode_hashid_or_int
from src.apps.iam.utils.hashid import encode_id


def test_default_hold_expiry_in_future() -> None:
    now = datetime.utcnow()
    expiry = default_hold_expiry(minutes=15)
    assert expiry > now


def test_decode_hashid_or_int_supports_hashid_and_int() -> None:
    assert decode_hashid_or_int(123) == 123

    encoded = encode_id(999)
    assert decode_hashid_or_int(encoded) == 999


def test_calculate_refund_amount_policy() -> None:
    starts_at = datetime.utcnow() + timedelta(days=2)
    assert calculate_refund_amount(10000, starts_at, datetime.utcnow()) == 10000

    starts_at = datetime.utcnow() + timedelta(hours=5)
    assert calculate_refund_amount(10001, starts_at, datetime.utcnow()) == 5001

    starts_at = datetime.utcnow() + timedelta(minutes=30)
    assert calculate_refund_amount(10000, starts_at, datetime.utcnow()) == 0
