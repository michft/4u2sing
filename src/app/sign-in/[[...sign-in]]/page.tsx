import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <SignIn />
    </main>
  );
}
