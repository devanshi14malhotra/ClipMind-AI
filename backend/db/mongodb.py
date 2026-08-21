import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")

client = None
db = None

def get_mongo_db():
    global client, db
    if client is None:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client.clipmind_ai
    return db
