import Link from "next/link";
import { signup } from "../actions";
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
import { TimezoneField } from "@/components/TimezoneField";

export default async function SignupPage({
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
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start planning your focused days.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signup} className="flex flex-col gap-4">
            <TimezoneField />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" type="text" required autoComplete="name" />
            </div>
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
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="mt-2 w-full">
              Sign up
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-neutral-900 dark:text-neutral-50 underline">
              Log in
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
