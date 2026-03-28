import asyncio
from supabase import create_async_client
import os

async def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
    print(f"URL: {supabase_url}, KEY: {supabase_key[:5] if supabase_key else 'None'}")

asyncio.run(main())
