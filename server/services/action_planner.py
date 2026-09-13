import json
import re
from loguru import logger
from typing import List, Dict, Any
from models.schemas import BrowserAction, ActionTarget, ProcessResponse

def parse_vlm_response(raw_text: str, default_conversation_id: str) -> ProcessResponse:
    logger.debug(f"[PrivacyLens Server] Raw VLM response: {raw_text[:200]}...")
    
    # Try to extract JSON from markdown code blocks
    json_str = raw_text
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        # Fallback to finding the first { and last }
        start = raw_text.find('{')
        end = raw_text.rfind('}')
        if start != -1 and end != -1:
            json_str = raw_text[start:end+1]
            
    try:
        data = json.loads(json_str)
        
        reasoning = data.get("reasoning", "No reasoning provided.")
        status = data.get("status", "success")
        message = data.get("message")
        actions_data = data.get("actions", [])
        
        parsed_actions = []
        for a in actions_data:
            target_data = a.get("target")
            target = None
            if target_data:
                target = ActionTarget(
                    element_id=target_data.get("element_id"),
                    selector=target_data.get("selector"),
                    description=target_data.get("description", "Unknown element"),
                    bbox=target_data.get("bbox")
                )
            
            action = BrowserAction(
                type=a.get("type", "unknown"),
                target=target,
                value=a.get("value"),
                direction=a.get("direction"),
                url=a.get("url"),
                delay_ms=a.get("delay_ms", 500)
            )
            parsed_actions.append(action)
            
        return ProcessResponse(
            reasoning=reasoning,
            actions=parsed_actions,
            status=status,
            message=message,
            conversation_id=default_conversation_id
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"[PrivacyLens Server] Failed to parse VLM JSON: {e}\nContent: {json_str}")
        return ProcessResponse(
            reasoning="Failed to parse model output.",
            actions=[BrowserAction(type="error", target=ActionTarget(description="Error boundary"))],
            status="error",
            message="Model returned invalid JSON format.",
            conversation_id=default_conversation_id
        )
    except Exception as e:
        logger.error(f"[PrivacyLens Server] Error validating actions: {e}")
        return ProcessResponse(
            reasoning="Validation error.",
            actions=[],
            status="error",
            message=str(e),
            conversation_id=default_conversation_id
        )
