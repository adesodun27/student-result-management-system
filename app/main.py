from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.database import supabase
from app.routers import results, students

app = FastAPI(
    title="Acadex Results Management API",
    version="1.0.0",
    description="Backend API powering CGPA calculations, CSV validation, result approvals, and PDF exports."
)

# Global Exception Handler for Unhandled Server Errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catches unexpected errors globally and returns a clean, structured JSON response.
    """
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "An unexpected server error occurred. Please try again later or contact the administrator.",
            "detail": str(exc)
        },
    )

# Enable CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Can be restricted to live Vercel domain during deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Router Modules
app.include_router(results.router)
app.include_router(students.router)

# Root Route
@app.get("/", tags=["Root"])
def root():
    return {"status": "online", "system": "Acadex Engine"}

# Health Check Route
@app.get("/health", tags=["System Health"])
def health_check():
    """
    Monitors FastAPI and Supabase database connection status.
    """
    try:
        supabase.table("profiles").select("id").limit(1).execute()
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "online",
        "database": db_status,
        "engine": "FastAPI v1.0.0"
    }