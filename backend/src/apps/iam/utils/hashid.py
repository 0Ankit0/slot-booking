from hashids import Hashids
from fastapi import HTTPException, status

hashids = Hashids(salt="your_salt_here", min_length=8)

def encode_id(id: int) -> str:
    return hashids.encode(id)

def decode_id(hashid: str | int) -> int | None:
    if isinstance(hashid, int):
        return hashid
    value = hashid.strip()
    if value.isdigit():
        return int(value)
    decoded = hashids.decode(value)
    return decoded[0] if decoded else None

def decode_id_or_404(hashid: str | int) -> int:
    """Decode a hashid or numeric path param; raise 404 if invalid."""
    decoded = decode_id(hashid)
    if decoded is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return decoded
