import re
from email_validator import validate_email, EmailNotValidError


def validate_email_address(email: str) -> tuple[bool, str]:
    """Validate email syntax and normalization."""
    if not email or not isinstance(email, str):
        return False, "Email address is required."
    try:
        valid = validate_email(email.strip(), check_deliverability=False)
        return True, valid.normalized
    except EmailNotValidError as e:
        return False, str(e)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password has at least 8 characters,
    contains at least one letter and at least one number.
    """
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r'[A-Za-z]', password):
        return False, "Password must contain at least one letter."
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number."
    return True, ""


def check_missing_fields(data: dict, required_fields: list[str]) -> list[str]:
    """Return list of missing or empty fields."""
    missing = []
    for field in required_fields:
        if field not in data or data[field] is None or (isinstance(data[field], str) and not data[field].strip()):
            missing.append(field)
    return missing
