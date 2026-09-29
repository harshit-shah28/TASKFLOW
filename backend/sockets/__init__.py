from flask_socketio import SocketIO

socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')

from backend.sockets import chat_socket  # Register socket event listeners

__all__ = ['socketio']
