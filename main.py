from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from urllib.parse import urlparse
from pathlib import Path
import os
from dotenv import load_dotenv

# ─────────────────────────────
# LOAD ENV VARIABLES
# ─────────────────────────────
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME", "kactii-news")

if not MONGO_URI:
    raise Exception("❌ MONGODB_URI not set in .env")

# ─────────────────────────────
# CONNECT TO MONGODB
# ─────────────────────────────
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# ─────────────────────────────
# FASTAPI INIT
# ─────────────────────────────
app = FastAPI()

# Enable CORS (frontend access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # change later to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────
# ROOT (TEST ROUTE)
# ─────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))



@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/submit", response_class=HTMLResponse)
async def submit_page(request: Request):
    return templates.TemplateResponse("submit.html", {"request": request})

# ─────────────────────────────
# GET STORIES
# ─────────────────────────────
@app.get("/api/getStories")
async def get_stories():
    stories = list(
        db.stories.find().sort("createdAt", -1).limit(50)
    )

    for s in stories:
        s["_id"] = str(s["_id"])

    return stories

# ─────────────────────────────
# ADD STORY
# ─────────────────────────────
@app.post("/api/addStory")
async def add_story(request: Request):
    body = await request.json()

    title = body.get("title")
    url = body.get("url")
    author = body.get("author", "anonymous")
    cat = body.get("cat", "tech")

    if not title or not url:
        return {"error": "Missing title or URL"}

    # Extract domain safely
    try:
        domain = urlparse(url).netloc
    except:
        domain = "unknown"

    new_story = {
        "title": title,
        "url": url,
        "domain": domain,
        "author": author,
        "cat": cat,
        "points": 0,
        "comments": 0,
        "time": "just now",
        "createdAt": datetime.utcnow()
    }

    result = db.stories.insert_one(new_story)

    return {
        "message": "Story added successfully",
        "id": str(result.inserted_id)
    }

# ─────────────────────────────
# UPVOTE STORY
# ─────────────────────────────
@app.post("/api/vote")
async def vote(request: Request):
    body = await request.json()
    story_id = body.get("id")

    if not story_id:
        return {"error": "Missing story ID"}

    try:
        db.stories.update_one(
            {"_id": ObjectId(story_id)},
            {"$inc": {"points": 1}}
        )
        return {"message": "Upvoted successfully"}
    except:
        return {"error": "Invalid story ID"}

# ─────────────────────────────
# RUN USING UVICORN (LOCAL ONLY)
# ─────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)