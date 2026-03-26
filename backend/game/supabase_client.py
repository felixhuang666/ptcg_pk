import os
import asyncio
from supabase import create_async_client, Client
from supabase.client import AsyncClient
from typing import Optional

async def get_supabase_client() -> Optional[AsyncClient]:
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")

    if not supabase_url or not supabase_key:
        print("Warning: SUPABASE_URL or SUPABASE_PUBLISHABLE_DEFAULT_KEY not set in environment.")
        return None

    try:
        return await create_async_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"Failed to initialize Supabase async client: {e}")
        return None
