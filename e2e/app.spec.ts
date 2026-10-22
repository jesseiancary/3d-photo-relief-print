import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'

test.describe('Photo Relief app', () => {
  test('loads with the sample image and paints a preview', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Photo Relief' })).toBeVisible()

    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
    // the sample preview finishes: the placeholder disappears and the badge appears
    await expect(page.getByText('Preparing preview…')).toBeHidden()
    await expect(page.getByText(/Sample Scene/)).toBeVisible()
    // the canvas was actually painted (worker → putImageData sized it)
    const size = await canvas.evaluate((c: HTMLCanvasElement) => ({ w: c.width, h: c.height }))
    expect(size.w).toBeGreaterThan(0)
    expect(size.h).toBeGreaterThan(0)
  })

  test('switches between preview views', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/Sample Scene/)).toBeVisible()

    await page.getByRole('radio', { name: 'Original' }).click()
    await expect(page.getByRole('img', { name: 'Original' })).toBeVisible()

    await page.getByRole('radio', { name: 'Print' }).click()
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('renders <html data-theme> from the theme cookie with no hydration mismatch', async ({
    page,
    context,
  }) => {
    // Collect console errors to catch React's hydration-mismatch warning (logged as console.error).
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

    await context.addCookies([
      { name: 'photo-relief.theme.v1', value: 'dark', url: 'http://localhost:3000' },
    ])
    const response = await page.goto('/')

    // The server read the cookie and rendered the attribute into the initial HTML (asserted on the
    // response body so the client applyTheme effect can't mask it). The client then hydrates against
    // the same markup, so there is no hydration mismatch.
    expect(await response!.text()).toMatch(/<html[^>]*data-theme="dark"/)
    await expect(page.getByRole('heading', { name: 'Photo Relief' })).toBeVisible()
    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([])
  })

  test('exports a Bambu-project 3MF that passes the loader rules', async ({ page }) => {
    await page.goto('/')
    // wait for the preview so Export is enabled
    await expect(page.getByText(/Sample Scene/)).toBeVisible()
    const exportBtn = page.getByRole('button', { name: 'Export 3MF' })
    await expect(exportBtn).toBeEnabled()

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      exportBtn.click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.3mf$/)

    const path = await download.path()
    const files = unzipSync(new Uint8Array(readFileSync(path)))
    const names = Object.keys(files)
    // the three Bambu loader rules this project must satisfy
    expect(names).toContain('Metadata/project_settings.config')
    const model = strFromU8(files['3D/3dmodel.model'])
    expect(model).toMatch(/name="Application">(BambuStudio|OrcaSlicer)-/)
    expect(strFromU8(files['[Content_Types].xml'])).not.toContain('project_settings.config')
  })
})
