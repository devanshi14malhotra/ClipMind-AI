# ClipMind-AI

# Make sure you are in the main project folder
docker-compose up -d

# 1. Navigate into the backend folder
cd backend

# 2. Activate your virtual environment
.\venv\Scripts\activate

# 3. Start the server
uvicorn main:app --reload


# 1. Navigate into the frontend folder
cd frontend

# 2. Start the development server
npm run dev
