export const applicationBasePath = process.env.NEXT_PUBLIC_MC_BASE_PATH || ''

export function applicationPath(path: string): string {
  if (!path.startsWith('/')) throw new Error('Application path must be absolute')
  if (path === '/' && applicationBasePath) return applicationBasePath
  return `${applicationBasePath}${path}`
}
