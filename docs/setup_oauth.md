# Setup OAuth with Supabase & Google

This guide explains how to configure Google OAuth for the Monster Battle game using Supabase.

## 1. Create a Supabase Project

1. Go to the [Supabase Dashboard](https://app.supabase.com/) and create a new project.
2. Once created, go to **Project Settings** -> **API** to find your `Project URL` and `anon public key`.
3. Add these to your `.env` file:
   ```env
   VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
   VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
   ```

## 2. Configure Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services** -> **OAuth consent screen** and configure it.
4. Navigate to **APIs & Services** -> **Credentials**.
5. Click **Create Credentials** -> **OAuth client ID**.
6. Set the Application type to **Web application**.
7. Add your Supabase project's callback URL in the **Authorized redirect URIs** section.
   - You can find the exact redirect URI in your Supabase Dashboard under **Authentication** -> **Providers** -> **Google**. It typically looks like: `https://<project-id>.supabase.co/auth/v1/callback`
8. Note down the **Client ID** and **Client Secret**.

## 3. Enable Google Provider in Supabase

1. In your Supabase Dashboard, go to **Authentication** -> **Providers**.
2. Click on **Google** to open its settings.
3. Enable the Google provider.
4. Enter the **Client ID** and **Client Secret** obtained from the Google Cloud Console.
5. Save the settings.

## 4. Run the application

Once you've configured Supabase and your environment variables, start the game:

`npm run dev`

You should now see the Supabase Auth UI on load, allowing users to sign in via their Google accounts before entering the game.
