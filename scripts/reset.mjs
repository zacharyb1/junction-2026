// Wipes local state for a clean demo: LibSQL database, Exa cache, remembered chat.
// Keeps data/.gitkeep. Stop `pnpm dev` first, or the server keeps its open database handle.
import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const removed = []
for (const name of readdirSync('data')) {
  if (name === '.gitkeep') continue
  rmSync(join('data', name), { recursive: true, force: true })
  removed.push(name)
}
console.log(removed.length ? `Removed from data/: ${removed.join(', ')}` : 'data/ was already clean')
