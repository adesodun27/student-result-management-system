from fastapi import FastAPI
from app.routers import results, students  

app = FastAPI(
    title="Acadex Results Management API",
    version="1.0.0",
    description="Backend API for managing university course registrations, results, and CGPA summaries."
)

app.include_router(results.router)
app.include_router(students.router)

@app.get("/")
def health_check():
    return {"status": "online", "system": "Acadex Engine"}