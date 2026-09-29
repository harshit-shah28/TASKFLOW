from flask import jsonify


def success_response(data=None, message=None, status_code=200):
    """Generate standardized API success response."""
    payload = {
        'success': True,
        'status_code': status_code
    }
    if message is not None:
        payload['message'] = message
    if data is not None:
        payload['data'] = data
    return jsonify(payload), status_code


def error_response(message="An error occurred", status_code=400, errors=None):
    """Generate standardized API error response."""
    payload = {
        'success': False,
        'status_code': status_code,
        'message': message
    }
    if errors is not None:
        payload['errors'] = errors
    return jsonify(payload), status_code
