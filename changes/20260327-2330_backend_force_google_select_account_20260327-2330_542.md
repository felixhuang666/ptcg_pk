# Task Summary: Force Google Account Selection on Login

## Metadata
- **TID**: 542
- **Change Prefix**: 20260327-2330
- **Major Category**: backend
- **Summary**: force_google_select_account
- **Date/Time**: 20260327-2330
- **Original Branch Commit ID**: 594913595c0bb6306473af186afd752cdf4fa480

## Prompt
Objective:當使用者登出後, 應該要清除cookie or session, 讓使用者能使用新的帳號登入
- 目前的版本, 當使用者選擇登出後, 再次點登入會直接進去遊戲畫面, 而不是重新觸發google oauth登入
- 若使用者未選擇登出, 應該還是要保持原來行為, 直接用cookie的資料登入

## Root Cause
When the user clicked "登出" (logout), the backend cleared the `session_id` cookie, properly unauthenticating the user. However, when the user subsequently clicked the "Google 登入" button to sign back in, they were redirected to the Google OAuth authorization endpoint without any `prompt` parameter. Because the user still had an active session with Google in their browser from their previous login, Google automatically reused that session and issued a new authorization code without prompting the user to select an account or confirm their identity. This bypassed the account selection screen, preventing the user from logging in with a different account.

## Solution
Modified the `/auth/login` route in `backend/main.py` to append the `prompt=select_account` parameter to the Google OAuth authorization URL. This forces Google to display the account selection screen whenever the user initiates a new login flow, even if they already have an active Google session in their browser.

This change does not affect users who have not logged out, as they will continue to authenticate via the `/api/auth/me` endpoint using their active `session_id` cookie, which bypasses the `/auth/login` route entirely and preserves the existing auto-login behavior.