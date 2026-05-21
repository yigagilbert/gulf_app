import mimetypes
import os
import uuid
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Optional, Tuple

try:
    import boto3
    from botocore.client import Config
except ImportError:  # pragma: no cover - optional dependency in local fallback mode
    boto3 = None
    Config = None


STORAGE_PROVIDER = os.getenv("STORAGE_PROVIDER", "local").lower()
LOCAL_UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads")).resolve()
R2_BUCKET = os.getenv("CLOUDFLARE_R2_BUCKET")
R2_PREFIX = os.getenv("CLOUDFLARE_R2_PREFIX", "gulfconsultant").strip("/")
R2_ENDPOINT_URL = os.getenv("CLOUDFLARE_R2_ENDPOINT_URL")
R2_ACCESS_KEY_ID = os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
R2_PUBLIC_BASE_URL = os.getenv("CLOUDFLARE_R2_PUBLIC_BASE_URL", "").rstrip("/")


@dataclass
class StoredFile:
    key: str
    public_url: Optional[str]


def is_local_storage() -> bool:
    return STORAGE_PROVIDER == "local"


def get_local_upload_dir() -> Path:
    return LOCAL_UPLOAD_DIR


def _get_extension(filename: Optional[str], content_type: Optional[str]) -> str:
    if filename and "." in filename:
        return filename.rsplit(".", 1)[-1].lower()

    guessed = mimetypes.guess_extension(content_type or "")
    if guessed:
        return guessed.lstrip(".")

    return "bin"


def _build_storage_key(category: str, filename: Optional[str], content_type: Optional[str]) -> str:
    extension = _get_extension(filename, content_type)
    parts = [part for part in [R2_PREFIX, category, f"{uuid.uuid4().hex}.{extension}"] if part]
    return "/".join(parts)


def _normalize_key(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    normalized = str(value).strip()
    if normalized.startswith("http://") or normalized.startswith("https://"):
        if R2_PUBLIC_BASE_URL and normalized.startswith(R2_PUBLIC_BASE_URL):
            return normalized[len(R2_PUBLIC_BASE_URL):].lstrip("/")
        return normalized

    for prefix in ("/api/uploads/", "/uploads/"):
        if normalized.startswith(prefix):
            return normalized[len(prefix):].lstrip("/")

    try:
        path = Path(normalized)
        if path.is_absolute():
            return str(path.resolve().relative_to(LOCAL_UPLOAD_DIR))
    except Exception:
        pass

    if normalized.startswith("./"):
        normalized = normalized[2:]

    if normalized.startswith("uploads/"):
        return normalized[len("uploads/"):]

    return normalized.lstrip("/")


def build_public_url(value: Optional[str]) -> Optional[str]:
    key = _normalize_key(value)
    if not key:
        return None

    if key.startswith("http://") or key.startswith("https://"):
        return key

    if STORAGE_PROVIDER == "cloudflare_r2":
        if not R2_PUBLIC_BASE_URL:
            return None
        return f"{R2_PUBLIC_BASE_URL}/{key}"

    return f"/api/uploads/{key}"


def _get_r2_client():
    if boto3 is None or Config is None:
        raise RuntimeError(
            "boto3 is required for Cloudflare R2 storage. Add boto3 to the environment first."
        )

    required = [R2_BUCKET, R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY]
    if not all(required):
        raise RuntimeError(
            "Cloudflare R2 is enabled but required credentials are missing."
        )

    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def save_bytes(category: str, filename: Optional[str], content: bytes, content_type: Optional[str]) -> StoredFile:
    key = _build_storage_key(category, filename, content_type)

    if STORAGE_PROVIDER == "cloudflare_r2":
        client = _get_r2_client()
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type
        client.upload_fileobj(BytesIO(content), R2_BUCKET, key, ExtraArgs=extra_args)
        return StoredFile(key=key, public_url=build_public_url(key))

    full_path = LOCAL_UPLOAD_DIR / key
    full_path.parent.mkdir(parents=True, exist_ok=True)
    full_path.write_bytes(content)
    return StoredFile(key=key, public_url=build_public_url(key))


def read_bytes(value: Optional[str]) -> Tuple[bytes, Optional[str]]:
    key = _normalize_key(value)
    if not key:
        raise FileNotFoundError("No storage key provided")

    if STORAGE_PROVIDER == "cloudflare_r2" and not key.startswith(("http://", "https://")):
        client = _get_r2_client()
        response = client.get_object(Bucket=R2_BUCKET, Key=key)
        return response["Body"].read(), response.get("ContentType")

    full_path = LOCAL_UPLOAD_DIR / key
    if not full_path.exists():
        raise FileNotFoundError(f"Stored file not found: {key}")
    return full_path.read_bytes(), mimetypes.guess_type(full_path.name)[0]


def delete_file(value: Optional[str]) -> None:
    key = _normalize_key(value)
    if not key:
        return

    if STORAGE_PROVIDER == "cloudflare_r2" and not key.startswith(("http://", "https://")):
        client = _get_r2_client()
        client.delete_object(Bucket=R2_BUCKET, Key=key)
        return

    full_path = LOCAL_UPLOAD_DIR / key
    if full_path.exists():
        full_path.unlink()
