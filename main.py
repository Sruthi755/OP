import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from groq import Groq
from transformers import pipeline

# 1. Load Environment Variables
load_dotenv()

app = FastAPI()

# 2. Allow Frontend Communication (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Initialize Models & Clients
print("Loading Hugging Face security model... (This may take a moment)")
security_scanner = pipeline(
    "text-classification", 
    model="mrm8488/codebert-base-finetuned-detect-insecure-code"
)

# Initialize Remote AI Clients
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# 4. Data Structure
class CodePayload(BaseModel):
    code: str
    model: str = "gemini"  # Default to gemini if not specified

# 5. The Analysis Endpoint
@app.post("/analyze")
async def analyze_code(payload: CodePayload):
    try:
        # Step A: Local Security Scan (Hugging Face)
        hf_result = security_scanner(payload.code[:512])
        security_label = hf_result[0]['label'] # Returns 'Label_0' (safe) or 'Label_1' (vulnerable) depending on model mapping

        # Standardizing label names for the prompt
        status = "potentially insecure" if "1" in security_label or "insecure" in security_label.lower() else "secure"

        # Step B: Prepare the Prompt
        prompt = f"""
        You are an expert software engineer. 
        The following code has been flagged as {status} by a security scanner.
        
        Please provide:
        1. A brief explanation of any bugs, security flaws, or inefficiencies.
        2. A completely optimized and secure version of the code.
        
        CODE:
        {payload.code}
        """

        # Step C: Choose the Brain based on payload.model
        if payload.model == "groq":
            # Groq Llama 3 Inference
            chat_completion = groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
            )
            ai_text = chat_completion.choices[0].message.content
        else:
            # Gemini 2.0 Flash Inference
            response = gemini_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt
            )
            ai_text = response.text

        # Step D: Return combined results to Frontend
        return {
            "security_score": status,
            "analysis": ai_text
        }

    except Exception as e:
        print(f"Error during analysis: {e}")
        return {
            "security_score": "error", 
            "analysis": f"The engine encountered an error: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)