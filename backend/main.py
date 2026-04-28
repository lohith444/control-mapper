from __future__ import annotations
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import traceback
import uvicorn

from services.extractor import extract_controls_from_url, extract_controls_from_pdf, extract_controls_from_docx
from services.normalizer import normalize_and_match
from services.evaluator import run_evals
from services.parsers.control_loader import load_controls_file

app = FastAPI(title="Control Mapper API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    trust_center_url: str
    common_controls: List[dict]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/extract-url")
async def extract_from_url(body: dict):
    url = body.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    try:
        controls = await extract_controls_from_url(url)
        return {"controls": controls, "source": "trust_center", "url": url}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@app.post("/api/extract-document")
async def extract_from_document(file: UploadFile = File(...)):
    if not (
        file.filename.endswith(".pdf")
        or file.filename.endswith(".docx")
    ):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    try:
        content = await file.read()
        if file.filename.endswith(".pdf"):
            controls = await extract_controls_from_pdf(content, file.filename)
        elif file.filename.endswith(".docx"):
            controls = await extract_controls_from_docx(content, file.filename)
        else:
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
        return {"controls": controls, "source": "document", "filename": file.filename}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@app.post("/api/upload-controls")
async def upload_controls(file: UploadFile = File(...)):
    try:
        content = await file.read()
        controls = load_controls_file(content,file.filename)
        return {"controls": controls, "count": len(controls)}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@app.post("/api/normalize-and-match")
async def normalize_match(body: dict):
    try:
        result = await normalize_and_match(
            trust_center_controls=body.get("trust_center_controls", []),
            document_controls=body.get("document_controls", []),
            base_controls=body.get("base_controls", []),
            domain_filter=body.get("domain_filter"),
        )
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@app.post("/api/run-evals")
async def run_evaluations(body: dict):
    try:
        results = await run_evals(
            trust_center_controls=body.get("trust_center_controls", []),
            document_controls=body.get("document_controls", []),
            mappings=body.get("mappings", []),
            base_controls=body.get("base_controls", []),
        )
        return results
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
