from playwright.sync_api import sync_playwright
import time

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        def handle_me(route):
            route.fulfill(json={
                "authenticated": True,
                "user": {"name": "Test User", "id": "123"},
                "profile": {"nickname": "Tester"}
            })

        page.route("**/api/auth/me", handle_me)
        page.route("**/api/map", lambda r: r.continue_())

        page.goto("http://localhost:5000")
        time.sleep(2)

        # Click RPG Mode button on main menu
        rpg_btn = page.locator("button:has-text('RPG 模式')")
        if rpg_btn.is_visible():
            rpg_btn.click()
            time.sleep(2)

        # Handle full screen modal (Click Later - "稍後再說")
        later_btn = page.locator("button:has-text('稍後再說')")
        if later_btn.is_visible():
            later_btn.click()
            time.sleep(1)

        # Bypass join game screen
        join_btn = page.locator("button:has-text('Join Game')")
        if join_btn.is_visible():
            join_btn.click()
            time.sleep(2)

        # Settings
        page.evaluate("""() => {
            const svgs = document.querySelectorAll('svg');
            for (let svg of svgs) {
                if (svg.classList.contains('lucide-settings')) {
                    svg.parentElement.click();
                    return;
                }
            }
        }""")
        time.sleep(1)

        # Click editor mode
        edit_mode_btn = page.locator("button:has-text('地圖編輯')")
        if edit_mode_btn.is_visible():
            edit_mode_btn.click()

        time.sleep(2)

        # Close settings
        close_btn = page.locator("button:has-text('關閉')")
        if close_btn.is_visible():
            close_btn.click()
        time.sleep(1)

        page.screenshot(path="verification_editor.png")

        # Click Generate New Map
        generate_btn = page.locator("button:has-text('Generate')")
        if generate_btn.is_visible():
            generate_btn.click()
            time.sleep(5)
            page.screenshot(path="verification_generated.png")

        browser.close()

if __name__ == "__main__":
    verify()
