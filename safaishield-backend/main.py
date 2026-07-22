from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import check, report, jobs, map, telegram, weather, companion, voice
from config import settings

app = FastAPI(title="SafaiShield API", version="1.0.0")

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(check.router,      prefix="/api")
app.include_router(report.router,     prefix="/api")
app.include_router(jobs.router,       prefix="/api")
app.include_router(map.router,        prefix="/api")
app.include_router(telegram.router,   prefix="/api")
app.include_router(weather.router,    prefix="/api")
app.include_router(companion.router,  prefix="/api")
app.include_router(voice.router,      prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
