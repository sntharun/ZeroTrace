from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class BBox(BaseModel):
    x1: float
    y1: float  
    x2: float
    y2: float

class DOMElement(BaseModel):
    id: str
    tag: str
    type: Optional[str] = None
    text: Optional[str] = None
    label: Optional[str] = None
    value: Optional[str] = None
    bbox: Optional[BBox] = None
    aria_role: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None

class RedactionInfo(BaseModel):
    type: str
    bbox: BBox
    method: str

class Viewport(BaseModel):
    width: int
    height: int

class DOMSkeleton(BaseModel):
    url: str
    title: str
    elements: List[DOMElement]
    redactions: List[RedactionInfo] = []

class ProcessRequest(BaseModel):
    screenshot_b64: str
    dom_skeleton: DOMSkeleton
    user_task: str
    viewport: Viewport
    conversation_id: Optional[str] = None

class ActionTarget(BaseModel):
    element_id: Optional[str] = None
    selector: Optional[str] = None
    description: str
    bbox: Optional[BBox] = None

class BrowserAction(BaseModel):
    type: str
    target: Optional[ActionTarget] = None
    value: Optional[str] = None
    direction: Optional[str] = None
    url: Optional[str] = None
    delay_ms: int = 500

class ProcessResponse(BaseModel):
    reasoning: str
    actions: List[BrowserAction]
    status: str
    message: Optional[str] = None
    conversation_id: str
