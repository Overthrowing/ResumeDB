import io
import re
from pypdf import PdfReader
from .agent import run_structured

IMPORT_SCHEMA = {
    "type": "object",
    "properties": {
        "profile": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "email": {"type": "string"},
                "phone": {"type": "string"},
                "location": {"type": "string"},
                "college": {"type": "string"},
                "major": {"type": "string"},
                "degree": {"type": "string"},
                "graduation_year": {"type": ["string", "null"]},
                "links": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "label": {"type": "string"},
                            "url": {"type": "string"}
                        },
                        "required": ["label", "url"]
                    }
                }
            },
            "required": ["name", "email"]
        },
        "entries": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "type": {"type": "string", "enum": ["experience", "education", "project", "skill"]},
                    "title": {"type": "string"},
                    "org": {"type": "string"},
                    "date": {"type": "string"},
                    "bullets": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["id", "type", "title"]
            }
        }
    },
    "required": ["profile", "entries"]
}

async def parse_resume_pdf(pdf_bytes: bytes, r) -> dict:
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        raise ValueError(f"Failed to read PDF: {str(e)}")

    if not text.strip():
        raise ValueError("The uploaded PDF resume appears to have no text content.")

    prompt = f"""
    You are an expert resume parser.
    Extract the candidate's profile details and experience entries from the following raw resume text.
    Convert all work experiences, education history, projects, and skills into structured items.
    Generate a short unique ID (like a slug, e.g. "software_engineer_google" or "bs_computer_science") for each entry.
    
    Resume Text:
    {text}
    
    Format the response EXACTLY to the requested JSON schema.
    """

    return await run_structured(
        cwd=r.root,
        prompt=prompt,
        schema=IMPORT_SCHEMA,
        task="chat",
    )

def apply_import(r, parsed: dict) -> None:
    # Save profile
    r.save_profile(parsed.get("profile", {}))
    
    # Save entries
    for entry in parsed.get("entries", []):
        entry_id = re.sub(r"[^a-z0-9]+", "-", str(entry.get("id") or entry.get("title") or "entry").lower()).strip("-")
        entry_data = {
            "type": entry.get("type"),
            "title": entry.get("title"),
            "org": entry.get("org", ""),
            "date": entry.get("date", ""),
            "bullets": entry.get("bullets", [])
        }
        r.save_entry(entry_id, entry_data)
