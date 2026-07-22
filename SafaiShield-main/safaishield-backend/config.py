from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_SECRET: str = ""
    OPENWEATHER_API_KEY: str = ""
    CORS_ORIGINS: str = "*"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
