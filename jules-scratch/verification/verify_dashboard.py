from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the dashboard
        page.goto("http://localhost:3000/dashboard")

        # Wait for the main content to load by checking for the "Generate" tab
        generate_tab = page.get_by_role("button", name="dashboard.tabs.generate")
        expect(generate_tab).to_be_visible(timeout=30000)
        print("Dashboard loaded successfully.")

        # Verify that no models have a "PRO" badge
        pro_badge = page.get_by_text("PRO")
        expect(pro_badge).to_have_count(0)
        print("All models are enabled.")

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot taken.")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)