import { LogOut } from "lucide-react";

import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
        <LogOut />
      </Button>
    </form>
  );
}
