import Link from "next/link";
import { login } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Footer } from "@/components/Footer";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 dark:bg-neutral-950 px-4 py-10">
      <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Tempo</div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Log in to keep your streak going.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="mt-2 w-full">
              Log in
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No account yet?{" "}
            <Link href="/signup" className="font-medium text-neutral-900 dark:text-neutral-50 underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
      <div className="w-full max-w-sm">
        <Footer />
      </div>
    </div>
  );
}
