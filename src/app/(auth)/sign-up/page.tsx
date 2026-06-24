import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signUp } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Set up access to your agency workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm mode="sign-up" action={signUp} />
      </CardContent>
    </Card>
  );
}
