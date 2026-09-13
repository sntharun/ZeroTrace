from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from loguru import logger
import base64

from models.schemas import ProcessRequest, ProcessResponse
from services.prompt_builder import build_system_prompt, build_user_prompt
from services.vlm_service import vlm_service
from services.action_planner import parse_vlm_response
from services.conversation import conversation_manager

router = APIRouter()

@router.post("/process", response_model=ProcessResponse)
async def process_request(request: ProcessRequest):
    logger.info(f"[PrivacyLens Server] Received request for task: {request.user_task}")
    
    # 1. Validate base64 image
    try:
        if request.screenshot_b64.startswith("data:image"):
            request.screenshot_b64 = request.screenshot_b64.split(",")[1]
        base64.b64decode(request.screenshot_b64, validate=True)
    except Exception as e:
        logger.error(f"[PrivacyLens Server] Invalid base64 screenshot: {e}")
        raise HTTPException(status_code=400, detail="Invalid screenshot encoding")

    # 2. Conversation management
    conv_id = request.conversation_id
    if not conv_id:
        conv_id = conversation_manager.create_conversation()
        
    history = conversation_manager.get_history(conv_id)
    
    # 3. Build prompts
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(request, history)
    
    # 4. Call VLM
    try:
        raw_response = await vlm_service.query_vlm(
            system_prompt=system_prompt,
            user_message=user_prompt,
            image_b64=request.screenshot_b64
        )
    except Exception as e:
        logger.error(f"[PrivacyLens Server] VLM failure: {e}")
        raise HTTPException(status_code=500, detail="Failed to get inference from VLM")
        
    # 5. Parse actions
    response_obj = parse_vlm_response(raw_response, default_conversation_id=conv_id)
    
    # 6. Update conversation history
    conversation_manager.add_exchange(conv_id, request.user_task, raw_response)
    
    return response_obj

@router.post("/process-stream")
async def process_stream(request: ProcessRequest):
    raise HTTPException(status_code=501, detail="Streaming not yet fully implemented for VLM providers")

@router.get("/status")
async def get_status():
    return {"status": "ok", "provider": vlm_service.provider, "model": vlm_service.model}
