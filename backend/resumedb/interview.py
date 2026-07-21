from ruamel.yaml import YAML
from pathlib import Path
from .agent import run_structured

INTERVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "type": {"type": "string", "enum": ["behavioral", "technical", "situational"]},
                    "question": {"type": "string"},
                    "context": {"type": "string"},
                    "tips": {"type": "string"}
                },
                "required": ["id", "type", "question", "context", "tips"]
            }
        }
    },
    "required": ["questions"]
}

def _yaml() -> YAML:
    y = YAML()
    y.indent(mapping=2, sequence=4, offset=2)
    return y

def prep_dir(r, app_id: str) -> Path:
    d = r.app_dir(app_id) / "interview_prep"
    d.mkdir(exist_ok=True, parents=True)
    return d

def load_questions(r, app_id: str) -> list:
    f = prep_dir(r, app_id) / "questions.yaml"
    if f.exists():
        try:
            with f.open("r") as stream:
                return _yaml().load(stream) or []
        except Exception:
            return []
    return []

def save_questions(r, app_id: str, questions: list) -> None:
    f = prep_dir(r, app_id) / "questions.yaml"
    with f.open("w") as stream:
        _yaml().dump(questions, stream)

async def generate_questions(r, app_id: str) -> list:
    app = r.get_application(app_id)
    files = app.get("files", {})
    jd = files.get("jd.md", "").strip()
    resume_yaml = files.get("resume.yaml", "").strip()
    
    if not jd or not resume_yaml:
        return []

    prompt = f"""
    You are an expert interviewer.
    Generate 8-12 targeted interview questions (combination of behavioral, technical, and situational)
    for a candidate applying to this job. Focus specifically on the mismatch or requirements in the job description
    and the achievements/tech stack present in their resume.
    
    Job Description:
    {jd}
    
    Candidate Resume YAML:
    {resume_yaml}
    
    Provide your output formatted EXACTLY to the requested JSON schema.
    """

    result = await run_structured(
        cwd=r.root,
        prompt=prompt,
        schema=INTERVIEW_SCHEMA,
        task="tailor",
    )
    questions = result.get("questions", [])
    
    save_questions(r, app_id, questions)
    return questions
