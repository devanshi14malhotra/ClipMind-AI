import os
import groq
from dotenv import load_dotenv

load_dotenv()

# Load keys
keys_str = os.getenv("GROQ_API_KEYS", "")
GROQ_KEYS = [k.strip() for k in keys_str.split(",") if k.strip()]

if not GROQ_KEYS:
    raise ValueError("No GROQ_API_KEYS found in .env file.")

current_key_index = 0

def get_groq_client():
    global current_key_index
    return groq.Groq(api_key=GROQ_KEYS[current_key_index])

def rotate_key():
    global current_key_index
    current_key_index = (current_key_index + 1) % len(GROQ_KEYS)
    print(f"[API Key Rotator] Switched to Key #{current_key_index + 1}")

def execute_with_retry(func, *args, **kwargs):
    """
    Executes a function and rotates the API key if a rate limit or auth error occurs.
    Will retry up to the number of keys available.
    """
    max_retries = len(GROQ_KEYS)
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except groq.RateLimitError as e:
            print(f"[API Error] Rate limit hit: {e}")
            rotate_key()
        except groq.AuthenticationError as e:
            print(f"[API Error] Authentication failed: {e}")
            rotate_key()
        except Exception as e:
            # For other errors, don't retry, just raise
            raise e
    
    raise Exception("All Groq API keys have been exhausted or rate limited.")


def _groq_transcribe(audio_path: str):
    client = get_groq_client()
    with open(audio_path, "rb") as file:
        transcription = client.audio.transcriptions.create(
            file=(audio_path, file.read()),
            model="whisper-large-v3",
            response_format="verbose_json",
        )
    return transcription

def groq_transcribe(audio_path: str):
    return execute_with_retry(_groq_transcribe, audio_path)


def _groq_summarize(text: str):
    client = get_groq_client()
    # Limit text slightly to ensure we don't blow past LLaMA's 128k token context window
    max_chars = 250000 
    truncated_text = text[:max_chars] if len(text) > max_chars else text
    
    prompt = f"""
    Please analyze the following video transcript and produce a structured intelligence report.
    The transcript includes timestamps in [MM:SS] format before each spoken segment.

    Your response MUST be a valid JSON object matching this EXACT structure with NO other text:
    {{
        "short_summary": "A concise 2-3 sentence TL;DR capturing the core topic and main conclusion of the video.",
        "summary": "A highly detailed, comprehensive, multi-paragraph summary. Cover all major themes, arguments, examples, and conclusions discussed. Do NOT restrict the length — be thorough.",
        "key_moments": [
            {{"time": "00:00", "title": "Topic Title", "description": "Brief description of what is discussed at this moment."}}
        ],
        "keywords": ["Keyword1", "Keyword2", "Keyword3"]
    }}

    Rules:
    - short_summary: 2-3 sentences maximum. The "tweet-length" version.
    - summary: Full, detailed, multi-paragraph. Minimum 3 paragraphs.
    - key_moments: Extract 3-7 key moments. For each, use the EXACT [MM:SS] timestamp from the transcript where that topic begins. Do NOT invent timestamps.
    - keywords: 5-10 highly relevant single-word or short-phrase keywords representing core topics.

    Transcript with Timestamps:
    {truncated_text}
    """
    
    completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a professional AI summarization engine. You only output raw, valid JSON with no markdown, no code fences, and no extra text."},
            {"role": "user", "content": prompt}
        ],
        model="openai/gpt-oss-20b",
        temperature=0.3,
        response_format={"type": "json_object"},
    )
    
    import json
    content = completion.choices[0].message.content
    return json.loads(content)

def groq_summarize(text: str):
    return execute_with_retry(_groq_summarize, text)


def _groq_generate_materials(text: str, material_type: str):
    client = get_groq_client()
    max_chars = 250000 
    truncated_text = text[:max_chars] if len(text) > max_chars else text
    
    if material_type == "quiz":
        prompt = f"""
        Based on the following transcript, generate a comprehensive quiz.
        Include a title and a list of 5-10 multiple choice questions.
        Format your response in JSON matching this exact structure:
        {{
            "title": "Quiz Title",
            "questions": [
                {{"q": "Question text?", "options": ["Option 1", "Option 2", "Option 3", "Option 4"], "answer": "Option 1"}}
            ]
        }}
        
        Transcript:
        {truncated_text}
        """
    else:
        prompt = f"""
        Based on the following transcript, generate a comprehensive study guide.
        Include a title and a list of sections with a heading and detailed content.
        Format your response in JSON matching this exact structure:
        {{
            "title": "Study Guide Title",
            "sections": [
                {{"heading": "Section Heading", "content": "Detailed section content..."}}
            ]
        }}
        
        Transcript:
        {truncated_text}
        """
        
    completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a professional educational AI. You only output raw, valid JSON."},
            {"role": "user", "content": prompt}
        ],
        model="openai/gpt-oss-20b",
        temperature=0.3,
        response_format={"type": "json_object"},
    )
    
    import json
    content = completion.choices[0].message.content
    return json.loads(content)

def groq_generate_materials(text: str, material_type: str):
    return execute_with_retry(_groq_generate_materials, text, material_type)

