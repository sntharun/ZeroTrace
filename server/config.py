from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    TOGETHER_API_KEY: str = ""
    VLM_PROVIDER: str = "groq"
    VLM_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
