import uuid
import time
from typing import Dict, List, Any
from loguru import logger

class ConversationManager:
    def __init__(self, max_history: int = 10, ttl_seconds: int = 3600):
        self.conversations: Dict[str, Dict[str, Any]] = {}
        self.max_history = max_history
        self.ttl_seconds = ttl_seconds

    def create_conversation(self) -> str:
        conv_id = str(uuid.uuid4())
        self.conversations[conv_id] = {
            "history": [],
            "created_at": time.time(),
            "last_accessed": time.time()
        }
        logger.info(f"[PrivacyLens Server] Created new conversation: {conv_id}")
        return conv_id

    def add_exchange(self, conv_id: str, user_task: str, response: str):
        self._cleanup()
        if conv_id not in self.conversations:
            logger.warning(f"[PrivacyLens Server] Conversation {conv_id} not found, creating new one.")
            self.conversations[conv_id] = {
                "history": [],
                "created_at": time.time(),
                "last_accessed": time.time()
            }
        
        history = self.conversations[conv_id]["history"]
        history.append({"user_task": user_task, "response": response})
        if len(history) > self.max_history:
            history.pop(0)
            
        self.conversations[conv_id]["last_accessed"] = time.time()

    def get_history(self, conv_id: str) -> List[Dict[str, str]]:
        if conv_id in self.conversations:
            self.conversations[conv_id]["last_accessed"] = time.time()
            return self.conversations[conv_id]["history"]
        return []

    def clear_conversation(self, conv_id: str):
        if conv_id in self.conversations:
            del self.conversations[conv_id]
            logger.info(f"[PrivacyLens Server] Cleared conversation: {conv_id}")

    def _cleanup(self):
        now = time.time()
        expired = [
            cid for cid, data in self.conversations.items() 
            if now - data["last_accessed"] > self.ttl_seconds
        ]
        for cid in expired:
            del self.conversations[cid]
            logger.info(f"[PrivacyLens Server] Auto-cleaned expired conversation: {cid}")

conversation_manager = ConversationManager()
