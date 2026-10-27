import os
import asyncio
import tempfile
import uuid
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from app.services.whisper_service import whisper_service
from app.services.auth_service import auth_service

logger = logging.getLogger("uvicorn")
ws_router = APIRouter()
active_connections = 0
MAX_CONNECTIONS = 20
MAX_BUFFER_BYTES = 5 * 1024 * 1024

@ws_router.websocket("/api/live/stream")
async def websocket_live_caption(websocket: WebSocket):
    """
    Kênh WebSocket thu nhận luồng âm thanh thời gian thực từ Micro (Mobile/Extension)
    và truyền về phụ đề trực tiếp với độ trễ thấp.
    """
    global active_connections
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return
    try:
        auth_service.decode_token(token)
    except Exception:
        await websocket.close(code=1008, reason="Invalid authentication token")
        return
    if active_connections >= MAX_CONNECTIONS:
        await websocket.close(code=1013, reason="Too many realtime connections")
        return

    await websocket.accept()
    active_connections += 1
    logger.info("Client kết nối thành công tới WebSocket Live-Caption.")
    
    buffer_bytes = bytearray()
    temp_dir = tempfile.gettempdir()
    
    try:
        await websocket.send_json({
            "type": "status",
            "message": "Kết nối thành công! Sẵn sàng nhận diện giọng nói thời gian thực."
        })

        while True:
            message = await asyncio.wait_for(websocket.receive(), timeout=60)

            # Nhận luồng âm thanh binary chunks từ mic
            if "bytes" in message and message["bytes"]:
                data = message["bytes"]
                buffer_bytes.extend(data)
                if len(buffer_bytes) > MAX_BUFFER_BYTES:
                    await websocket.close(code=1009, reason="Audio buffer too large")
                    break

                # Khi buffer tích lũy đủ ~2 giây audio (khoảng 64KB)
                if len(buffer_bytes) >= 64000:
                    temp_audio = os.path.join(temp_dir, f"live_{uuid.uuid4().hex[:6]}.wav")
                    try:
                        with open(temp_audio, "wb") as f:
                            f.write(buffer_bytes)

                        # Phiên âm nhanh qua Whisper
                        segments, detected_lang = await run_in_threadpool(whisper_service.transcribe_audio,
                            audio_path=temp_audio,
                            language=None,
                            task="transcribe"
                        )

                        if segments:
                            caption_text = " ".join([seg["text"] for seg in segments]).strip()
                            if caption_text:
                                await websocket.send_json({
                                    "type": "caption",
                                    "text": caption_text,
                                    "language": detected_lang,
                                    "is_final": False
                                })
                    except Exception as err:
                        logger.warning(f"Lỗi xử lý âm thanh realtime: {err}")
                    finally:
                        if os.path.exists(temp_audio):
                            try: os.remove(temp_audio)
                            except Exception: pass
                        buffer_bytes.clear()

            # Nhận lệnh điều khiển (JSON)
            elif "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                    action = payload.get("action")
                    if action == "stop":
                        await websocket.send_json({"type": "status", "message": "Đã ngắt luồng Live-Caption."})
                        break
                    elif action == "ping":
                        await websocket.send_json({"type": "pong"})
                except Exception:
                    pass

    except WebSocketDisconnect:
        logger.info("Client đã ngắt kết nối WebSocket Live-Caption.")
    except asyncio.TimeoutError:
        logger.info("WebSocket Live-Caption timeout do không có dữ liệu.")
    except Exception as e:
        logger.error(f"Lỗi phiên WebSocket: {e}")
    finally:
        active_connections = max(0, active_connections - 1)
        buffer_bytes.clear()
