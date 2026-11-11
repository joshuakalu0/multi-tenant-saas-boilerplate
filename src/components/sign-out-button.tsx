import { signOutAction } from "@/app/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button className="ghost-button" type="submit">
        Sign out
      </button>
    </form>
  );
}
