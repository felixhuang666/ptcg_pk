import os
import json
from google import genai
from google.genai import types



def generate_game_object_template(prompt: str) -> dict:
    if not os.getenv("GEMINI_API_KEY"):
         print("Warning: GEMINI_API_KEY is not set.")
         return {"error": "GEMINI_API_KEY is not set. Please configure the environment variable to use the AI generation."}

    try:
        client = genai.Client()
        sys_prompt = """
        You are an AI assistant helping a game developer create RPG game object templates.
        The user will describe what they want to create, and you should output a valid JSON representing the game object template.
        Do not include any explanation or markdown formatting in your response. Only return the raw JSON object.

        Here is an example of the desired format:
        {
          "id": "merchant",
          "name": "商人",
          "category": "npc",
          "container_width": 64,
          "container_height": 64,
          "sprite_sheets": [
            { "state": "idle", "sprite_sheet_name": "merchant_idle", "frame_width": 64, "frame_height": 64, "frame_rate": 8 },
            { "state": "walk", "sprite_sheet_name": "merchant_walk", "frame_width": 64, "frame_height": 64, "frame_rate": 12 },
            { "state": "talk", "sprite_sheet_name": "merchant_talk", "frame_width": 64, "frame_height": 64, "frame_rate": 6 }
          ],
          "collision": { "enabled": true, "width": 32, "height": 48, "shape": "rectangle" },
          "interaction": { "type": "dialog", "dialog_id": "merchant_dialog_01" },
          "default_controller": "StaticNpcController"
        }

        Make sure to adapt the fields based on the user's prompt. Be creative but adhere to this schema.
        If default_controller is not specified, use a reasonable default based on interaction type (talk->StaticNpcController, pickup->ItemController, open->ChestController, attack->EncounterMonsterController, teleport->TeleportController).
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=sys_prompt,
                response_mime_type="application/json",
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API error: {e}")
        return {"error": f"Failed to generate template due to Gemini API error: {e}"}
