import asyncio
import time
from loguru import logger
from groq import AsyncGroq
from openai import AsyncOpenAI
from config import settings

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
        retries = 3
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
                                    "url": f"data:image/jpeg;base64,{image_b64}"
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
                    logger.error("[PrivacyLens Server] Max retries reached for VLM query.")
                    raise
                await asyncio.sleep(2 ** attempt)

vlm_service = VLMService()
