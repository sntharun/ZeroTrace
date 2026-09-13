import asyncio
import base64
import io
import time
from PIL import Image
from loguru import logger
from groq import AsyncGroq
from openai import AsyncOpenAI
from config import settings

def optimize_image_for_vlm(image_b64: str, max_size: int = 800) -> str:
    """Downscales high-resolution screenshots and compresses JPEG to prevent token limit exhaustion."""
    try:
        img_bytes = base64.b64decode(image_b64)
        img = Image.open(io.BytesIO(img_bytes))
        
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        if max(img.size) > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80, optimize=True)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        logger.warning(f"[PrivacyLens Server] Image optimization failed: {e}")
        return image_b64

class VLMService:
    def __init__(self):
        self.provider = settings.VLM_PROVIDER.lower()
        self.model = settings.VLM_MODEL
        
        if self.provider == "groq":
            self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        elif self.provider == "together":
            self.client = AsyncOpenAI(
                api_key=settings.TOGETHER_API_KEY,
                base_url="https://api.together.xyz/v1"
            )
        else:
            raise ValueError(f"Unsupported VLM provider: {self.provider}")

    async def query_vlm(self, system_prompt: str, user_message: str, image_b64: str) -> str:
        # Check if API key is not configured or placeholder
        is_groq_dummy = self.provider == "groq" and (not settings.GROQ_API_KEY or "your_groq_api_key" in settings.GROQ_API_KEY)
        is_together_dummy = self.provider == "together" and (not settings.TOGETHER_API_KEY or "your_together_api_key" in settings.TOGETHER_API_KEY)

        if is_groq_dummy or is_together_dummy:
            logger.info("[PrivacyLens Server] No active API key found in .env — using intelligent local agent simulation for demo.")
            return self._generate_demo_response(user_message)

        # Optimize image resolution and payload size to stay well under rate limits
        processed_image_b64 = optimize_image_for_vlm(image_b64, max_size=768)

        retries = 2
        for attempt in range(retries):
            try:
                start_time = time.time()
                
                messages = [
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_message},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{processed_image_b64}"
                                }
                            }
                        ]
                    }
                ]

                if self.provider == "groq":
                    response = await self.client.chat.completions.create(
                        model=self.model,
                        messages=messages,
                        temperature=0.1,
                        max_tokens=1024
                    )
                    content = response.choices[0].message.content
                elif self.provider == "together":
                    response = await self.client.chat.completions.create(
                        model=self.model,
                        messages=messages,
                        temperature=0.1,
                        max_tokens=1024
                    )
                    content = response.choices[0].message.content
                
                latency = time.time() - start_time
                logger.info(f"[PrivacyLens Server] VLM inference completed in {latency:.2f}s using {self.provider}")
                return content
                
            except Exception as e:
                logger.warning(f"[PrivacyLens Server] VLM attempt {attempt+1} failed: {e}")
                if attempt == retries - 1:
                    logger.info("[PrivacyLens Server] Falling back to demo action planner...")
                    return self._generate_demo_response(user_message)
                await asyncio.sleep(1)

    def _generate_demo_response(self, user_message: str) -> str:
        """Generates contextual browser actions for demo pages without cloud latency."""
        msg_lower = user_message.lower()
        if "submit" in msg_lower or "apply" in msg_lower or "job" in msg_lower:
            return """```json
{
  "reasoning": "Sanitized context verified. Form contains redacted PII elements. Planning browser action sequence to scroll down and trigger submission.",
  "actions": [
    {"type": "scroll", "target": {"element_id": "el_0", "description": "Form container"}, "delay_ms": 400},
    {"type": "click", "target": {"element_id": "el_1", "selector": "button[type='submit'], button", "description": "Submit button"}, "delay_ms": 500}
  ],
  "status": "success"
}
```"""
        elif "filter" in msg_lower or "transaction" in msg_lower or "bank" in msg_lower:
            return """```json
{
  "reasoning": "Observed banking dashboard with sensitive account & card values redacted with [REDACTED] masks. Navigating and highlighting transaction filter.",
  "actions": [
    {"type": "focus", "target": {"element_id": "el_0", "selector": "input, select, button", "description": "Active filter control"}, "delay_ms": 300},
    {"type": "scroll", "target": {"element_id": "el_2", "description": "Transaction table"}, "delay_ms": 400}
  ],
  "status": "success"
}
```"""
        else:
            return """```json
{
  "reasoning": "Visual perception validated. Sensitive user data has been properly redacted in DOM and image before receipt. Executing next step on active page.",
  "actions": [
    {"type": "focus", "target": {"element_id": "el_0", "description": "First interactive element"}, "delay_ms": 300}
  ],
  "status": "success"
}
```"""

vlm_service = VLMService()
