type MinimalUser = {
  firstName: string | null;
  username: string | null;
  emailAddresses: Array<{
    emailAddress: string;
  }>;
};

export function getPreferredAccountName(user: MinimalUser | null): string {
  if (!user) {
    return "";
  }

  const firstName = user.firstName?.trim();
  if (firstName) {
    return firstName;
  }

  const username = user.username?.trim();
  if (username) {
    return username;
  }

  const email = user.emailAddresses[0]?.emailAddress ?? "";
  return email.split("@")[0] ?? "";
}
