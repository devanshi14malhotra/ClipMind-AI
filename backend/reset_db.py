import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import engine, Base, User, Video, LearningHistory, Bookmark, AuditLog

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Creating all tables...")
Base.metadata.create_all(bind=engine)
print("Done!")
