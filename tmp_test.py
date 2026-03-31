from httpx import Client

c = Client(base_url="http://127.0.0.1:5000")
try:
    r1 = c.get("/auth/dev_login", follow_redirects=False)
    print("dev_login code:", r1.status_code)
    print("dev_login headers:", r1.headers)
    r2 = c.get("/api/auth/me", cookies=r1.cookies)
    print("auth me:", r2.json())
except Exception as e:
    print(e)
