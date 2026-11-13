// Starts everything for development: the Hono server (with reload) and Mastra Studio.
import { spawn } from 'node:child_process'

const procs = ['server', 'studio'].map((name) => {
  const child = spawn('pnpm', ['run', '--silent', `dev:${name}`], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  child.on('exit', (code) => {
    if (name === 'server') {
      stop()
      process.exit(code ?? 0)
    } else if (code) {
      console.warn(`[dev] ${name} exited with code ${code}; the server keeps running`)
    }
  })
  return child
})

function stop() {
  for (const p of procs) if (!p.killed) p.kill('SIGTERM')
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
