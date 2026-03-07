import { useState } from "react"
import type { AppEntry } from "./cli/registry.ts"
import { LauncherScreen } from "./screens/LauncherScreen.tsx"

interface AppProps {
  readonly app: AppEntry | null
  readonly subArgs: ReadonlyArray<string>
}

export function App({ app: initialApp, subArgs }: AppProps) {
  const [app, setApp] = useState<AppEntry | null>(initialApp)

  if (app) {
    const Component = app.component
    return <Component args={subArgs} />
  }

  return <LauncherScreen onSelect={(selected) => setApp(selected)} />
}
