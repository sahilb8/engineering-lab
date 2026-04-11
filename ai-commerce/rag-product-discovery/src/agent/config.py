from pydantic import SecretStr
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: SecretStr
    postgres_dsn: str
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536

    model_config = {"env_file": ".env"}

settings = Settings()
