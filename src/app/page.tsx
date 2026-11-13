import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Placeholder landing page. Replace with the product once the challenge is chosen. */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Badge variant="secondary">Junction 2026 · European Tech Renaissance</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Scaffold is live.</h1>
        <p className="max-w-prose text-muted-foreground">
          Next.js 16, Tailwind 4, shadcn/ui and the Vercel AI SDK, deployed on Vercel. Product
          code starts when the challenge is known.
        </p>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chat smoke test</CardTitle>
            <CardDescription>Proves streaming LLM wiring end-to-end.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/chat" />}>
              Open /chat
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Health</CardTitle>
            <CardDescription>Provider, commit and time of this deployment.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" render={<Link href="/api/health" />}>
              GET /api/health
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
